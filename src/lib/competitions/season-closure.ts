import { prisma } from "@/lib/prisma";
import { getLeagueFormatSpec, type LeagueFormatSpec } from "@/lib/league-formats/catalog";
import {
  evaluatePromotion,
  evaluateRelegation,
  type PromotionResult,
  type StandingRow,
} from "./promotion-service";
import { createInterLeagueRelegationTournament } from "./relegation-tournament";
import { clearContinentSpotsCache } from "@/lib/coefficients/resolveContinentSpots";

export type SeasonClosureResult = {
  seasonId: string;
  careerGroupId: string;
  leagueResults: Array<{
    leagueId: string;
    promoted: number;
    relegated: number;
    promotionPlayoffParticipants: number;
    relegationPlayoffParticipants: number;
    interLeagueTournaments: string[];
  }>;
};

async function loadStandingsForLeague(
  leagueId: string,
  seasonId: string,
): Promise<StandingRow[]> {
  if (!prisma) return [];
  const teams = await prisma.team.findMany({
    where: { leagueId },
    select: { id: true },
  });
  const matches = await prisma.match.findMany({
    where: {
      seasonId,
      status: { in: ["COMPLETED", "SIMULATED"] },
      OR: [{ homeTeam: { leagueId } }, { awayTeam: { leagueId } }],
    },
    select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
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
  return Array.from(points.entries())
    .map(([teamId, pts]) => ({ teamId, rank: 0, points: pts }))
    .sort((a, b) => b.points - a.points)
    .map((row, idx) => ({ ...row, rank: idx + 1 }));
}

export async function closeSeason(params: {
  seasonId: string;
  careerGroupId: string;
  options?: { simulateInterLeaguePlayoffs?: boolean };
}): Promise<SeasonClosureResult> {
  if (!prisma) {
    return { seasonId: params.seasonId, careerGroupId: params.careerGroupId, leagueResults: [] };
  }
  const simulateInterLeague = params.options?.simulateInterLeaguePlayoffs ?? false;

  const leagues = await prisma.league.findMany({
    where: { careerGroupId: params.careerGroupId },
    select: { id: true, name: true, eaId: true, higherLeagueId: true },
  });

  const result: SeasonClosureResult = {
    seasonId: params.seasonId,
    careerGroupId: params.careerGroupId,
    leagueResults: [],
  };

  for (const league of leagues) {
    const format = getLeagueFormatSpec(league.eaId);
    if (!format) continue;

    const standings = await loadStandingsForLeague(league.id, params.seasonId);
    const promo = evaluatePromotion(standings, format);
    const releg = evaluateRelegation(standings, format);

    const interLeagueTournaments: string[] = [];
    if (format.relegation?.type === "RELEGATION_PLAYOFF" && league.higherLeagueId) {
      const higher = leagues.find((l) => l.id === league.higherLeagueId);
      if (higher) {
        const upperStandings = await loadStandingsForLeague(league.id, params.seasonId);
        const lowerStandings = await loadStandingsForLeague(higher.id, params.seasonId);
        const t = await createInterLeagueRelegationTournament({
          seasonId: params.seasonId,
          careerGroupId: params.careerGroupId,
          upperLeagueId: league.id,
          upperLeagueName: league.name,
          lowerLeagueId: higher.id,
          lowerLeagueName: higher.name,
          upperStandings,
          lowerStandings,
        });
        if (t) interLeagueTournaments.push(t.tournamentId);
      }
    }

    result.leagueResults.push({
      leagueId: league.id,
      promoted: promo.promoted.length,
      relegated: releg.relegated.length,
      promotionPlayoffParticipants: promo.playoffParticipants.length,
      relegationPlayoffParticipants: releg.playoffParticipants.length,
      interLeagueTournaments,
    });

    if (simulateInterLeague) {
      void simulateInterLeague;
    }
  }

  await prisma.season.update({
    where: { id: params.seasonId },
    data: { status: "COMPLETED" },
  });

  clearContinentSpotsCache();

  return result;
}
