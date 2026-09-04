import type {
  PrismaClient,
  Prisma,
  Transfer,
  Loan,
  Negotiation,
  Team,
} from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { withSerializableTransaction } from "@/lib/calendar/calendarDb";
import {
  resolveActiveWindow,
  nextTransferWindowAfter,
  isWithinTransferWindow,
  pureBuildSummerWindow,
  pureBuildWinterWindow,
  type TransferWindowSnapshot,
} from "@/lib/calendar/transferWindowResolver";
import {
  rankNegotiations,
  type NegotiationComparable,
  type TransferType,
} from "@/lib/transfers/resolveTransferConflicts";

export type ProcessNegotiationInput = {
  negotiationId: string;
  simulatedNow: Date;
  prismaClient?: PrismaClient;
};

export type ProcessNegotiationSuccess = {
  ok: true;
  status:
    | "AGREED_ACTIVE"
    | "AGREED_PENDING_WINDOW"
    | "COMPLETED"
    | "CANCELLED_LOSER"
    | "CANCELLED_NO_PLAYER";
  negotiationId: string;
  effectiveDate: Date;
  transferId: string | null;
  loanId: string | null;
  budgetAfter: { buyerId: string; sellerId: string; buyerBudget: number; sellerBudget: number };
};

export type ProcessNegotiationFailure = {
  ok: false;
  reason:
    | "PRISMA_UNAVAILABLE"
    | "NEGOTIATION_NOT_FOUND"
    | "ALREADY_DECIDED"
    | "PLAYER_NOT_FOUND"
    | "TEAM_NOT_FOUND"
    | "SAME_TEAM"
    | "INSUFFICIENT_FUNDS"
    | "WINDOW_NOT_AVAILABLE"
    | "PRISMA_ERROR";
  message: string;
};

export type ProcessNegotiationResult =
  | ProcessNegotiationSuccess
  | ProcessNegotiationFailure;

function asRecord(meta: unknown): Record<string, unknown> {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }
  return {};
}

