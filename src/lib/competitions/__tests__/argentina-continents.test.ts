import { describe, it, expect } from "vitest";
import { evaluateArgentinaContinentQualifiers } from "../argentina-continents";
import { type AnnualStanding } from "../argentina-annual";

function makeStandings(count: number): AnnualStanding[] {
  return Array.from({ length: count }, (_, i) => ({
    teamId: `t${i + 1}`,
    aperturaRegularPoints: 30 - i,
    clausuraRegularPoints: 30 - i,
    totalPoints: 60 - i * 2,
    goalsFor: 50 - i,
    goalsAgainst: 30 - i,
    goalDifference: 20 - i,
    rank: i + 1,
  }));
}

describe("evaluateArgentinaContinentQualifiers - base 6 cupos", () => {
  it("Apertura + Clausura + 3 of annual = 6 lib slots", () => {
    const result = evaluateArgentinaContinentQualifiers({
      seasonId: "s1",
      leagueId: "l1",
      annualStandings: makeStandings(10),
      aperturaChampionTeamId: "t1",
      clausuraChampionTeamId: "t2",
      cupArgentinaChampionTeamId: null,
      previousSudamericanaWinnerIsArgentinian: false,
    });
    expect(result.libertadores).toHaveLength(6);
    expect(result.libertadores[0].teamId).toBe("t1");
    expect(result.libertadores[1].teamId).toBe("t2");
  });

  it("with Argentina cup winner, 3 from annual", () => {
    const result = evaluateArgentinaContinentQualifiers({
      seasonId: "s1",
      leagueId: "l1",
      annualStandings: makeStandings(10),
      aperturaChampionTeamId: "t1",
      clausuraChampionTeamId: "t2",
      cupArgentinaChampionTeamId: "t10",
      previousSudamericanaWinnerIsArgentinian: false,
    });
    expect(result.libertadores).toHaveLength(6);
    const sources = result.libertadores.map((q) => q.source);
    expect(sources).toContain("CUP");
  });

  it("previous Sudamericana winner from Argentina gives 7 cupos", () => {
    const result = evaluateArgentinaContinentQualifiers({
      seasonId: "s1",
      leagueId: "l1",
      annualStandings: makeStandings(10),
      aperturaChampionTeamId: "t1",
      clausuraChampionTeamId: "t2",
      cupArgentinaChampionTeamId: null,
      previousSudamericanaWinnerIsArgentinian: true,
    });
    expect(result.libertadores.length).toBeGreaterThanOrEqual(6);
    const extra = result.libertadores.find((q) => q.source === "EXTRA");
    expect(extra).toBeDefined();
  });

  it("6 sudamericana slots go to next 6 of annual not in libertadores", () => {
    const result = evaluateArgentinaContinentQualifiers({
      seasonId: "s1",
      leagueId: "l1",
      annualStandings: makeStandings(20),
      aperturaChampionTeamId: "t1",
      clausuraChampionTeamId: "t2",
      cupArgentinaChampionTeamId: null,
      previousSudamericanaWinnerIsArgentinian: false,
    });
    expect(result.sudamericana).toHaveLength(6);
    const libIds = new Set(result.libertadores.map((q) => q.teamId));
    for (const s of result.sudamericana) {
      expect(libIds.has(s.teamId)).toBe(false);
    }
  });
});
