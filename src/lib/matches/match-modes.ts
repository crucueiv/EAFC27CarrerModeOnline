import { prisma } from "@/lib/prisma";
import type { MatchMode } from "@prisma/client";

export async function determineMatchMode(
  homeTeamId: string,
  awayTeamId: string,
): Promise<MatchMode> {
  if (!prisma) return "CPU_VS_CPU";
  const [home, away] = await Promise.all([
    prisma.team.findUnique({ where: { id: homeTeamId }, select: { managerId: true } }),
    prisma.team.findUnique({ where: { id: awayTeamId }, select: { managerId: true } }),
  ]);
  if (!home || !away) return "CPU_VS_CPU";
  if (home.managerId && away.managerId) return "PLAYER_VS_PLAYER";
  if (home.managerId || away.managerId) return "PLAYER_VS_CPU";
  return "CPU_VS_CPU";
}

export type MatchResolution = {
  matchId: string;
  mode: MatchMode;
  homeConfirmed: boolean;
  awayConfirmed: boolean;
  isFullyConfirmed: boolean;
  needsResolution: boolean;
};

export async function getMatchResolutionStatus(matchId: string): Promise<MatchResolution | null> {
  if (!prisma) return null;
  const m = await prisma.match.findUnique({
    where: { id: matchId },
    select: { mode: true, homeConfirmed: true, awayConfirmed: true, homeTeamId: true, awayTeamId: true },
  });
  if (!m) return null;
  const needsResolution = m.mode !== "CPU_VS_CPU";
  return {
    matchId,
    mode: m.mode,
    homeConfirmed: m.homeConfirmed,
    awayConfirmed: m.awayConfirmed,
    isFullyConfirmed: m.homeConfirmed && m.awayConfirmed,
    needsResolution,
  };
}

export async function applyCpuVsCpuResult(params: {
  matchId: string;
  homeScore: number;
  awayScore: number;
  wentToExtraTime?: boolean;
  wentToPenalties?: boolean;
  penaltyHomeScore?: number | null;
  penaltyAwayScore?: number | null;
}): Promise<void> {
  if (!prisma) return;
  await prisma.match.update({
    where: { id: params.matchId },
    data: {
      homeScore: params.homeScore,
      awayScore: params.awayScore,
      wentToExtraTime: params.wentToExtraTime ?? false,
      wentToPenalties: params.wentToPenalties ?? false,
      penaltyHomeScore: params.penaltyHomeScore ?? null,
      penaltyAwayScore: params.penaltyAwayScore ?? null,
      status: "SIMULATED",
    },
  });
}

export async function submitPlayerResult(params: {
  matchId: string;
  userId: string;
  homeScore: number;
  awayScore: number;
}): Promise<{ ok: boolean; error?: string }> {
  if (!prisma) return { ok: false, error: "no_db" };
  const m = await prisma.match.findUnique({
    where: { id: params.matchId },
    select: { homeTeamId: true, awayTeamId: true, mode: true, homeConfirmed: true, awayConfirmed: true },
  });
  if (!m) return { ok: false, error: "not_found" };
  if (m.mode === "CPU_VS_CPU") return { ok: false, error: "not_player_match" };

  const team = await prisma.team.findFirst({
    where: { id: { in: [m.homeTeamId, m.awayTeamId] }, managerId: params.userId },
    select: { id: true },
  });
  if (!team) return { ok: false, error: "not_authorized" };

  const isHome = team.id === m.homeTeamId;
  const isAway = team.id === m.awayTeamId;

  await prisma.match.update({
    where: { id: params.matchId },
    data: {
      homeScore: params.homeScore,
      awayScore: params.awayScore,
      homeConfirmed: isHome ? true : m.homeConfirmed,
      awayConfirmed: isAway ? true : m.awayConfirmed,
      playerInputById: params.userId,
      playerInputAt: new Date(),
    },
  });

  const updated = await prisma.match.findUnique({
    where: { id: params.matchId },
    select: { homeConfirmed: true, awayConfirmed: true },
  });
  if (updated?.homeConfirmed && updated?.awayConfirmed) {
    await prisma.match.update({
      where: { id: params.matchId },
      data: { status: "COMPLETED" },
    });
  }
  return { ok: true };
}

export async function confirmPlayerResult(params: {
  matchId: string;
  userId: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!prisma) return { ok: false, error: "no_db" };
  const m = await prisma.match.findUnique({
    where: { id: params.matchId },
    select: { homeTeamId: true, awayTeamId: true, mode: true, homeScore: true, awayScore: true },
  });
  if (!m) return { ok: false, error: "not_found" };
  if (m.homeScore === null || m.awayScore === null) {
    return { ok: false, error: "no_score_submitted" };
  }

  const team = await prisma.team.findFirst({
    where: { id: { in: [m.homeTeamId, m.awayTeamId] }, managerId: params.userId },
    select: { id: true },
  });
  if (!team) return { ok: false, error: "not_authorized" };

  const isHome = team.id === m.homeTeamId;
  await prisma.match.update({
    where: { id: params.matchId },
    data: {
      homeConfirmed: isHome ? true : undefined,
      awayConfirmed: !isHome ? true : undefined,
      confirmedById: params.userId,
    },
  });
  return { ok: true };
}
