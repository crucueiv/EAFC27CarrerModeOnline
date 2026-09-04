import type { PrismaClient } from "@prisma/client";
import { calculateMaxAllowedDate } from "./calculateMaxAllowedDate";
import { resolveSeasonForDate, utcMidnight } from "./utcDate";

export type BlockingReason =
  | "PVP_MATCH_PENDING"
  | "TOURNAMENT_PHASE_WAIT"
  | "TRANSFER_WINDOW_SYNC_WAIT"
  | "SEASON_END_LOCK";

export type AdvanceCheckResult = {
  canAdvance: boolean;
  maxAllowedDate: Date;
  blockingReason?: BlockingReason;
  blockingDetails?: {
    matchId?: string;
    pendingUsers?: string[];
    tournamentName?: string;
    transferWindowId?: string;
  };
};

export type AdvanceCheckInput = {
  userId: string;
  careerGroupId: string;
  targetDate?: Date;
  now?: Date;
};

export async function canUserAdvanceToDate(
  prisma: PrismaClient,
  input: AdvanceCheckInput,
): Promise<AdvanceCheckResult> {
  const now = input.now ?? new Date();
  const { cycle, isOffSeason } = resolveSeasonForDate(now);
  const season = await prisma.season.findFirst({
    where: { careerGroupId: input.careerGroupId, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
    select: { id: true, endDate: true, startDate: true, status: true },
  });
  if (!season) {
    return {
      canAdvance: false,
      maxAllowedDate: now,
      blockingReason: "SEASON_END_LOCK",
    };
  }

  const transitionStart = utcMidnight(
    season.endDate.getUTCFullYear(),
    season.endDate.getUTCMonth() + 1,
    season.endDate.getUTCDate(),
  );
  const startOfThisSeason = season.startDate;
  const inTransition = now.getTime() >= transitionStart.getTime() && now.getTime() < startOfThisSeason.getTime();
  if (inTransition || isOffSeason) {
    return {
      canAdvance: false,
      maxAllowedDate: now,
      blockingReason: "SEASON_END_LOCK",
    };
  }

  const team = await prisma.team.findFirst({
    where: { managerId: input.userId, league: { careerGroupId: input.careerGroupId } },
    select: { id: true },
  });
  if (!team) {
    return {
      canAdvance: false,
      maxAllowedDate: now,
      blockingReason: "SEASON_END_LOCK",
    };
  }

  const calc = await calculateMaxAllowedDate(prisma, {
    teamId: team.id,
    seasonId: season.id,
    careerGroupId: input.careerGroupId,
    now,
  });

  const target = input.targetDate ?? calc.maxAllowedDate;
  const canAdvance = target.getTime() <= calc.maxAllowedDate.getTime();

  if (canAdvance) {
    return {
      canAdvance: true,
      maxAllowedDate: calc.maxAllowedDate,
    };
  }

  const reason = mapReason(calc.reason);
  return {
    canAdvance: false,
    maxAllowedDate: calc.maxAllowedDate,
    blockingReason: reason,
    blockingDetails: {
      matchId: calc.blockingDetails?.matchId,
      pendingUsers: calc.blockingDetails?.pendingUsers,
      tournamentName: calc.blockingDetails?.tournamentName,
      transferWindowId: undefined,
    },
  };
}

function mapReason(
  r: "NEXT_MATCH" | "TRANSFER_WINDOW_SYNC" | "SEASON_END" | "TOURNAMENT_PHASE" | "FREE",
): BlockingReason {
  switch (r) {
    case "NEXT_MATCH":
      return "PVP_MATCH_PENDING";
    case "TRANSFER_WINDOW_SYNC":
      return "TRANSFER_WINDOW_SYNC_WAIT";
    case "TOURNAMENT_PHASE":
      return "TOURNAMENT_PHASE_WAIT";
    case "SEASON_END":
    case "FREE":
    default:
      return "SEASON_END_LOCK";
  }
}
