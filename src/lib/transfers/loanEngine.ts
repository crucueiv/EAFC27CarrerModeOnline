import type { PrismaClient, Prisma, Loan } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { withSerializableTransaction } from "@/lib/calendar/calendarDb";
import { getSimulatedCurrentDate } from "@/lib/calendar/simulatedClock";

export type LoanType = "SHORT_TERM" | "ONE_YEAR" | "TWO_YEARS";

export type ProcessExpiredLoansResult = {
  ok: boolean;
  expired: number;
  buyOptionsTriggered: number;
  errors: Array<{ loanId: string; reason: string }>;
};

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function computeLoanEndDate(input: {
  startsAt: Date;
  duration: LoanType;
  seasonEndDate: Date | null;
}): Date {
  if (input.duration === "SHORT_TERM") {
    if (input.seasonEndDate && input.seasonEndDate.getTime() > input.startsAt.getTime()) {
      return input.seasonEndDate;
    }
    const fallback = new Date(input.startsAt.getTime());
    fallback.setUTCMonth(fallback.getUTCMonth() + 6);
    return fallback;
  }
  const years = input.duration === "TWO_YEARS" ? 2 : 1;
  return new Date(input.startsAt.getTime() + ONE_YEAR_MS * years);
}

export type ProcessExpiredLoansInput = {
  simulatedNow: Date;
  prismaClient?: PrismaClient;
};

export async function processExpiredLoans(
  input: ProcessExpiredLoansInput,
): Promise<ProcessExpiredLoansResult> {
  const prisma = input.prismaClient ?? defaultPrisma;
  if (!prisma) {
    return { ok: false, expired: 0, buyOptionsTriggered: 0, errors: [{ loanId: "*", reason: "PRISMA_UNAVAILABLE" }] };
  }

  const due = await prisma.loan.findMany({
    where: {
      status: { in: ["ACCEPTED", "COMPLETED"] },
      endsAt: { lte: input.simulatedNow },
    },
    select: { id: true },
  });

  let expired = 0;
  let buyOptionsTriggered = 0;
  const errors: ProcessExpiredLoansResult["errors"] = [];

  for (const row of due) {
    const r = await returnLoanedPlayer({ loanId: row.id, simulatedNow: input.simulatedNow, prismaClient: prisma });
    if (r.ok) {
      expired += 1;
    } else {
      errors.push({ loanId: row.id, reason: r.reason });
    }
  }

  const buyOptionsDue = await prisma.loan.findMany({
    where: {
      status: "COMPLETED",
      hasBuyOption: true,
      buyOptionPrice: { not: null },
      endsAt: { lte: input.simulatedNow },
    },
    select: { id: true },
  });
  for (const row of buyOptionsDue) {
    const r = await executeLoanBuyOption({ loanId: row.id, simulatedNow: input.simulatedNow, prismaClient: prisma });
    if (r.ok) buyOptionsTriggered += 1;
    else errors.push({ loanId: row.id, reason: r.reason });
  }

  return { ok: true, expired, buyOptionsTriggered, errors };
}

export type LoanOpResult =
  | { ok: true; status: "RETURNED" | "BUY_OPTION_TRIGGERED" | "ACTIVE" }
  | { ok: false; reason: string };

export type ReturnLoanedPlayerInput = {
  loanId: string;
  simulatedNow: Date;
  prismaClient?: PrismaClient;
};

export async function returnLoanedPlayer(
  input: ReturnLoanedPlayerInput,
): Promise<LoanOpResult> {
  const prisma = input.prismaClient ?? defaultPrisma;
  if (!prisma) return { ok: false, reason: "PRISMA_UNAVAILABLE" };

  try {
    return await withSerializableTransaction(prisma, async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id: input.loanId },
        select: {
          id: true,
          status: true,
          hasBuyOption: true,
          buyOptionPrice: true,
          playerId: true,
          buyerTeamId: true,
          sellerTeamId: true,
          seasonId: true,
          endsAt: true,
        },
      });
      if (!loan) return { ok: false as const, reason: "LOAN_NOT_FOUND" };
      if (loan.status === "RETURNED") return { ok: true as const, status: "RETURNED" as const };
      if (loan.status !== "ACCEPTED" && loan.status !== "COMPLETED") {
        return { ok: false as const, reason: `INVALID_STATUS:${loan.status}` };
      }
      if (loan.hasBuyOption && loan.buyOptionPrice !== null && input.simulatedNow.getTime() < loan.endsAt.getTime()) {
        return { ok: false as const, reason: "BUY_OPTION_PENDING" };
      }

      const roster = await tx.roster.findFirst({
        where: { playerId: loan.playerId, teamId: loan.buyerTeamId, isActive: true, seasonId: loan.seasonId },
        select: { id: true },
      });
      if (roster) {
        await tx.roster.update({
          where: { id: roster.id },
          data: { teamId: loan.sellerTeamId, isActive: true },
        });
      }

      await tx.loan.update({
        where: { id: loan.id },
        data: { status: "RETURNED", completedAt: input.simulatedNow },
      });

      return { ok: true as const, status: "RETURNED" as const };
    });
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "UNKNOWN_ERROR" };
  }
}

export type ExecuteLoanBuyOptionInput = {
  loanId: string;
  simulatedNow: Date;
  prismaClient?: PrismaClient;
};

