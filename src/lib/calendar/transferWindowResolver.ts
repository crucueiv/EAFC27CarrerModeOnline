import type { Prisma, PrismaClient, TransferWindow } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import {
  getSeasonCycle,
  utcMidnight,
  SEASON_END_MONTH,
  SEASON_END_DAY,
} from "@/domain/calendar/utcDate";

export type TransferWindowKind = "SUMMER" | "WINTER" | "ONBOARDING_ONLY";

export type TransferWindowSnapshot = {
  id: string;
  kind: TransferWindowKind;
  opensAt: Date;
  closesAt: Date;
  seasonId: string;
};

export type ResolvedWindow =
  | { kind: "WITHIN"; window: TransferWindowSnapshot }
  | { kind: "PENDING_NEXT"; next: TransferWindowSnapshot }
  | { kind: "OUT_OF_SEASON"; next: TransferWindowSnapshot }
  | { kind: "NO_WINDOWS" };

const SUMMER_OPEN_MONTH = 7;
const SUMMER_OPEN_DAY = 1;
const SUMMER_CLOSE_MONTH = 9;
const SUMMER_CLOSE_DAY = 1;
const WINTER_OPEN_MONTH = 1;
const WINTER_OPEN_DAY = 1;
const WINTER_CLOSE_MONTH = 1;
const WINTER_CLOSE_DAY = 31;

function toSnapshot(w: TransferWindow): TransferWindowSnapshot {
  return {
    id: w.id,
    kind: w.kind as TransferWindowKind,
    opensAt: w.opensAt,
    closesAt: w.closesAt,
    seasonId: w.seasonId,
  };
}

function isWithin(simulated: Date, w: TransferWindowSnapshot): boolean {
  return simulated.getTime() >= w.opensAt.getTime() && simulated.getTime() <= w.closesAt.getTime();
}

function isPast(simulated: Date, w: TransferWindowSnapshot): boolean {
  return simulated.getTime() > w.closesAt.getTime();
}

function findNext(
  simulated: Date,
  windows: TransferWindowSnapshot[],
): TransferWindowSnapshot | null {
  const upcoming = windows
    .filter((w) => w.opensAt.getTime() > simulated.getTime())
    .sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime());
  return upcoming[0] ?? null;
}

export type ResolveActiveWindowInput = {
  seasonId: string;
  simulatedNow: Date;
  prismaClient?: PrismaClient;
};

export async function resolveActiveWindow(
  input: ResolveActiveWindowInput,
): Promise<ResolvedWindow> {
  const prisma = input.prismaClient ?? defaultPrisma;
  if (!prisma) return { kind: "NO_WINDOWS" };

  const windows = await prisma.transferWindow.findMany({
    where: { seasonId: input.seasonId },
    orderBy: { opensAt: "asc" },
  });
  if (windows.length === 0) return { kind: "NO_WINDOWS" };

  const snapshots = windows.map(toSnapshot);
  const active = snapshots.find((w) => isWithin(input.simulatedNow, w));
  if (active) return { kind: "WITHIN", window: active };

  const next = findNext(input.simulatedNow, snapshots);
  if (next) {
    const season = await prisma.season.findUnique({
      where: { id: input.seasonId },
      select: { endDate: true },
    });
    if (season && input.simulatedNow.getTime() > season.endDate.getTime()) {
      return { kind: "OUT_OF_SEASON", next };
    }
    return { kind: "PENDING_NEXT", next };
  }
  return { kind: "NO_WINDOWS" };
}

export type NextWindowAfterInput = {
  simulatedNow: Date;
  seasonId: string;
  prismaClient?: PrismaClient;
};

export async function nextTransferWindowAfter(
  input: NextWindowAfterInput,
): Promise<TransferWindowSnapshot | null> {
  const prisma = input.prismaClient ?? defaultPrisma;
  if (!prisma) return null;

  const windows = await prisma.transferWindow.findMany({
    where: {
      seasonId: input.seasonId,
      opensAt: { gt: input.simulatedNow },
    },
    orderBy: { opensAt: "asc" },
  });
  return windows[0] ? toSnapshot(windows[0]) : null;
}

export function pureBuildSummerWindow(year: number): { opensAt: Date; closesAt: Date } {
  return {
    opensAt: utcMidnight(year, SUMMER_OPEN_MONTH, SUMMER_OPEN_DAY),
    closesAt: utcMidnight(year, SUMMER_CLOSE_MONTH, SUMMER_CLOSE_DAY),
  };
}

export function pureBuildWinterWindow(year: number): { opensAt: Date; closesAt: Date } {
  return {
    opensAt: utcMidnight(year, WINTER_OPEN_MONTH, WINTER_OPEN_DAY),
    closesAt: utcMidnight(year, WINTER_CLOSE_MONTH, WINTER_CLOSE_DAY),
  };
}

export function pureSeasonEnd(year: number): Date {
  return utcMidnight(year, SEASON_END_MONTH, SEASON_END_DAY);
}

export function isWithinTransferWindow(
  simulated: Date,
  w: TransferWindowSnapshot,
): boolean {
  return isWithin(simulated, w);
}

export function isPastTransferWindow(
  simulated: Date,
  w: TransferWindowSnapshot,
): boolean {
  return isPast(simulated, w);
}

export function inferNextWindowFromCycle(
  simulated: Date,
): { opensAt: Date; closesAt: Date; kind: "SUMMER" | "WINTER" } {
  const cycle = getSeasonCycle(simulated.getUTCFullYear(), simulated);
  const summerCloses = cycle.summerClose.getTime() <= simulated.getTime();
  if (summerCloses) {
    const opensAt = cycle.winterOpen;
    return { kind: "WINTER", opensAt, closesAt: pureBuildWinterWindow(opensAt.getUTCFullYear()).closesAt };
  }
  const opensAt = cycle.summerOpen;
  return { kind: "SUMMER", opensAt, closesAt: pureBuildSummerWindow(opensAt.getUTCFullYear()).closesAt };
}
