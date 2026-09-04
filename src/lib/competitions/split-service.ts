import { type LeagueFormatSpec } from "@/lib/league-formats/catalog";

export type RegularSeasonStanding = {
  teamId: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
  rank: number;
};

export type SplitGroupMember = {
  teamId: string;
  carryOverPoints: number;
  upperGroupBonus: number;
};

export function dividePointsBelgium(points: number): number {
  return Math.ceil(points / 2);
}

export function computeSplitGroupCarryOver(
  regularStandings: RegularSeasonStanding[],
  format: LeagueFormatSpec,
  groupSize: number,
  selectTop: boolean,
): SplitGroupMember[] {
  if (!format.splitConfig) {
    throw new Error("Format sin splitConfig");
  }
  const multiplier = format.splitConfig.pointsMultiplier ?? 1;
  const cumulative = format.splitConfig.cumulativePoints ?? false;

  const sorted = [...regularStandings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamId.localeCompare(b.teamId);
  });

  const selected = selectTop ? sorted.slice(0, groupSize) : sorted.slice(-groupSize);
  return selected.map((entry) => {
    const carryOver = cumulative
      ? entry.points
      : multiplier !== 1
        ? Math.ceil(entry.points * multiplier)
        : entry.points;
    return {
      teamId: entry.teamId,
      carryOverPoints: carryOver,
      upperGroupBonus: 0,
    };
  });
}

export function computeSplitGroupBonus(regularStandings: RegularSeasonStanding[]): number {
  return 0;
}
