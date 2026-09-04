import { prisma } from "@/lib/prisma";
import { type StandingRow } from "./promotion-service";

export type RelegationPlayoff = {
  tournamentId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeLeagueId: string;
  awayLeagueId: string;
};

export async function createInterLeagueRelegationTournament(params: {
  seasonId: string;
  careerGroupId: string;
  upperLeagueId: string;
  upperLeagueName: string;
  lowerLeagueId: string;
  lowerLeagueName: string;
  upperStandings: StandingRow[];
  lowerStandings: StandingRow[];
}): Promise<RelegationPlayoff | null> {
  if (!prisma) return null;

  const upperLast = params.upperStandings[params.upperStandings.length - 1];
  const lowerThird = params.lowerStandings[2];
  if (!upperLast || !lowerThird) return null;

  const tournament = await prisma.tournament.create({
    data: {
      name: `${params.upperLeagueName} Relegation ${params.lowerLeagueName}`,
      scope: "INTER_LEAGUE_PLAYOFF",
      seasonId: params.seasonId,
      careerGroupId: params.careerGroupId,
      format: "TWO_LEGGED",
    },
  });

  const stage = await prisma.tournamentStage.create({
    data: {
      tournamentId: tournament.id,
      name: "Relegation Final",
      type: "FINAL",
      order: 1,
      matchFormat: "TWO_LEGGED",
    },
  });

  const firstLeg = await prisma.match.create({
    data: {
      seasonId: params.seasonId,
      tournamentId: tournament.id,
      tournamentStageId: stage.id,
      homeTeamId: lowerThird.teamId,
      awayTeamId: upperLast.teamId,
      scheduledAt: new Date(),
      status: "PENDING",
      mode: "CPU_VS_CPU",
      matchFormat: "SINGLE",
      matchweek: 1,
    },
  });

  await prisma.match.create({
    data: {
      seasonId: params.seasonId,
      tournamentId: tournament.id,
      tournamentStageId: stage.id,
      homeTeamId: upperLast.teamId,
      awayTeamId: lowerThird.teamId,
      scheduledAt: new Date(),
      status: "PENDING",
      mode: "CPU_VS_CPU",
      matchFormat: "SINGLE",
      matchweek: 2,
    },
  });

  return {
    tournamentId: tournament.id,
    homeTeamId: lowerThird.teamId,
    awayTeamId: upperLast.teamId,
    homeLeagueId: params.lowerLeagueId,
    awayLeagueId: params.upperLeagueId,
  };
}
