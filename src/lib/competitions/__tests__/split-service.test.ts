import { describe, it, expect } from "vitest";
import {
  dividePointsBelgium,
  computeSplitGroupCarryOver,
  type RegularSeasonStanding,
} from "../split-service";
import { getLeagueFormatSpec } from "@/lib/league-formats/catalog";

function makeStandings(teams: Array<{ teamId: string; points: number }>): RegularSeasonStanding[] {
  return teams
    .map((t) => ({ ...t, goalDifference: 0, goalsFor: 0, rank: 0 }))
    .sort((a, b) => b.points - a.points)
    .map((s, idx) => ({ ...s, rank: idx + 1 }));
}

describe("dividePointsBelgium", () => {
  it("rounds up odd numbers (51 -> 26)", () => {
    expect(dividePointsBelgium(51)).toBe(26);
  });

  it("keeps even numbers (50 -> 25)", () => {
    expect(dividePointsBelgium(50)).toBe(25);
  });

  it("handles small numbers (3 -> 2)", () => {
    expect(dividePointsBelgium(3)).toBe(2);
  });
});

describe("computeSplitGroupCarryOver - Belgium (multiplier 0.5)", () => {
  const format = getLeagueFormatSpec("4")!;

  it("divides points by 2 with ceil", () => {
    const standings = makeStandings([
      { teamId: "a", points: 51 },
      { teamId: "b", points: 50 },
      { teamId: "c", points: 49 },
    ]);
    const result = computeSplitGroupCarryOver(standings, format, 3, true);
    expect(result[0].carryOverPoints).toBe(26);
    expect(result[1].carryOverPoints).toBe(25);
    expect(result[2].carryOverPoints).toBe(25);
  });
});

describe("computeSplitGroupCarryOver - K League (cumulative)", () => {
  const format = getLeagueFormatSpec("83")!;

  it("keeps original points (cumulative)", () => {
    const standings = makeStandings([
      { teamId: "a", points: 60 },
      { teamId: "b", points: 55 },
      { teamId: "c", points: 50 },
    ]);
    const result = computeSplitGroupCarryOver(standings, format, 3, true);
    expect(result[0].carryOverPoints).toBe(60);
    expect(result[1].carryOverPoints).toBe(55);
    expect(result[2].carryOverPoints).toBe(50);
  });
});