export async function executeLoanBuyOption(
  input: ExecuteLoanBuyOptionInput,
): Promise<LoanOpResult> {
  const prisma = input.prismaClient ?? defaultPrisma;
  if (!prisma) return { ok: false, reason: "PRISMA_UNAVAILABLE" };

  try {
    return await withSerializableTransaction(prisma, async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id: input.loanId },
        select: {
          id: true,
          status: true,
          hasBuyOption: true,
          buyOptionPrice: true,
          playerId: true,
          buyerTeamId: true,
          sellerTeamId: true,
          seasonId: true,
        },
      });
      if (!loan) return { ok: false as const, reason: "LOAN_NOT_FOUND" };
      if (!loan.hasBuyOption || loan.buyOptionPrice === null) {
        return { ok: false as const, reason: "NO_BUY_OPTION" };
      }
      if (loan.status === "BUY_OPTION_TRIGGERED") {
        return { ok: true as const, status: "BUY_OPTION_TRIGGERED" as const };
      }
      if (loan.status !== "COMPLETED" && loan.status !== "ACCEPTED") {
        return { ok: false as const, reason: `INVALID_STATUS:${loan.status}` };
      }

      const buyer = await tx.team.findUnique({ where: { id: loan.buyerTeamId }, select: { budget: true } });
      if (!buyer) return { ok: false as const, reason: "BUYER_NOT_FOUND" };
      if (buyer.budget < loan.buyOptionPrice) {
        return { ok: false as const, reason: "INSUFFICIENT_FUNDS" };
      }

      await tx.team.update({
        where: { id: loan.buyerTeamId },
        data: { budget: { decrement: loan.buyOptionPrice } },
      });
      await tx.team.update({
        where: { id: loan.sellerTeamId },
        data: { budget: { increment: loan.buyOptionPrice } },
      });

      const created = await tx.transfer.create({
        data: {
          seasonId: loan.seasonId,
          playerId: loan.playerId,
          sellerTeamId: loan.sellerTeamId,
          buyerTeamId: loan.buyerTeamId,
          fee: loan.buyOptionPrice,
          status: "COMPLETED",
          completedAt: input.simulatedNow,
        },
      });

      const roster = await tx.roster.findFirst({
        where: { playerId: loan.playerId, isActive: true, seasonId: loan.seasonId },
        select: { id: true },
      });
      if (roster) {
        await tx.roster.update({
          where: { id: roster.id },
          data: { teamId: loan.buyerTeamId, isActive: true },
        });
      } else {
        await tx.roster.create({
          data: {
            teamId: loan.buyerTeamId,
            playerId: loan.playerId,
            seasonId: loan.seasonId,
            isActive: true,
            role: "ROTACION",
          },
        });
      }

      await tx.loan.update({
        where: { id: loan.id },
        data: { status: "BUY_OPTION_TRIGGERED", completedAt: input.simulatedNow },
      });

      return { ok: true as const, status: "BUY_OPTION_TRIGGERED" as const };
    });
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "UNKNOWN_ERROR" };
  }
}

export type ActivateLoanInput = {
  loanId: string;
  simulatedNow: Date;
  prismaClient?: PrismaClient;
};

export async function activateLoan(input: ActivateLoanInput): Promise<LoanOpResult> {
  const prisma = input.prismaClient ?? defaultPrisma;
  if (!prisma) return { ok: false, reason: "PRISMA_UNAVAILABLE" };

  try {
    return await withSerializableTransaction(prisma, async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id: input.loanId },
        select: {
          id: true,
          status: true,
          playerId: true,
          buyerTeamId: true,
          sellerTeamId: true,
          seasonId: true,
        },
      });
      if (!loan) return { ok: false as const, reason: "LOAN_NOT_FOUND" };
      if (loan.status === "COMPLETED") return { ok: true as const, status: "ACTIVE" as const };
      if (loan.status !== "ACCEPTED") {
        return { ok: false as const, reason: `INVALID_STATUS:${loan.status}` };
      }

      const roster = await tx.roster.findFirst({
        where: { playerId: loan.playerId, isActive: true, seasonId: loan.seasonId },
        select: { id: true },
      });
      if (roster) {
        await tx.roster.update({
          where: { id: roster.id },
          data: { teamId: loan.buyerTeamId, isActive: true },
        });
      } else {
        await tx.roster.create({
          data: {
            teamId: loan.buyerTeamId,
            playerId: loan.playerId,
            seasonId: loan.seasonId,
            isActive: true,
            role: "ROTACION",
          },
        });
      }

      await tx.loan.update({
        where: { id: loan.id },
        data: { status: "COMPLETED", completedAt: input.simulatedNow },
      });

      return { ok: true as const, status: "ACTIVE" as const };
    });
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "UNKNOWN_ERROR" };
  }
}

export async function processExpiredLoansForUser(input: {
  userId: string;
  prismaClient?: PrismaClient;
}): Promise<ProcessExpiredLoansResult> {
  const prisma = input.prismaClient ?? defaultPrisma;
  if (!prisma) return { ok: false, expired: 0, buyOptionsTriggered: 0, errors: [{ loanId: "*", reason: "PRISMA_UNAVAILABLE" }] };
  const state = await getSimulatedCurrentDate({ userId: input.userId, prismaClient: prisma });
  if (!state.ok) {
    return { ok: false, expired: 0, buyOptionsTriggered: 0, errors: [{ loanId: "*", reason: state.reason }] };
  }
  return processExpiredLoans({ simulatedNow: state.currentDate, prismaClient: prisma });
}
