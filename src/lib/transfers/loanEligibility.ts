import { prisma } from "@/lib/prisma";

export type LoanEligibilityResult = {
  eligible: boolean;
  reason?: string;
  teamAverageOverall: number;
  playerOverall: number;
};

export async function getTeamAverageOverall(teamId: string): Promise<number> {
  if (!prisma) return 0;
  const rosters = await prisma.roster.findMany({
    where: { teamId, isActive: true },
    select: { player: { select: { overall: true } } },
  });
  if (rosters.length === 0) return 0;
  const sum = rosters.reduce((acc, r) => acc + (r.player?.overall ?? 0), 0);
  return Math.round(sum / rosters.length);
}

export async function canPlayerBeLoanedOut(
  playerId: string,
  teamId: string,
): Promise<LoanEligibilityResult> {
  if (!prisma) {
    return {
      eligible: false,
      reason: "Prisma no disponible",
      teamAverageOverall: 0,
      playerOverall: 0,
    };
  }
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { overall: true },
  });
  if (!player) {
    return {
      eligible: false,
      reason: "Jugador no encontrado",
      teamAverageOverall: 0,
      playerOverall: 0,
    };
  }
  const teamAverageOverall = await getTeamAverageOverall(teamId);

  if (teamAverageOverall === 0) {
    return {
      eligible: false,
      reason: "El equipo no tiene jugadores activos",
      teamAverageOverall: 0,
      playerOverall: player.overall,
    };
  }

  if (player.overall >= teamAverageOverall) {
    return {
      eligible: false,
      reason: `El jugador (${player.overall}) está por encima o igual a la media del equipo (${teamAverageOverall})`,
      teamAverageOverall,
      playerOverall: player.overall,
    };
  }

  return {
    eligible: true,
    teamAverageOverall,
    playerOverall: player.overall,
  };
}
