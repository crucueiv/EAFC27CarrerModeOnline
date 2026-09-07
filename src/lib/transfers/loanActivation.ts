import { prisma } from "@/lib/prisma";
import type { LoanDuration } from "@/lib/transfers/loanNegotiationEngine";
import {
  activateLoan as engineActivateLoan,
  returnLoanedPlayer as engineReturnLoanedPlayer,
  executeLoanBuyOption as engineExecuteLoanBuyOption,
  computeLoanEndDate,
  calculateLoanWageCost,
  type LoanType,
} from "@/lib/transfers/loanEngine";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type LoanScheduleInput = {
  duration: LoanDuration;
  seasonStartDate: Date;
  seasonEndDate: Date;
  isTransferWindowOpen: boolean;
  weeklyWage?: number;
  wageShareBuyerPct?: number;
  now?: Date;
};

export type LoanSchedule = {
  startsAt: Date;
  endsAt: Date;
  weeks: number;
  totalWeeklyWageCost: number;
};

export function computeLoanSchedule(input: LoanScheduleInput): LoanSchedule {
  const now = input.now ?? new Date();
  const startsAt = input.isTransferWindowOpen
    ? now
    : seasonStartDateNextCycle(now);
  const endsAt = computeLoanEndDate({
    startsAt,
    duration: input.duration as LoanType,
    seasonEndDate: input.seasonEndDate,
  });
  const weeks = Math.max(1, Math.ceil((endsAt.getTime() - startsAt.getTime()) / ONE_WEEK_MS));
  return {
    startsAt,
    endsAt,
    weeks,
    totalWeeklyWageCost: calculateLoanWageCost(
      input.weeklyWage ?? 0,
      input.wageShareBuyerPct ?? 0,
      weeks,
    ),
  };
}

function seasonStartDateNextCycle(now: Date): Date {
  const next = new Date(now);
  next.setUTCMonth(next.getUTCMonth() + 1);
  next.setUTCDate(1);
  return next;
}

export function computeLoanWageCost(
  weeklyWage: number,
  wageShareBuyerPct: number,
  weeks: number,
): number {
  return Math.round(weeklyWage * (wageShareBuyerPct / 100) * weeks);
}

export async function activateLoan(
  loanId: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!prisma) return { ok: false, reason: "Prisma no disponible" };
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan) return { ok: false, reason: "Cesión no encontrada" };
  const result = await engineActivateLoan({
    loanId,
    simulatedNow: new Date(),
    prismaClient: prisma,
  });
  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}

export async function expireLoan(
  loanId: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!prisma) return { ok: false, reason: "Prisma no disponible" };
  const result = await engineReturnLoanedPlayer({
    loanId,
    simulatedNow: new Date(),
    prismaClient: prisma,
  });
  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}

export async function triggerBuyOption(
  loanId: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!prisma) return { ok: false, reason: "Prisma no disponible" };
  const result = await engineExecuteLoanBuyOption({
    loanId,
    simulatedNow: new Date(),
    prismaClient: prisma,
  });
  return result.ok ? { ok: true } : { ok: false, reason: result.reason };
}
