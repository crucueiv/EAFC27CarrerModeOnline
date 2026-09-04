import type { Prisma, PrismaClient } from "@prisma/client";
import { closeSeason } from "@/lib/competitions/season-closure";
import { getSeasonCycle, utcMidnight } from "@/domain/calendar/utcDate";
import { seedTransferWindows } from "./seedTransferWindows";
import { ensureCalendarState } from "./advanceService";
import { withSerializableTransaction } from "./calendarDb";

export type ProcessSeasonTransitionInput = {
  careerGroupId: string;
  now?: Date;
};

export type ProcessSeasonTransitionResult = {
  closedSeasonId: string | null;
  newSeasonId: string | null;
  reopenedWindows: string[];
  lockApplied: boolean;
  resetApplied: boolean;
  opened: boolean;
};

const SEASON_LOCK_REASON = "SEASON_TRANSITION_LOCK" as const;

export async function lockAllCalendarsOnSeasonEnd(
  prisma: PrismaClient,
  careerGroupId: string,
  seasonId: string,
  now: Date,
): Promise<number> {
  const result = await prisma.teamCalendarState.updateMany({
    where: {
      careerGroupId,
      seasonId,
      isLocked: false,
    },
    data: {
      isLocked: true,
      lockReason: SEASON_LOCK_REASON,
      lockMetadata: { lockedAt: now.toISOString() } as Prisma.InputJsonValue,
    },
  });
  return result.count;
}

export async function processSeasonEndResets(
  prisma: PrismaClient,
  careerGroupId: string,
  seasonId: string,
): Promise<{ closed: boolean }> {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { status: true, careerGroupId: true },
  });
  if (!season) throw new Error(`Season not found: ${seasonId}`);
  if (season.careerGroupId !== careerGroupId) {
    throw new Error("careerGroupId mismatch");
  }
  if (season.status !== "ACTIVE") {
    return { closed: false };
  }
  await closeSeason({ seasonId, careerGroupId });
  return { closed: true };
}

export type OpenNewSeasonInput = {
  careerGroupId: string;
  now: Date;
  seasonName?: string;
  copyCalendarFromSeasonId?: string;
};

export type OpenNewSeasonResult = {
  seasonId: string;
  windows: string[];
};

export async function openNewSeason(
  prisma: PrismaClient,
  input: OpenNewSeasonInput,
): Promise<OpenNewSeasonResult> {
  const active = await prisma.season.findFirst({
    where: { careerGroupId: input.careerGroupId, status: "ACTIVE" },
    select: { id: true },
  });
  if (active) {
    return { seasonId: active.id, windows: [] };
  }

  const cycle = getSeasonCycle(input.now.getUTCFullYear(), input.now);
  const startDate = cycle.startDate;
  const endDate = cycle.endDate;

  const lastSeason = await prisma.season.findFirst({
    where: { careerGroupId: input.careerGroupId },
    orderBy: { startDate: "desc" },
    select: { name: true, startDate: true },
  });

  const newSeason = await prisma.season.create({
    data: {
      careerGroupId: input.careerGroupId,
      name: input.seasonName ?? deriveSeasonName(lastSeason?.name, startDate),
      status: "ACTIVE",
      startDate,
      endDate,
      currentWeek: 1,
      isTransferWindowOpen: true,
    },
  });

  const seed = await seedTransferWindows(prisma, {
    seasonId: newSeason.id,
    seasonStartDate: startDate,
    seasonEndDate: endDate,
    now: input.now,
  });

  await openSummerWindow(prisma, newSeason.id, input.now);

  await prisma.transferWindow.updateMany({
    where: { seasonId: newSeason.id, status: "SCHEDULED", kind: { in: ["WINTER", "ONBOARDING_ONLY"] } },
    data: { status: "OPEN", openedAt: input.now },
  });

  const teams = await prisma.team.findMany({
    where: { league: { careerGroupId: input.careerGroupId } },
    select: { id: true },
  });
  for (const t of teams) {
    await ensureCalendarState(prisma, {
      teamId: t.id,
      seasonId: newSeason.id,
      careerGroupId: input.careerGroupId,
      initialDate: startDate,
    });
  }

  await prisma.careerGroupClock.upsert({
    where: { careerGroupId: input.careerGroupId },
    create: { careerGroupId: input.careerGroupId, lastSyncAt: input.now, pendingSyncWindowId: null },
    update: { lastSyncAt: input.now, pendingSyncWindowId: null },
  });

  return {
    seasonId: newSeason.id,
    windows: seed.created.map((w) => w.id),
  };
}

