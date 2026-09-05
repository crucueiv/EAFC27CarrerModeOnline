import type {
  PrismaClient,
  Prisma,
  Transfer,
  Loan,
  Negotiation,
  Team,
  NegotiationChannel,
  NegotiationCooldownReason,
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
import {
  type Oferta,
  type OfferPlayerContext,
  computeCooldownExpiry,
  effectiveReleaseClause,
  isCooldownActive,
  valorTotalOferta,
} from "@/lib/transfers/negotiationRules";

export type ProcessNegotiationInput = {
  negotiationId: string;
  simulatedNow: Date;
  prismaClient?: PrismaClient;
  oferta?: Oferta;
  canal?: NegotiationChannel;
};

export type ProcessNegotiationSuccess = {
  ok: true;
  status:
    | "AGREED_ACTIVE"
    | "AGREED_PENDING_WINDOW"
    | "AGREED_CLUB"
    | "WAITING_PLAYER_CONTRACT"
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
    | "COOLDOWN_ACTIVE"
    | "PRISMA_ERROR";
  message: string;
  retryAt?: Date;
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

export async function recordPlayerContractRejectionCooldown(args: {
  prisma: PrismaClient;
  negotiationId: string;
  simulatedNow: Date;
}): Promise<{ ok: true; cooldownId: string; expiresAt: Date } | { ok: false; reason: string }> {
  const negotiation = await args.prisma.negotiation.findUnique({
    where: { id: args.negotiationId },
    select: { id: true, buyerTeamId: true, sellerTeamId: true, playerId: true },
  });
  if (!negotiation) return { ok: false, reason: "NEGOTIATION_NOT_FOUND" };
  const r = await recordCooldown({
    prisma: args.prisma,
    buyerTeamId: negotiation.buyerTeamId,
    sellerTeamId: negotiation.sellerTeamId,
    playerId: negotiation.playerId,
    reason: "PLAYER_CONTRACT_REJECTED",
    startsAt: args.simulatedNow,
    negotiationId: negotiation.id,
  });
  return { ok: true, cooldownId: r.cooldownId, expiresAt: r.expiresAt };
}

export async function recordManagerRejectionCooldown(args: {
  prisma: PrismaClient;
  negotiationId: string;
  simulatedNow: Date;
}): Promise<{ ok: true; cooldownId: string; expiresAt: Date } | { ok: false; reason: string }> {
  const negotiation = await args.prisma.negotiation.findUnique({
    where: { id: args.negotiationId },
    select: { id: true, buyerTeamId: true, sellerTeamId: true, playerId: true },
  });
  if (!negotiation) return { ok: false, reason: "NEGOTIATION_NOT_FOUND" };
  const r = await recordCooldown({
    prisma: args.prisma,
    buyerTeamId: negotiation.buyerTeamId,
    sellerTeamId: negotiation.sellerTeamId,
    playerId: negotiation.playerId,
    reason: "MANAGER_REJECTED",
    startsAt: args.simulatedNow,
    negotiationId: negotiation.id,
  });
  return { ok: true, cooldownId: r.cooldownId, expiresAt: r.expiresAt };
}

export async function recordCooldown(args: {
  prisma: PrismaClient | Prisma.TransactionClient;
  buyerTeamId: string;
  sellerTeamId: string;
  playerId: string;
  reason: NegotiationCooldownReason;
  startsAt: Date;
  negotiationId?: string;
}): Promise<{ cooldownId: string; expiresAt: Date }> {
  const expiresAt = computeCooldownExpiry(args.startsAt);
  const cooldown = await args.prisma.negotiationCooldown.upsert({
    where: {
      buyerTeamId_sellerTeamId_playerId_reason: {
        buyerTeamId: args.buyerTeamId,
        sellerTeamId: args.sellerTeamId,
        playerId: args.playerId,
        reason: args.reason,
      },
    },
    create: {
      buyerTeamId: args.buyerTeamId,
      sellerTeamId: args.sellerTeamId,
      playerId: args.playerId,
      reason: args.reason,
      startsAt: args.startsAt,
      expiresAt,
      negotiationId: args.negotiationId ?? null,
    },
    update: {
      startsAt: args.startsAt,
      expiresAt,
      negotiationId: args.negotiationId ?? null,
    },
  });
  return { cooldownId: cooldown.id, expiresAt };
}

function isNegotiationDecided(status: string): boolean {
  return (
    status === "AGREED_PENDING_WINDOW" ||
    status === "AGREED_ACTIVE" ||
    status === "AGREED_CLUB" ||
    status === "WAITING_PLAYER_CONTRACT" ||
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
      return "TWO_YEARS";
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

  const activeCooldown = await prisma.negotiationCooldown.findFirst({
    where: {
      buyerTeamId: negotiation.buyerTeamId,
      sellerTeamId: negotiation.sellerTeamId,
      playerId: negotiation.playerId,
      expiresAt: { gt: input.simulatedNow },
    },
    orderBy: { expiresAt: "desc" },
  });
  if (isCooldownActive(activeCooldown, input.simulatedNow)) {
    return {
      ok: false,
      reason: "COOLDOWN_ACTIVE",
      message: `Negotiation blocked by active cooldown until ${activeCooldown?.expiresAt.toISOString()}`,
      retryAt: activeCooldown?.expiresAt,
    };
  }

  let resolvedOferta: Oferta | null = input.oferta ?? null;
  if (resolvedOferta && resolvedOferta.jugadoresOfrecidos.length > 0) {
    const jugadorIds = resolvedOferta.jugadoresOfrecidos.map((p) => p.id);
    const players = await prisma.player.findMany({
      where: { id: { in: jugadorIds } },
      select: { id: true, marketValue: true },
    });
    const rosters = await prisma.roster.findMany({
      where: { playerId: { in: jugadorIds }, isActive: true },
      select: { playerId: true, teamId: true, isActive: true },
    });
    const ownerTeam = await prisma.team.findFirst({
      where: { id: negotiation.buyerTeamId },
      select: { id: true },
    });
    const rosterOwnerByPlayer = new Map(rosters.map((r) => [r.playerId, r.teamId]));
    for (const p of players) {
      const owner = rosterOwnerByPlayer.get(p.id);
      if (owner !== ownerTeam?.id) {
        return {
          ok: false,
          reason: "TEAM_NOT_FOUND",
          message: `Player ${p.id} is not owned by buyer team`,
        };
      }
    }
    const ctx: OfferPlayerContext = {
      marketValueOf: (p) => players.find((pp) => pp.id === p.id)?.marketValue ?? 0,
      releaseClauseOf: (p) => {
        const found = players.find((pp) => pp.id === p.id);
        return found ? effectiveReleaseClause(found) : null;
      },
      isListedForSale: () => false,
    };
    resolvedOferta = { ...resolvedOferta, jugadoresOfrecidos: players.map((p) => ({ id: p.id })) };
    const breakdown = valorTotalOferta(resolvedOferta, ctx);
    negotiation.agreedPrice = breakdown.total;
  } else if (resolvedOferta) {
    const ctx: OfferPlayerContext = {
      marketValueOf: () => 0,
      releaseClauseOf: () => null,
      isListedForSale: () => false,
    };
    const breakdown = valorTotalOferta(resolvedOferta, ctx);
    negotiation.agreedPrice = breakdown.total;
  }
  void resolvedOferta;

  try {
    return await withSerializableTransaction(prisma, async (tx) => {
      const competitors = await tx.negotiation.findMany({
        where: {
          playerId: negotiation.playerId,
          id: { not: negotiation.id },
          status: { in: ["PENDING_AGREEMENT", "AGREED_PENDING_WINDOW", "AGREED_ACTIVE", "AGREED_CLUB"] },
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
              status: "WAITING_PLAYER_CONTRACT",
              completedAt: null,
              negotiationId: negotiation.id,
            },
          });
          transferId = created.id;
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
              status: "WAITING_PLAYER_CONTRACT",
              startsAt,
              endsAt,
              completedAt: null,
              negotiationId: negotiation.id,
              squadRoleSnapshot: negotiation.squadRole,
            },
          });
          loanId = created.id;
        }

        await tx.negotiation.update({
          where: { id: negotiation.id },
          data: {
            status: "AGREED_CLUB",
            decidedAt: input.simulatedNow,
            effectiveDate: input.simulatedNow,
            ...(input.canal ? { canal: input.canal } : {}),
          },
        });

        if (resolvedOferta && resolvedOferta.jugadoresOfrecidos.length > 0 && negotiation.type === "PERMANENT") {
          for (const jp of resolvedOferta.jugadoresOfrecidos) {
            const activeRoster = await tx.roster.findFirst({
              where: { playerId: jp.id, isActive: true },
              select: { id: true, teamId: true },
            });
            if (activeRoster) {
              await tx.roster.update({
                where: { id: activeRoster.id },
                data: {
                  teamId: negotiation.sellerTeamId,
                  isActive: true,
                  isLoaned: false,
                },
              });
            }
            const inverse = await tx.transfer.create({
              data: {
                seasonId: negotiation.seasonId,
                playerId: jp.id,
                sellerTeamId: negotiation.buyerTeamId,
                buyerTeamId: negotiation.sellerTeamId,
                buyerId: negotiation.sellerId,
                sellerId: negotiation.buyerId,
                fee: 0,
                status: "COMPLETED",
                completedAt: input.simulatedNow,
              },
            });
            await tx.player.update({
              where: { id: jp.id },
              data: { isLoaned: false, loanedToTeamId: null },
            });
            void inverse;
          }
        }

        for (const loser of ranking.losers) {
          await tx.negotiation.update({
            where: { id: loser.id },
            data: { status: "CANCELLED", decidedAt: input.simulatedNow },
          });
        }

        return {
          ok: true as const,
          status: "AGREED_CLUB" as const,
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
          ...(input.canal ? { canal: input.canal } : {}),
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

export type FinalizePlayerContractInput = {
  negotiationId: string;
  simulatedNow: Date;
  prismaClient?: PrismaClient;
};

export type FinalizePlayerContractResult =
  | {
      ok: true;
      status: "COMPLETED";
      negotiationId: string;
      transferId: string | null;
      loanId: string | null;
      effectiveDate: Date;
    }
  | {
      ok: false;
      reason:
        | "PRISMA_UNAVAILABLE"
        | "NEGOTIATION_NOT_FOUND"
        | "INVALID_STATUS"
        | "PLAYER_NOT_FOUND"
        | "TEAM_NOT_FOUND"
        | "PLAYER_ALREADY_OWNED"
        | "PRISMA_ERROR";
      message: string;
    };

export async function finalizePlayerContract(
  input: FinalizePlayerContractInput,
): Promise<FinalizePlayerContractResult> {
  const prisma = input.prismaClient ?? defaultPrisma;
  if (!prisma) {
    return {
      ok: false,
      reason: "PRISMA_UNAVAILABLE",
      message: "Prisma client unavailable",
    };
  }

  const negotiation = await prisma.negotiation.findUnique({
    where: { id: input.negotiationId },
    include: {
      season: { select: { id: true, endDate: true } },
      player: { select: { id: true, name: true } },
    },
  });
  if (!negotiation) {
    return {
      ok: false,
      reason: "NEGOTIATION_NOT_FOUND",
      message: "Negotiation not found",
    };
  }

  const isLoanType = negotiation.type !== "PERMANENT";
  if (isLoanType) {
    return {
      ok: false,
      reason: "INVALID_STATUS",
      message: "Use signLoanPlayerContract for loan negotiations",
    };
  }

  if (negotiation.status !== "AGREED_CLUB") {
    return {
      ok: false,
      reason: "INVALID_STATUS",
      message: `Cannot sign contract for status ${negotiation.status}`,
    };
  }

  const transfer = await prisma.transfer.findFirst({
    where: { negotiationId: negotiation.id },
    orderBy: { createdAt: "desc" },
  });
  if (!transfer) {
    return {
      ok: false,
      reason: "NEGOTIATION_NOT_FOUND",
      message: "Associated transfer not found for this negotiation",
    };
  }

  try {
    return await withSerializableTransaction(prisma, async (tx) => {
      const player = await tx.player.findUnique({
        where: { id: negotiation.playerId },
        select: { id: true },
      });
      if (!player) {
        return {
          ok: false as const,
          reason: "PLAYER_NOT_FOUND" as const,
          message: "Player not found",
        };
      }

      const activeRoster = await tx.roster.findFirst({
        where: { playerId: negotiation.playerId, isActive: true },
        select: { id: true, teamId: true },
      });
      if (activeRoster) {
        await tx.roster.update({
          where: { id: activeRoster.id },
          data: {
            teamId: negotiation.buyerTeamId,
            isActive: true,
            isLoaned: false,
          },
        });
      } else {
        await tx.roster.create({
          data: {
            teamId: negotiation.buyerTeamId,
            playerId: negotiation.playerId,
            seasonId: negotiation.seasonId,
            isActive: true,
            isLoaned: false,
            role:
              negotiation.squadRole === "CLAVE" ||
              negotiation.squadRole === "IMPORTANTE" ||
              negotiation.squadRole === "ROTACION"
                ? negotiation.squadRole
                : "ROTACION",
          },
        });
      }

      await tx.player.update({
        where: { id: negotiation.playerId },
        data: { isLoaned: false, loanedToTeamId: null },
      });

      await tx.transfer.update({
        where: { id: transfer.id },
        data: {
          status: "COMPLETED",
          completedAt: input.simulatedNow,
        },
      });

      await tx.negotiation.update({
        where: { id: negotiation.id },
        data: {
          status: "COMPLETED",
          decidedAt: input.simulatedNow,
          effectiveDate: input.simulatedNow,
        },
      });

      return {
        ok: true as const,
        status: "COMPLETED" as const,
        negotiationId: negotiation.id,
        transferId: transfer.id,
        loanId: null,
        effectiveDate: input.simulatedNow,
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

export type FinalizeLoanPlayerContractInput = {
  negotiationId: string;
  simulatedNow: Date;
  prismaClient?: PrismaClient;
};

export type FinalizeLoanPlayerContractResult =
  | {
      ok: true;
      status: "COMPLETED";
      negotiationId: string;
      loanId: string;
      effectiveDate: Date;
    }
  | {
      ok: false;
      reason:
        | "PRISMA_UNAVAILABLE"
        | "NEGOTIATION_NOT_FOUND"
        | "INVALID_STATUS"
        | "PLAYER_NOT_FOUND"
        | "LOAN_NOT_FOUND"
        | "PRISMA_ERROR";
      message: string;
    };

export async function finalizeLoanPlayerContract(
  input: FinalizeLoanPlayerContractInput,
): Promise<FinalizeLoanPlayerContractResult> {
  const prisma = input.prismaClient ?? defaultPrisma;
  if (!prisma) {
    return {
      ok: false,
      reason: "PRISMA_UNAVAILABLE",
      message: "Prisma client unavailable",
    };
  }

  const negotiation = await prisma.negotiation.findUnique({
    where: { id: input.negotiationId },
  });
  if (!negotiation) {
    return {
      ok: false,
      reason: "NEGOTIATION_NOT_FOUND",
      message: "Negotiation not found",
    };
  }
  if (negotiation.type === "PERMANENT") {
    return {
      ok: false,
      reason: "INVALID_STATUS",
      message: "Use finalizePlayerContract for permanent transfers",
    };
  }
  if (negotiation.status !== "AGREED_CLUB") {
    return {
      ok: false,
      reason: "INVALID_STATUS",
      message: `Cannot sign loan contract for status ${negotiation.status}`,
    };
  }

  const loan = await prisma.loan.findFirst({
    where: { negotiationId: negotiation.id },
    orderBy: { createdAt: "desc" },
  });
  if (!loan) {
    return {
      ok: false,
      reason: "LOAN_NOT_FOUND",
      message: "Associated loan not found for this negotiation",
    };
  }

  try {
    return await withSerializableTransaction(prisma, async (tx) => {
      const player = await tx.player.findUnique({
        where: { id: negotiation.playerId },
        select: { id: true },
      });
      if (!player) {
        return {
          ok: false as const,
          reason: "PLAYER_NOT_FOUND" as const,
          message: "Player not found",
        };
      }

      const activeRoster = await tx.roster.findFirst({
        where: { playerId: negotiation.playerId, isActive: true },
        select: { id: true, teamId: true },
      });
      if (activeRoster) {
        await tx.roster.update({
          where: { id: activeRoster.id },
          data: {
            teamId: negotiation.buyerTeamId,
            isActive: true,
            isLoaned: true,
          },
        });
      } else {
        await tx.roster.create({
          data: {
            teamId: negotiation.buyerTeamId,
            playerId: negotiation.playerId,
            seasonId: negotiation.seasonId,
            isActive: true,
            isLoaned: true,
            role: "ROTACION",
          },
        });
      }

      await tx.player.update({
        where: { id: negotiation.playerId },
        data: {
          isLoaned: true,
          loanedToTeamId: negotiation.buyerTeamId,
        },
      });

      await tx.loan.update({
        where: { id: loan.id },
        data: {
          status: "COMPLETED",
          completedAt: input.simulatedNow,
        },
      });

      await tx.negotiation.update({
        where: { id: negotiation.id },
        data: {
          status: "COMPLETED",
          decidedAt: input.simulatedNow,
          effectiveDate: input.simulatedNow,
        },
      });

      return {
        ok: true as const,
        status: "COMPLETED" as const,
        negotiationId: negotiation.id,
        loanId: loan.id,
        effectiveDate: input.simulatedNow,
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
