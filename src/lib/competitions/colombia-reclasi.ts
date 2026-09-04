import { prisma } from "@/lib/prisma";

export type ReclasiStanding = {
  teamId: string;
  aperturaPoints: number;
  clausuraPoints: number;
  totalPoints: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  rank: number;
};

export async function getReclasiStandings(
  seasonId: string,
  leagueId: string,
  aperturaTournamentId: string,
  clausuraTournamentId: string,
): Promise<ReclasiStanding[]> {
  if (!prisma) return [];
  const teams = await prisma.team.findMany({ where: { leagueId }, select: { id: true } });
  const aperturaPoints = new Map<string, number>();
  const clausuraPoints = new Map<string, number>();
  const gf = new Map<string, number>();
  const ga = new Map<string, number>();
  for (const t of teams) {
    aperturaPoints.set(t.id, 0);
    clausuraPoints.set(t.id, 0);
    gf.set(t.id, 0);
    ga.set(t.id, 0);
  }

  const matches = await prisma.match.findMany({
    where: {
      seasonId,
      tournamentId: { in: [aperturaTournamentId, clausuraTournamentId] },
      status: { in: ["COMPLETED", "SIMULATED"] },
    },
    select: { tournamentId: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
  });

  for (const m of matches) {
    if (m.homeScore === null || m.awayScore === null) continue;
    const target = m.tournamentId === aperturaTournamentId ? aperturaPoints : clausuraPoints;
    if (m.homeScore > m.awayScore) {
      target.set(m.homeTeamId, (target.get(m.homeTeamId) ?? 0) + 3);
    } else if (m.homeScore < m.awayScore) {
      target.set(m.awayTeamId, (target.get(m.awayTeamId) ?? 0) + 3);
    } else {
      target.set(m.homeTeamId, (target.get(m.homeTeamId) ?? 0) + 1);
      target.set(m.awayTeamId, (target.get(m.awayTeamId) ?? 0) + 1);
    }
    gf.set(m.homeTeamId, (gf.get(m.homeTeamId) ?? 0) + m.homeScore);
    ga.set(m.homeTeamId, (ga.get(m.homeTeamId) ?? 0) + m.awayScore);
    gf.set(m.awayTeamId, (gf.get(m.awayTeamId) ?? 0) + m.awayScore);
    ga.set(m.awayTeamId, (ga.get(m.awayTeamId) ?? 0) + m.homeScore);
  }

  return teams
    .map((t): ReclasiStanding => ({
      teamId: t.id,
      aperturaPoints: aperturaPoints.get(t.id) ?? 0,
      clausuraPoints: clausuraPoints.get(t.id) ?? 0,
      totalPoints: (aperturaPoints.get(t.id) ?? 0) + (clausuraPoints.get(t.id) ?? 0),
      goalsFor: gf.get(t.id) ?? 0,
      goalsAgainst: ga.get(t.id) ?? 0,
      goalDifference: (gf.get(t.id) ?? 0) - (ga.get(t.id) ?? 0),
      rank: 0,
    }))
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.teamId.localeCompare(b.teamId);
    })
    .map((s, idx) => ({ ...s, rank: idx + 1 }));
}

export function evaluateColombiaContinentQualifiers(params: {
  annualStandings: ReclasiStanding[];
  aperturaChampionTeamId: string | null;
  clausuraChampionTeamId: string | null;
  cupColombiaChampionTeamId: string | null;
}): {
  libertadores: Array<{ teamId: string; source: string }>;
  sudamericana: Array<{ teamId: string; source: string }>;
} {
  const lib: Array<{ teamId: string; source: string }> = [];
  if (params.aperturaChampionTeamId) lib.push({ teamId: params.aperturaChampionTeamId, source: "APERTURA" });
  if (params.clausuraChampionTeamId) lib.push({ teamId: params.clausuraChampionTeamId, source: "CLAUSURA" });

  const libTaken = new Set(lib.map((q) => q.teamId));
  const reclasiForLib = params.annualStandings.filter((s) => !libTaken.has(s.teamId));
  for (let i = 0; i < Math.min(2, reclasiForLib.length); i++) {
    lib.push({ teamId: reclasiForLib[i].teamId, source: "RECLASI" });
  }

  const libFinalTaken = new Set(lib.map((q) => q.teamId));
  const reclasiForSud = params.annualStandings.filter((s) => !libFinalTaken.has(s.teamId));
  if (params.cupColombiaChampionTeamId && !libFinalTaken.has(params.cupColombiaChampionTeamId)) {
    reclasiForSud.unshift({
      teamId: params.cupColombiaChampionTeamId,
      aperturaPoints: 0,
      clausuraPoints: 0,
      totalPoints: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      rank: 0,
    });
  }
  const sud = reclasiForSud.slice(0, 4).map((s) => ({ teamId: s.teamId, source: "RECLASI" }));

  return { libertadores: lib, sudamericana: sud };
}
