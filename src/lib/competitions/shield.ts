import { prisma } from "@/lib/prisma";
import { type TrophyKind } from "@prisma/client";

export type ShieldKind = "SHIELD_MLS" | "SHIELD_ALEAGUE" | "SHIELD_ISL";

export type ShieldResult = {
  shield: ShieldKind;
  winnerTeamId: string;
  winnerName: string;
  points: number;
  matchweek: number;
};

export async function determineSupportersShield(seasonId: string): Promise<ShieldResult | null> {
  if (!prisma) return null;
  const league = await prisma.league.findFirst({
    where: { eaId: "39" },
    select: { id: true, name: true },
  });
  if (!league) return null;

  const teams = await prisma.team.findMany({
    where: { leagueId: league.id },
    select: { id: true, name: true },
  });
  if (teams.length === 0) return null;

  const matches = await prisma.match.findMany({
    where: {
      seasonId,
      status: { in: ["COMPLETED", "SIMULATED"] },
      OR: [{ homeTeam: { leagueId: league.id } }, { awayTeam: { leagueId: league.id } }],
    },
    select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true, scheduledAt: true },
  });

  const points = new Map<string, number>();
  for (const t of teams) points.set(t.id, 0);
  for (const m of matches) {
    if (m.homeScore === null || m.awayScore === null) continue;
    if (m.homeScore > m.awayScore) {
      points.set(m.homeTeamId, (points.get(m.homeTeamId) ?? 0) + 3);
    } else if (m.homeScore < m.awayScore) {
      points.set(m.awayTeamId, (points.get(m.awayTeamId) ?? 0) + 3);
    } else {
      points.set(m.homeTeamId, (points.get(m.homeTeamId) ?? 0) + 1);
      points.set(m.awayTeamId, (points.get(m.awayTeamId) ?? 0) + 1);
    }
  }

  const sorted = Array.from(points.entries()).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;
  const [winnerId, winnerPts] = sorted[0];
  const winner = teams.find((t) => t.id === winnerId);
  if (!winner) return null;

  return {
    shield: "SHIELD_MLS",
    winnerTeamId: winnerId,
    winnerName: winner.name,
    points: winnerPts,
    matchweek: 0,
  };
}

export async function awardShield(params: {
  seasonId: string;
  leagueId: string;
  teamId: string;
  kind: TrophyKind;
}): Promise<void> {
  if (!prisma) return;
  await prisma.trophy.upsert({
    where: {
      seasonId_leagueId_kind_teamId: {
        seasonId: params.seasonId,
        leagueId: params.leagueId,
        kind: params.kind,
        teamId: params.teamId,
      },
    },
    update: {},
    create: {
      seasonId: params.seasonId,
      leagueId: params.leagueId,
      teamId: params.teamId,
      kind: params.kind,
    },
  });
}