function safeFloat(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function isNegotiationDecided(status: string): boolean {
  return (
    status === "AGREED_PENDING_WINDOW" ||
    status === "AGREED_ACTIVE" ||
    status === "COMPLETED" ||
    status === "CANCELLED" ||
    status === "REJECTED"
  );
}

function mapTypeToLoanDuration(
  type: TransferType,
): "SHORT_TERM" | "ONE_YEAR" | "TWO_YEARS" {
  switch (type) {
    case "LOAN_SHORT_TERM":
      return "SHORT_TERM";
    case "LOAN_1_YEAR":
      return "ONE_YEAR";
    case "LOAN_2_YEARS":
      return "TWO_YEAR" as never;
    default:
      throw new Error(`mapTypeToLoanDuration: invalid type ${type}`);
  }
}

function buildFutureWindow(simulatedNow: Date): TransferWindowSnapshot {
  const month = simulatedNow.getUTCMonth() + 1;
  const day = simulatedNow.getUTCDate();
  const year = simulatedNow.getUTCFullYear();

  const inSummer = month > SUMMER_OPEN_MONTH || (month === SUMMER_OPEN_MONTH && day >= SUMMER_OPEN_DAY);
  const afterSummer = month > SUMMER_CLOSE_MONTH || (month === SUMMER_CLOSE_MONTH && day >= SUMMER_CLOSE_DAY);
  const inWinter = month === WINTER_OPEN_MONTH;

  if (inWinter) {
    return {
      id: `synthetic-winter-${year}-next`,
      kind: "WINTER",
      opensAt: pureBuildWinterWindow(year + 1).opensAt,
      closesAt: pureBuildWinterWindow(year + 1).closesAt,
      seasonId: "",
    };
  }
  if (inSummer && !afterSummer) {
    return {
      id: `synthetic-winter-${year}`,
      kind: "WINTER",
      opensAt: pureBuildWinterWindow(year + 1).opensAt,
      closesAt: pureBuildWinterWindow(year + 1).closesAt,
      seasonId: "",
    };
  }
  return {
    id: `synthetic-summer-${year + 1}`,
    kind: "SUMMER",
    opensAt: pureBuildSummerWindow(year + 1).opensAt,
    closesAt: pureBuildSummerWindow(year + 1).closesAt,
    seasonId: "",
  };
}

const SUMMER_OPEN_MONTH = 7;
const SUMMER_OPEN_DAY = 1;
const SUMMER_CLOSE_MONTH = 9;
const SUMMER_CLOSE_DAY = 1;
const WINTER_OPEN_MONTH = 1;

function computeLoanEnds(
  startsAt: Date,
  type: TransferType,
  seasonEnd: Date | null,
): Date {
  if (type === "LOAN_SHORT_TERM") {
    if (seasonEnd && seasonEnd.getTime() > startsAt.getTime()) return seasonEnd;
    const fallback = new Date(startsAt.getTime());
    fallback.setUTCMonth(fallback.getUTCMonth() + 6);
    return fallback;
  }
  const years = type === "LOAN_2_YEARS" ? 2 : 1;
  return new Date(
    Date.UTC(
      startsAt.getUTCFullYear() + years,
      startsAt.getUTCMonth(),
      startsAt.getUTCDate(),
      startsAt.getUTCHours(),
      startsAt.getUTCMinutes(),
      startsAt.getUTCSeconds(),
    ),
  );
}

function ensureLoanDuration(
  type: TransferType,
): "SHORT_TERM" | "ONE_YEAR" | "TWO_YEARS" {
  if (type === "LOAN_SHORT_TERM") return "SHORT_TERM";
  if (type === "LOAN_1_YEAR") return "ONE_YEAR";
  if (type === "LOAN_2_YEARS") return "TWO_YEARS";
  throw new Error(`ensureLoanDuration: not a loan type: ${type}`);
}

function buyerCommittedBudget(
  tx: Prisma.TransactionClient,
  buyerTeamId: string,
): Promise<number> {
  return tx.transfer
    .aggregate({
      where: {
        buyerTeamId,
        status: { in: ["PROPOSED", "ACCEPTED"] },
        fee: { gt: 0 },
      },
      _sum: { fee: true },
    })
    .then((res) => Number(res._sum?.fee ?? 0));
}

export async function processNegotiation(
  input: ProcessNegotiationInput,
): Promise<ProcessNegotiationResult> {
  const prisma = input.prismaClient ?? defaultPrisma;
  if (!prisma) {
    return { ok: false, reason: "PRISMA_UNAVAILABLE", message: "Prisma client unavailable" };
  }

  const negotiation = await prisma.negotiation.findUnique({
    where: { id: input.negotiationId },
    include: {
      player: { select: { id: true, name: true, overall: true } },
      buyerTeam: { select: { id: true, name: true, budget: true, eaId: true } },
      sellerTeam: { select: { id: true, name: true, budget: true, eaId: true } },
      season: { select: { id: true, endDate: true, careerGroupId: true } },
    },
  });
  if (!negotiation) {
    return { ok: false, reason: "NEGOTIATION_NOT_FOUND", message: "Negotiation not found" };
  }
  if (isNegotiationDecided(negotiation.status)) {
    return { ok: false, reason: "ALREADY_DECIDED", message: `Status already ${negotiation.status}` };
  }
  if (negotiation.buyerTeamId === negotiation.sellerTeamId) {
    return { ok: false, reason: "SAME_TEAM", message: "Buyer and seller must differ" };
  }

  const player = negotiation.player;
  if (!player) {
    return { ok: false, reason: "PLAYER_NOT_FOUND", message: "Player not found" };
  }

  const buyerTeam = negotiation.buyerTeam as Pick<Team, "id" | "budget"> | null;
  const sellerTeam = negotiation.sellerTeam as Pick<Team, "id" | "budget"> | null;
  if (!buyerTeam || !sellerTeam) {
    return { ok: false, reason: "TEAM_NOT_FOUND", message: "Teams not found" };
  }

  try {
    return await withSerializableTransaction(prisma, async (tx) => {
      const competitors = await tx.negotiation.findMany({
        where: {
          playerId: negotiation.playerId,
          id: { not: negotiation.id },
          status: { in: ["PENDING_AGREEMENT", "AGREED_PENDING_WINDOW", "AGREED_ACTIVE"] },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          playerId: true,
          type: true,
          offeredWage: true,
          offeredContractYears: true,
          squadRole: true,
          agreedPrice: true,
          effectiveDate: true,
          createdAt: true,
        },
      });

      const allCandidates: NegotiationComparable[] = [
        {
          id: negotiation.id,
          playerId: negotiation.playerId,
          type: negotiation.type as TransferType,
          offeredWage: negotiation.offeredWage,
          offeredContractYears: negotiation.offeredContractYears,
          squadRole: (negotiation.squadRole as NegotiationComparable["squadRole"]) ?? null,
          agreedPrice: negotiation.agreedPrice,
          effectiveAt: negotiation.effectiveDate,
          createdAt: negotiation.createdAt,
        },
        ...competitors.map((c) => ({
          id: c.id,
          playerId: c.playerId,
          type: c.type as TransferType,
          offeredWage: c.offeredWage,
          offeredContractYears: c.offeredContractYears,
          squadRole: (c.squadRole as NegotiationComparable["squadRole"]) ?? null,
          agreedPrice: c.agreedPrice,
          effectiveAt: c.effectiveDate,
          createdAt: c.createdAt,
        })),
      ];

      const ranking = rankNegotiations({
        playerId: negotiation.playerId,
        candidates: allCandidates,
      });
      if (!ranking) {
        await tx.negotiation.update({
          where: { id: negotiation.id },
          data: { status: "CANCELLED", decidedAt: input.simulatedNow },
        });
        return {
          ok: true as const,
          status: "CANCELLED_NO_PLAYER" as const,
          negotiationId: negotiation.id,
          effectiveDate: input.simulatedNow,
          transferId: null,
          loanId: null,
          budgetAfter: {
            buyerId: buyerTeam.id,
            sellerId: sellerTeam.id,
            buyerBudget: buyerTeam.budget,
            sellerBudget: sellerTeam.budget,
          },
        };
      }

      const winnerId = ranking.winner.id;
      if (winnerId !== negotiation.id) {
        await tx.negotiation.update({
          where: { id: negotiation.id },
          data: { status: "CANCELLED", decidedAt: input.simulatedNow },
        });
        return {
          ok: true as const,
          status: "CANCELLED_LOSER" as const,
          negotiationId: negotiation.id,
          effectiveDate: input.simulatedNow,
          transferId: null,
          loanId: null,
          budgetAfter: {
            buyerId: buyerTeam.id,
            sellerId: sellerTeam.id,
            buyerBudget: buyerTeam.budget,
            sellerBudget: sellerTeam.budget,
          },
        };
      }

      const committed = await buyerCommittedBudget(tx, buyerTeam.id);
      const available = Math.max(0, buyerTeam.budget - committed);
      if (negotiation.agreedPrice > available) {
        await tx.negotiation.update({
          where: { id: negotiation.id },
          data: { status: "CANCELLED", decidedAt: input.simulatedNow },
        });
        return {
          ok: false as const,
          reason: "INSUFFICIENT_FUNDS" as const,
          message: `Buyer committed budget insufficient (${available} < ${negotiation.agreedPrice})`,
        };
      }

      const window = await resolveActiveWindow({
        seasonId: negotiation.seasonId,
        simulatedNow: input.simulatedNow,
        prismaClient: tx as unknown as PrismaClient,
      });

      if (window.kind === "NO_WINDOWS") {
        await tx.negotiation.update({
          where: { id: negotiation.id },
          data: { status: "CANCELLED", decidedAt: input.simulatedNow },
        });
        return {
          ok: false as const,
          reason: "WINDOW_NOT_AVAILABLE" as const,
          message: "No transfer windows configured for the season",
        };
      }

      if (window.kind === "WITHIN") {
        const freshBuyer = await tx.team.findUnique({
          where: { id: buyerTeam.id },
          select: { budget: true },
        });
        if (!freshBuyer || freshBuyer.budget < negotiation.agreedPrice) {
          await tx.negotiation.update({
            where: { id: negotiation.id },
            data: { status: "CANCELLED", decidedAt: input.simulatedNow },
          });
          return {
            ok: false as const,
            reason: "INSUFFICIENT_FUNDS" as const,
            message: "Buyer budget changed during transaction",
          };
        }

        await tx.team.update({
          where: { id: buyerTeam.id },
          data: { budget: { decrement: negotiation.agreedPrice } },
        });
        await tx.team.update({
          where: { id: sellerTeam.id },
          data: { budget: { increment: negotiation.agreedPrice } },
        });

        const buyerBudgetAfter = freshBuyer.budget - negotiation.agreedPrice;
        const sellerBudgetAfter = sellerTeam.budget + negotiation.agreedPrice;

        let transferId: string | null = null;
        let loanId: string | null = null;

        if (negotiation.type === "PERMANENT") {
          const created = await tx.transfer.create({
            data: {
              seasonId: negotiation.seasonId,
              playerId: negotiation.playerId,
              sellerTeamId: negotiation.sellerTeamId,
              buyerTeamId: negotiation.buyerTeamId,
              buyerId: negotiation.buyerId,
              sellerId: negotiation.sellerId,
              fee: Math.round(negotiation.agreedPrice),
              status: "COMPLETED",
              completedAt: input.simulatedNow,
              negotiationId: negotiation.id,
            },
          });
          transferId = created.id;

          const activeRoster = await tx.roster.findFirst({
            where: { playerId: negotiation.playerId, isActive: true },
            select: { id: true, teamId: true },
          });
          if (activeRoster) {
            await tx.roster.update({
              where: { id: activeRoster.id },
              data: { teamId: negotiation.buyerTeamId, isActive: true },
            });
          } else {
            await tx.roster.create({
              data: {
                teamId: negotiation.buyerTeamId,
                playerId: negotiation.playerId,
                seasonId: negotiation.seasonId,
                isActive: true,
                role: negotiation.squadRole === "CLAVE" || negotiation.squadRole === "IMPORTANTE" || negotiation.squadRole === "ROTACION"
                  ? negotiation.squadRole
                  : "ROTACION",
              },
            });
          }
        } else {
          const loanDuration = ensureLoanDuration(negotiation.type as TransferType);
          const startsAt = input.simulatedNow;
          const endsAt = computeLoanEnds(
            startsAt,
            negotiation.type as TransferType,
            negotiation.season?.endDate ?? null,
          );
          const created = await tx.loan.create({
            data: {
              seasonId: negotiation.seasonId,
              playerId: negotiation.playerId,
              sellerTeamId: negotiation.sellerTeamId,
              buyerTeamId: negotiation.buyerTeamId,
              buyerId: negotiation.buyerId,
              sellerId: negotiation.sellerId,
              duration: loanDuration,
              wageShareBuyerPct: negotiation.buyerSalaryPercent,
              hasBuyOption: negotiation.buyoutOptionPrice !== null,
              buyOptionPrice:
                negotiation.buyoutOptionPrice !== null
                  ? Math.round(negotiation.buyoutOptionPrice)
                  : null,
              fee: Math.round(negotiation.agreedPrice),
              status: "COMPLETED",
              startsAt,
              endsAt,
              completedAt: input.simulatedNow,
              negotiationId: negotiation.id,
              squadRoleSnapshot: negotiation.squadRole,
            },
          });
          loanId = created.id;

          const activeRoster = await tx.roster.findFirst({
            where: { playerId: negotiation.playerId, isActive: true },
            select: { id: true },
          });
          if (activeRoster) {
            await tx.roster.update({
              where: { id: activeRoster.id },
              data: { teamId: negotiation.buyerTeamId, isActive: true },
            });
          } else {
            await tx.roster.create({
              data: {
                teamId: negotiation.buyerTeamId,
                playerId: negotiation.playerId,
                seasonId: negotiation.seasonId,
                isActive: true,
                role: "ROTACION",
              },
            });
          }
        }

        await tx.negotiation.update({
          where: { id: negotiation.id },
          data: {
            status: "COMPLETED",
            decidedAt: input.simulatedNow,
            effectiveDate: input.simulatedNow,
          },
        });

        for (const loser of ranking.losers) {
          await tx.negotiation.update({
            where: { id: loser.id },
            data: { status: "CANCELLED", decidedAt: input.simulatedNow },
          });
        }

        return {
          ok: true as const,
          status: "COMPLETED" as const,
          negotiationId: negotiation.id,
          effectiveDate: input.simulatedNow,
          transferId,
          loanId,
          budgetAfter: {
            buyerId: buyerTeam.id,
            sellerId: sellerTeam.id,
            buyerBudget: buyerBudgetAfter,
            sellerBudget: sellerBudgetAfter,
          },
        };
      }

      // PENDING_NEXT or OUT_OF_SEASON: cobro inmediato, roster diferido
      const freshBuyer = await tx.team.findUnique({
        where: { id: buyerTeam.id },
        select: { budget: true },
      });
      if (!freshBuyer || freshBuyer.budget < negotiation.agreedPrice) {
        await tx.negotiation.update({
          where: { id: negotiation.id },
          data: { status: "CANCELLED", decidedAt: input.simulatedNow },
        });
        return {
          ok: false as const,
          reason: "INSUFFICIENT_FUNDS" as const,
          message: "Buyer budget changed during transaction",
        };
      }

      await tx.team.update({
        where: { id: buyerTeam.id },
        data: { budget: { decrement: negotiation.agreedPrice } },
      });
      await tx.team.update({
        where: { id: sellerTeam.id },
        data: { budget: { increment: negotiation.agreedPrice } },
      });

      const buyerBudgetAfter = freshBuyer.budget - negotiation.agreedPrice;
      const sellerBudgetAfter = sellerTeam.budget + negotiation.agreedPrice;

      const dbNext = await nextTransferWindowAfter({
        simulatedNow: input.simulatedNow,
        seasonId: negotiation.seasonId,
        prismaClient: tx as unknown as PrismaClient,
      });
      const next: TransferWindowSnapshot =
        dbNext ??
        (window.kind === "PENDING_NEXT" || window.kind === "OUT_OF_SEASON"
          ? window.next
          : buildFutureWindow(input.simulatedNow));

      await tx.negotiation.update({
        where: { id: negotiation.id },
        data: {
          status: "AGREED_PENDING_WINDOW",
          decidedAt: input.simulatedNow,
          effectiveDate: next.opensAt,
          windowOpensAt: next.opensAt,
        },
      });

      for (const loser of ranking.losers) {
        await tx.negotiation.update({
          where: { id: loser.id },
          data: { status: "CANCELLED", decidedAt: input.simulatedNow },
        });
      }

      return {
        ok: true as const,
        status: "AGREED_PENDING_WINDOW" as const,
        negotiationId: negotiation.id,
        effectiveDate: next.opensAt,
        transferId: null,
        loanId: null,
        budgetAfter: {
          buyerId: buyerTeam.id,
          sellerId: sellerTeam.id,
          buyerBudget: buyerBudgetAfter,
          sellerBudget: sellerBudgetAfter,
        },
      };
    });
  } catch (err) {
    if (err instanceof Error && err.name === "PrismaClientKnownRequestError") {
      return {
        ok: false,
        reason: "PRISMA_ERROR",
        message: `Prisma error: ${err.message}`,
      };
    }
    throw err;
  }
}