function deriveSeasonName(previousName: string | null | undefined, startDate: Date): string {
  if (!previousName) {
    return `Temporada ${startDate.getUTCFullYear() - 1969}/${startDate.getUTCFullYear() - 1968}`;
  }
  const m = previousName.match(/(\d+)/);
  const next = m ? Number(m[1]) + 1 : 1;
  return `Temporada ${next}`;
}

export async function openSummerWindow(
  prisma: PrismaClient,
  seasonId: string,
  now: Date,
): Promise<string | null> {
  const cycle = getSeasonCycle(now.getUTCFullYear(), now);
  const opened = await prisma.transferWindow.updateMany({
    where: {
      seasonId,
      kind: "SUMMER",
      status: "SCHEDULED",
    },
    data: { status: "OPEN", openedAt: now },
  });
  if (opened.count === 0) return null;
  const w = await prisma.transferWindow.findUnique({
    where: { seasonId_kind: { seasonId, kind: "SUMMER" } },
    select: { id: true },
  });
  await prisma.careerGroupClock.upsert({
    where: { careerGroupId: (await prisma.season.findUnique({ where: { id: seasonId }, select: { careerGroupId: true } }))!.careerGroupId },
    create: { careerGroupId: (await prisma.season.findUnique({ where: { id: seasonId }, select: { careerGroupId: true } }))!.careerGroupId, lastSyncAt: now, pendingSyncWindowId: w?.id ?? null },
    update: { pendingSyncWindowId: w?.id ?? null, lastSyncAt: now },
  });
  return w?.id ?? null;
}

export async function processSeasonTransition(
  prisma: PrismaClient,
  input: ProcessSeasonTransitionInput,
): Promise<ProcessSeasonTransitionResult> {
  const now = input.now ?? new Date();
  const cycle = getSeasonCycle(now.getUTCFullYear(), now);

  const activeSeason = await prisma.season.findFirst({
    where: { careerGroupId: input.careerGroupId, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
    select: { id: true, endDate: true, startDate: true },
  });

  let lockApplied = false;
  let resetApplied = false;
  let closedSeasonId: string | null = null;
  let newSeasonId: string | null = null;
  const reopenedWindows: string[] = [];

  if (activeSeason) {
    const transitionStart = utcMidnight(
      activeSeason.endDate.getUTCFullYear(),
      activeSeason.endDate.getUTCMonth() + 1,
      activeSeason.endDate.getUTCDate(),
    );
    if (now.getTime() >= transitionStart.getTime()) {
      const updated = await withSerializableTransaction(prisma, async (tx) => {
        return tx.teamCalendarState.updateMany({
          where: {
            careerGroupId: input.careerGroupId,
            seasonId: activeSeason.id,
            isLocked: false,
          },
          data: {
            isLocked: true,
            lockReason: SEASON_LOCK_REASON,
            lockMetadata: { lockedAt: now.toISOString() } as Prisma.InputJsonValue,
          },
        });
      });
      lockApplied = updated.count > 0;
    }
  }

  if (activeSeason && now.getTime() >= cycle.startDate.getTime() - 24 * 60 * 60 * 1000) {
    const { closed } = await processSeasonEndResets(prisma, input.careerGroupId, activeSeason.id);
    if (closed) {
      closedSeasonId = activeSeason.id;
      resetApplied = true;
    }
  }

  if (!activeSeason || now.getTime() >= cycle.startDate.getTime()) {
    const opened = await openNewSeason(prisma, {
      careerGroupId: input.careerGroupId,
      now,
    });
    if (opened.windows.length > 0) {
      reopenedWindows.push(...opened.windows);
    }
    newSeasonId = opened.seasonId;
  }

  return {
    closedSeasonId,
    newSeasonId,
    reopenedWindows,
    lockApplied,
    resetApplied,
    opened: !!newSeasonId,
  };
}
