import type { PrismaClient, Prisma } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";

export type SimulatedDateResult =
  | { ok: true; currentDate: Date; maxAllowedDate: Date; teamId: string; seasonId: string }
  | { ok: false; reason: "PRISMA_UNAVAILABLE" | "NO_TEAM" | "NO_CALENDAR_STATE" };

export type GetSimulatedDateInput = {
  userId: string;
  careerGroupId?: string;
  prismaClient?: PrismaClient;
  fallback?: () => Date;
};

export async function getSimulatedCurrentDate(
  input: GetSimulatedDateInput,
): Promise<SimulatedDateResult> {
  const prisma = input.prismaClient ?? defaultPrisma;
  if (!prisma) return { ok: false, reason: "PRISMA_UNAVAILABLE" };

  const teamWhere: Prisma.TeamWhereInput = { managerId: input.userId };
  if (input.careerGroupId) {
    teamWhere.league = { careerGroupId: input.careerGroupId };
  }
  const team = await prisma.team.findFirst({
    where: teamWhere,
    select: { id: true },
  });
  if (!team) return { ok: false, reason: "NO_TEAM" };

  const state = await prisma.teamCalendarState.findFirst({
    where: { teamId: team.id },
    orderBy: { season: { startDate: "desc" } },
    select: { currentDate: true, maxAllowedDate: true, seasonId: true },
  });
  if (!state) return { ok: false, reason: "NO_CALENDAR_STATE" };

  return {
    ok: true,
    currentDate: state.currentDate,
    maxAllowedDate: state.maxAllowedDate,
    teamId: team.id,
    seasonId: state.seasonId,
  };
}

export async function getSimulatedCurrentDateOrThrow(
  input: GetSimulatedDateInput,
): Promise<Date> {
  const res = await getSimulatedCurrentDate(input);
  if (res.ok) return res.currentDate;
  if (input.fallback) return input.fallback();
  throw new Error(`Cannot resolve simulated current date: ${res.reason}`);
}
