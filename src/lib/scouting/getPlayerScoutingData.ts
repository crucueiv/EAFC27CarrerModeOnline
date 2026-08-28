import { prisma } from "@/lib/prisma";

export type PositionPercentage = {
  position: string;
  percentage: number;
};

export type PlayerScoutingData = {
  hasData: boolean;
  matchesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  positionPercentages: PositionPercentage[];
};

export async function getPlayerScoutingData(playerId: string): Promise<PlayerScoutingData> {
  if (!prisma) {
    return {
      hasData: false,
      matchesPlayed: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      positionPercentages: []
    };
  }

  try {
    const stats = await prisma.matchStat.findMany({
      where: { playerId },
      take: 7,
      orderBy: {
        match: { scheduledAt: "desc" }
      },
      include: {
        player: {
          select: { position: true }
        }
      }
    });

    if (!stats || stats.length === 0) {
      return {
        hasData: false,
        matchesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        positionPercentages: []
      };
    }

    let totalGoals = 0;
    let totalAssists = 0;
    let totalYellows = 0;
    let totalReds = 0;
    const positionCounts: Record<string, number> = {};

    for (const stat of stats) {
      totalGoals += stat.goals;
      totalAssists += stat.assists;
      totalYellows += stat.yellowCards;
      totalReds += stat.redCards;

      const pos = stat.positionPlayed || stat.player.position || "ND";
      positionCounts[pos] = (positionCounts[pos] ?? 0) + 1;
    }

    const totalMatches = stats.length;
    const positionPercentages: PositionPercentage[] = Object.entries(positionCounts)
      .map(([pos, count]) => ({
        position: pos.toUpperCase(),
        percentage: Math.round((count / totalMatches) * 100)
      }))
      .sort((a, b) => b.percentage - a.percentage);

    return {
      hasData: true,
      matchesPlayed: totalMatches,
      goals: totalGoals,
      assists: totalAssists,
      yellowCards: totalYellows,
      redCards: totalReds,
      positionPercentages
    };
  } catch (error) {
    console.error("Failed to fetch scouting data:", error);
    return {
      hasData: false,
      matchesPlayed: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      positionPercentages: []
    };
  }
}
