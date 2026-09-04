import { prisma } from "@/lib/prisma";
import { type MatchFormat } from "@prisma/client";

export type SeriesStanding = {
  homeWins: number;
  awayWins: number;
  totalGames: number;
  winner: "HOME" | "AWAY" | null;
  isComplete: boolean;
};

export function computeSeriesStanding(
  matches: Array<{ homeScore: number | null; awayScore: number | null }>,
  format: MatchFormat,
): SeriesStanding {
  let homeWins = 0;
  let awayWins = 0;
  for (const m of matches) {
    if (m.homeScore === null || m.awayScore === null) continue;
    if (m.homeScore > m.awayScore) homeWins++;
    else if (m.homeScore < m.awayScore) awayWins++;
  }
  const totalGames = matches.length;
  const winsRequired = format === "BEST_OF_3" ? 2 : format === "BEST_OF_5" ? 3 : 1;
  const winner: "HOME" | "AWAY" | null = homeWins >= winsRequired
    ? "HOME"
    : awayWins >= winsRequired
      ? "AWAY"
      : null;
  return {
    homeWins,
    awayWins,
    totalGames,
    winner,
    isComplete: winner !== null,
  };
}

export async function createBestOfSeries(params: {
  seasonId: string;
  tournamentId: string;
  tournamentStageId: string;
  homeTeamId: string;
  awayTeamId: string;
  matchFormat: MatchFormat;
  startDate: Date;
}): Promise<string[]> {
  if (!prisma) return [];
  const totalGames = params.matchFormat === "BEST_OF_3" ? 3 : params.matchFormat === "BEST_OF_5" ? 5 : 1;
  const seriesId = `series-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const matchIds: string[] = [];
  for (let i = 0; i < totalGames; i++) {
    const isFirst = i % 2 === 0;
    const match = await prisma.match.create({
      data: {
        seasonId: params.seasonId,
        tournamentId: params.tournamentId,
        tournamentStageId: params.tournamentStageId,
        homeTeamId: isFirst ? params.homeTeamId : params.awayTeamId,
        awayTeamId: isFirst ? params.awayTeamId : params.homeTeamId,
        scheduledAt: new Date(params.startDate.getTime() + i * 24 * 60 * 60 * 1000),
        status: "PENDING",
        mode: "CPU_VS_CPU",
        matchFormat: "SINGLE",
        seriesId,
        gameNumber: i + 1,
      },
    });
    matchIds.push(match.id);
  }
  return matchIds;
}
