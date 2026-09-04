import { randomBytes } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { utcMidnight } from "@/domain/calendar/utcDate";
import { seedTransferWindows } from "./seedTransferWindows";
import { ensureCalendarState } from "./advanceService";
import { withSerializableTransaction } from "./calendarDb";

export const SEASON_26_27_START = utcMidnight(2026, 7, 5);
export const SEASON_26_27_END = utcMidnight(2027, 6, 30);
export const SEASON_26_27_NAME = "Temporada 2026/27";

export type InitializeSeasonResult = {
  careerGroupId: string;
  seasonId: string;
  transferWindows: string[];
};

/**
 * Asegura que el CareerGroup del league del equipo tenga una Season 2026/27
 * ACTIVE con todas sus TransferWindows (SUMMER abierta) y un TeamCalendarState
 * para el equipo dado. Idempotente: si ya existe, reutiliza.
 *
 * Llamado desde el flujo de selección de equipo (primer manager).
 */
export async function ensureCareerGroupSeason2627(
  prisma: PrismaClient,
  args: { teamId: string; now?: Date },
): Promise<InitializeSeasonResult> {
  const now = args.now ?? new Date();

  const team = await prisma.team.findUnique({
    where: { id: args.teamId },
    select: {
      id: true,
      leagueId: true,
      league: { select: { id: true, careerGroupId: true } },
    },
  });
  if (!team) throw new Error(`Team not found: ${args.teamId}`);
  if (!team.leagueId || !team.league) {
    throw new Error(`Team ${args.teamId} has no league`);
  }

  let careerGroupId = team.league.careerGroupId;

  if (!careerGroupId) {
    const group = await prisma.careerGroup.create({
      data: {
        name: "Carrera online",
        inviteCode: `auto-${randomBytes(8).toString("hex")}`,
      },
    });
    careerGroupId = group.id;
    await prisma.league.update({
      where: { id: team.league.id },
      data: { careerGroupId },
    });
  }

  const existingActive = await prisma.season.findFirst({
    where: { careerGroupId, status: "ACTIVE" },
    select: { id: true },
  });

  if (existingActive) {
    await ensureCalendarState(prisma, {
      teamId: team.id,
      seasonId: existingActive.id,
      careerGroupId,
      initialDate: SEASON_26_27_START,
    });
    const windows = await prisma.transferWindow.findMany({
      where: { seasonId: existingActive.id },
      select: { id: true },
    });
    return {
      careerGroupId,
      seasonId: existingActive.id,
      transferWindows: windows.map((w) => w.id),
    };
  }

  return withSerializableTransaction(prisma, async (tx) => {
    const season = await tx.season.create({
      data: {
        name: SEASON_26_27_NAME,
        status: "ACTIVE",
        startDate: SEASON_26_27_START,
        endDate: SEASON_26_27_END,
        careerGroupId,
        leagueId: team.leagueId,
        currentWeek: 1,
        isTransferWindowOpen: true,
        pointsWin: 3,
        pointsDraw: 1,
        pointsLoss: 0,
      },
    });

    const seed = await seedTransferWindows(tx as unknown as PrismaClient, {
      seasonId: season.id,
      seasonStartDate: SEASON_26_27_START,
      seasonEndDate: SEASON_26_27_END,
      now,
    });

    await tx.transferWindow.updateMany({
      where: { seasonId: season.id, kind: "SUMMER", status: "SCHEDULED" },
      data: { status: "OPEN", openedAt: now },
    });

    const w = await tx.transferWindow.findUnique({
      where: { seasonId_kind: { seasonId: season.id, kind: "SUMMER" } },
      select: { id: true },
    });

    await tx.careerGroupClock.upsert({
      where: { careerGroupId },
      create: {
        careerGroupId,
        lastSyncAt: now,
        pendingSyncWindowId: w?.id ?? null,
      },
      update: { lastSyncAt: now, pendingSyncWindowId: w?.id ?? null },
    });

    await ensureCalendarState(tx as unknown as PrismaClient, {
      teamId: team.id,
      seasonId: season.id,
      careerGroupId,
      initialDate: SEASON_26_27_START,
    });

    return {
      careerGroupId,
      seasonId: season.id,
      transferWindows: seed.created.map((w) => w.id),
    };
  });
}
