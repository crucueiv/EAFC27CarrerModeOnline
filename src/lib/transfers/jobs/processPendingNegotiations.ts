import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { withSerializableTransaction } from "@/lib/calendar/calendarDb";
import { getSimulatedCurrentDate } from "@/lib/calendar/simulatedClock";
import { processExpiredLoans, executeLoanBuyOption } from "@/lib/transfers/loanEngine";

export type ProcessPendingNegotiationsInput = {
  userId?: string;
  simulatedNow?: Date;
  prismaClient?: PrismaClient;
};

export type ProcessPendingNegotiationsResult = {
  ok: boolean;
  processed: number;
  errors: Array<{ negotiationId: string; reason: string }>;
  expiredLoans: number;
  buyOptionsTriggered: number;
};

export async function processPendingNegotiations(
  input: ProcessPendingNegotiationsInput = {},
): Promise<ProcessPendingNegotiationsResult> {
  const prisma = input.prismaClient ?? defaultPrisma;
  if (!prisma) {
    return { ok: false, processed: 0, errors: [{ negotiationId: "*", reason: "PRISMA_UNAVAILABLE" }], expiredLoans: 0, buyOptionsTriggered: 0 };
  }

  let simulatedNow = input.simulatedNow;
  if (!simulatedNow && input.userId) {
    const state = await getSimulatedCurrentDate({ userId: input.userId, prismaClient: prisma });
    if (state.ok) simulatedNow = state.currentDate;
  }
  if (!simulatedNow) {
    simulatedNow = new Date();
  }

  const due = await prisma.negotiation.findMany({
    where: {
      status: "AGREED_PENDING_WINDOW",
      effectiveDate: { lte: simulatedNow },
    },
    select: { id: true, seasonId: true, type: true, agreedPrice: true, playerId: true, buyerTeamId: true, sellerTeamId: true },
  });

  let processed = 0;
  const errors: ProcessPendingNegotiationsResult["errors"] = [];

  for (const neg of due) {
    try {
      await withSerializableTransaction(prisma, async (tx) => {
        const fresh = await tx.negotiation.findUnique({
          where: { id: neg.id },
          select: { id: true, status: true, type: true, agreedPrice: true, playerId: true, buyerTeamId: true, sellerTeamId: true, seasonId: true },
        });
        if (!fresh || fresh.status !== "AGREED_PENDING_WINDOW") return;

        const buyer = await tx.team.findUnique({ where: { id: fresh.buyerTeamId }, select: { budget: true } });
        const seller = await tx.team.findUnique({ where: { id: fresh.sellerTeamId }, select: { budget: true } });
        if (!buyer || !seller) throw new Error("Teams not found");

        if (fresh.type === "PERMANENT") {
          await tx.transfer.create({
            data: {
              seasonId: fresh.seasonId,
              playerId: fresh.playerId,
              sellerTeamId: fresh.sellerTeamId,
              buyerTeamId: fresh.buyerTeamId,
              fee: Math.round(fresh.agreedPrice),
              status: "WAITING_PLAYER_CONTRACT",
              completedAt: null,
              negotiationId: fresh.id,
            },
          });
        } else {
          const startsAt = simulatedNow;
          const endsAt = new Date(startsAt);
          if (fresh.type === "LOAN_SHORT_TERM") {
            endsAt.setUTCMonth(endsAt.getUTCMonth() + 6);
          } else {
            endsAt.setUTCFullYear(endsAt.getUTCFullYear() + (fresh.type === "LOAN_2_YEARS" ? 2 : 1));
          }
          await tx.loan.create({
            data: {
              seasonId: fresh.seasonId,
              playerId: fresh.playerId,
              sellerTeamId: fresh.sellerTeamId,
              buyerTeamId: fresh.buyerTeamId,
              duration:
                fresh.type === "LOAN_SHORT_TERM"
                  ? "SHORT_TERM"
                  : fresh.type === "LOAN_1_YEAR"
                    ? "ONE_YEAR"
                    : "TWO_YEARS",
              wageShareBuyerPct: 50,
              hasBuyOption: false,
              fee: Math.round(fresh.agreedPrice),
              status: "WAITING_PLAYER_CONTRACT",
              startsAt,
              endsAt,
              completedAt: null,
              negotiationId: fresh.id,
            },
          });
        }

        await tx.negotiation.update({
          where: { id: fresh.id },
          data: { status: "AGREED_CLUB", decidedAt: simulatedNow, effectiveDate: simulatedNow },
        });
      });
      processed += 1;
    } catch (e) {
      errors.push({
        negotiationId: neg.id,
        reason: e instanceof Error ? e.message : "UNKNOWN_ERROR",
      });
    }
  }

  const loans = await processExpiredLoans({ simulatedNow, prismaClient: prisma });
  const buyOptionResults = await prisma.loan.findMany({
    where: { status: "COMPLETED", hasBuyOption: true, buyOptionPrice: { not: null }, endsAt: { lte: simulatedNow } },
    select: { id: true },
  });
  let buyOptionsTriggered = 0;
  for (const l of buyOptionResults) {
    const r = await executeLoanBuyOption({ loanId: l.id, simulatedNow, prismaClient: prisma });
    if (r.ok) buyOptionsTriggered += 1;
  }

  return {
    ok: true,
    processed,
    errors,
    expiredLoans: loans.expired,
    buyOptionsTriggered,
  };
}
