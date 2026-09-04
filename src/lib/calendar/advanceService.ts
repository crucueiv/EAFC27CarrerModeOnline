import type { PrismaClient } from "@prisma/client";
import { withTeamCalendarLock } from "./calendarDb";
import {
  calculateMaxAllowedDate,
} from "@/domain/calendar/calculateMaxAllowedDate";
import { canUserAdvanceToDate } from "@/domain/calendar/canUserAdvanceToDate";
import { getSeasonCycle, addDaysUtc } from "@/domain/calendar/utcDate";

export type AdvanceUserToDateInput = {
  userId: string;
  careerGroupId: string;
  targetDate: Date;
  now?: Date;
};

export type AdvanceUserToDateResult =
  | {
      ok: true;
      newCurrentDate: Date;
      maxAllowedDate: Date;
    }
  | {
      ok: false;
      reason:
        | "PVP_MATCH_PENDING"
        | "TOURNAMENT_PHASE_WAIT"
        | "TRANSFER_WINDOW_SYNC_WAIT"
        | "SEASON_END_LOCK"
        | "TARGET_BEFORE_CURRENT";
      maxAllowedDate: Date;
      currentDate: Date;
      details?: Record<string, unknown>;
    };

export async function advanceUserToDate(
  prisma: PrismaClient,
  input: AdvanceUserToDateInput,
): Promise<AdvanceUserToDateResult> {
  const now = input.now ?? new Date();

  const season = await prisma.season.findFirst({
    where: { careerGroupId: input.careerGroupId, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
    select: { id: true, endDate: true, startDate: true },
  });
  if (!season) {
    return {
      ok: false,
      reason: "SEASON_END_LOCK",
      currentDate: now,
      maxAllowedDate: now,
    };
  }

  const team = await prisma.team.findFirst({
    where: { managerId: input.userId, league: { careerGroupId: input.careerGroupId } },
    select: { id: true, managerId: true },
  });
  if (!team) {
    return {
      ok: false,
      reason: "SEASON_END_LOCK",
      currentDate: now,
      maxAllowedDate: now,
    };
  }

  const check = await canUserAdvanceToDate(prisma, {
    userId: input.userId,
    careerGroupId: input.careerGroupId,
    targetDate: input.targetDate,
    now,
  });

  if (!check.canAdvance) {
    return {
      ok: false,
      reason: check.blockingReason ?? "SEASON_END_LOCK",
      currentDate: now,
      maxAllowedDate: check.maxAllowedDate,
      details: check.blockingDetails as Record<string, unknown> | undefined,
    };
  }

  return withTeamCalendarLock(prisma, team.id, season.id, async (tx) => {
    const state = await tx.teamCalendarState.findUnique({
      where: { teamId_seasonId: { teamId: team.id, seasonId: season.id } },
      select: { currentDate: true, isLocked: true, lockReason: true, version: true },
    });

    if (!state) {
      await tx.teamCalendarState.create({
        data: {
          teamId: team.id,
          seasonId: season.id,
          careerGroupId: input.careerGroupId,
          currentDate: input.targetDate,
          maxAllowedDate: input.targetDate,
          isLocked: false,
          lockReason: "NONE",
          version: 1,
        },
      });
      return {
        ok: true as const,
        newCurrentDate: input.targetDate,
        maxAllowedDate: input.targetDate,
      };
    }

    if (state.isLocked && state.lockReason && state.lockReason !== "NONE") {
      return {
        ok: false as const,
        reason: "PVP_MATCH_PENDING",
        currentDate: state.currentDate,
        maxAllowedDate: state.currentDate,
      };
    }

    if (input.targetDate.getTime() < state.currentDate.getTime()) {
      return {
        ok: false as const,
        reason: "TARGET_BEFORE_CURRENT",
        currentDate: state.currentDate,
        maxAllowedDate: state.currentDate,
      };
    }

    const updated = await tx.teamCalendarState.updateMany({
      where: {
        teamId: team.id,
        seasonId: season.id,
        version: state.version,
        currentDate: state.currentDate,
      },
      data: {
        currentDate: input.targetDate,
        version: state.version + 1,
        lastAdvanceAt: now,
      },
    });

    if (updated.count !== 1) {
      const fresh = await tx.teamCalendarState.findUnique({
        where: { teamId_seasonId: { teamId: team.id, seasonId: season.id } },
        select: { currentDate: true },
      });
      return {
        ok: false as const,
        reason: "TARGET_BEFORE_CURRENT",
        currentDate: fresh?.currentDate ?? state.currentDate,
        maxAllowedDate: fresh?.currentDate ?? state.currentDate,
        details: { reason: "concurrent_advance" },
      };
    }

    const freshMax = await calculateMaxAllowedDate(tx as unknown as PrismaClient, {
      teamId: team.id,
      seasonId: season.id,
      careerGroupId: input.careerGroupId,
      now,
    });

    return {
      ok: true as const,
      newCurrentDate: input.targetDate,
      maxAllowedDate: freshMax.maxAllowedDate,
    };
  });
}

export type EnsureCalendarStateInput = {
  teamId: string;
  seasonId: string;
  careerGroupId: string;
  initialDate?: Date;
};

export async function ensureCalendarState(
  prisma: PrismaClient,
  input: EnsureCalendarStateInput,
): Promise<void> {
  const season = await prisma.season.findUnique({
    where: { id: input.seasonId },
    select: { id: true, startDate: true, endDate: true, careerGroupId: true },
  });
  if (!season) throw new Error(`Season not found: ${input.seasonId}`);
  if (season.careerGroupId !== input.careerGroupId) {
    throw new Error("careerGroupId mismatch");
  }
  const initial = input.initialDate ?? season.startDate;
  const max = await calculateMaxAllowedDate(prisma, {
    teamId: input.teamId,
    seasonId: input.seasonId,
    careerGroupId: input.careerGroupId,
    now: initial,
  });
  await prisma.teamCalendarState.upsert({
    where: { teamId_seasonId: { teamId: input.teamId, seasonId: input.seasonId } },
    create: {
      teamId: input.teamId,
      seasonId: input.seasonId,
      careerGroupId: input.careerGroupId,
      currentDate: initial,
      maxAllowedDate: max.maxAllowedDate,
      isLocked: false,
      lockReason: "NONE",
      version: 1,
    },
    update: {
      maxAllowedDate: max.maxAllowedDate,
      lastAdvanceAt: new Date(),
    },
  });
}

export function nextTransferWindowOpensAt(reference: Date = new Date()): Date {
  const cycle = getSeasonCycle(reference.getUTCFullYear(), reference);
  if (reference.getTime() < cycle.winterOpen.getTime()) return cycle.winterOpen;
  if (reference.getTime() < cycle.summerOpen.getTime()) return cycle.summerOpen;
  const next = getSeasonCycle(reference.getUTCFullYear() + 1, reference);
  return next.summerOpen;
}

export function dayBeforeTransferWindow(opensAt: Date): Date {
  return addDaysUtc(opensAt, -1);
}
