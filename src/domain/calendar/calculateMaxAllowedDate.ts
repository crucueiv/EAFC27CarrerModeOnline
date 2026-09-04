import type { PrismaClient } from "@prisma/client";
import {
  calculateMaxAllowedDatePure,
  type MaxAllowedResult,
} from "./calculateMaxAllowedDatePure";
import { addDaysUtc } from "./utcDate";

export type CalculateMaxAllowedDateInput = {
  teamId: string;
  seasonId: string;
  careerGroupId: string;
  now?: Date;
};

export async function calculateMaxAllowedDate(
  prisma: PrismaClient,
  input: CalculateMaxAllowedDateInput,
): Promise<MaxAllowedResult> {
  const now = input.now ?? new Date();
  const season = await prisma.season.findUnique({
    where: { id: input.seasonId },
    select: { id: true, endDate: true, careerGroupId: true },
  });
  if (!season) throw new Error(`Season not found: ${input.seasonId}`);
  if (season.careerGroupId !== input.careerGroupId) {
    throw new Error("careerGroupId does not match season");
  }

  const state = await prisma.teamCalendarState.findUnique({
    where: { teamId_seasonId: { teamId: input.teamId, seasonId: input.seasonId } },
    select: { currentDate: true, isLocked: true, lockReason: true, lockMetadata: true },
  });
  if (state?.isLocked && state.lockReason && state.lockReason !== "NONE") {
    return {
      maxAllowedDate: state.currentDate,
      reason: "SEASON_END",
      blockingDetails: { matchId: undefined },
    };
  }

  const team = await prisma.team.findUnique({
    where: { id: input.teamId },
    select: { managerId: true },
  });

  const currentDate = state?.currentDate ?? now;

  const nextMatch = await prisma.match.findFirst({
    where: {
      seasonId: input.seasonId,
      status: { in: ["PENDING", "WAITING_PVP"] },
      scheduledAt: { gte: now },
      OR: [{ homeTeamId: input.teamId }, { awayTeamId: input.teamId }],
    },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      scheduledAt: true,
      mode: true,
      homeTeamId: true,
      awayTeamId: true,
      homeTeam: { select: { managerId: true } },
      awayTeam: { select: { managerId: true } },
    },
  });

  const nextPendingMatch = nextMatch
    ? {
        id: nextMatch.id,
        scheduledAt: nextMatch.scheduledAt,
        mode: nextMatch.mode,
        opponentManagerId:
          nextMatch.homeTeamId === input.teamId
            ? nextMatch.awayTeam.managerId ?? undefined
            : nextMatch.homeTeam.managerId ?? undefined,
      }
    : null;

  const nextTransferWindowOpensAt = await prisma.transferWindow
    .findFirst({
      where: {
        status: "SCHEDULED",
        opensAt: { gt: now },
        season: { careerGroupId: input.careerGroupId, status: "ACTIVE" },
      },
      orderBy: { opensAt: "asc" },
      select: { opensAt: true },
    })
    .then((w) => w?.opensAt ?? null);

  let pendingTournamentStageName: string | null = null;
  let pendingTournamentMinDate: Date | null = null;

  if (team?.managerId) {
    const groupStages = await prisma.tournamentStage.findMany({
      where: {
        isGroupPhase: true,
        requiresAllGroupMatchesComplete: true,
        tournament: { seasonId: input.seasonId },
        matches: { some: { OR: [{ homeTeamId: input.teamId }, { awayTeamId: input.teamId }] } },
      },
      select: { id: true, name: true },
    });
    if (groupStages.length > 0) {
      const incomplete = await prisma.match.findFirst({
        where: {
          tournamentStageId: { in: groupStages.map((s) => s.id) },
          status: { in: ["PENDING", "WAITING_PVP"] },
          NOT: { OR: [{ homeTeamId: input.teamId }, { awayTeamId: input.teamId }] },
        },
        orderBy: { scheduledAt: "asc" },
        select: { scheduledAt: true },
      });
      if (incomplete) {
        pendingTournamentMinDate = addDaysUtc(incomplete.scheduledAt, -1);
        pendingTournamentStageName = groupStages[0]!.name;
      }
    }

    const knockoutStages = await prisma.tournamentStage.findMany({
      where: {
        isKnockout: true,
        tournament: { seasonId: input.seasonId },
        matches: { some: { OR: [{ homeTeamId: input.teamId }, { awayTeamId: input.teamId }] } },
        parentStage: { is: { isKnockout: true } },
      },
      select: { parentStageId: true },
    });
    const parentIds = Array.from(
      new Set(knockoutStages.map((s) => s.parentStageId).filter((v): v is string => Boolean(v))),
    );
    if (parentIds.length > 0) {
      const incompleteParent = await prisma.match.findFirst({
        where: {
          tournamentStageId: { in: parentIds },
          status: { in: ["PENDING", "WAITING_PVP"] },
        },
        orderBy: { scheduledAt: "asc" },
        select: { scheduledAt: true, tournamentStage: { select: { name: true } } },
      });
      if (incompleteParent) {
        pendingTournamentMinDate = addDaysUtc(incompleteParent.scheduledAt, -1);
        pendingTournamentStageName = incompleteParent.tournamentStage?.name ?? null;
      }
    }
  }

  return calculateMaxAllowedDatePure({
    now,
    seasonEndDate: season.endDate,
    currentDate,
    nextPendingMatch,
    nextTransferWindowOpensAt,
    pendingTournamentStageName,
    pendingTournamentMinDate,
  });
}
