import { describe, it, expect } from "vitest";
import { evaluateColombiaContinentQualifiers } from "../colombia-reclasi";
import { type ReclasiStanding } from "../colombia-reclasi";

function makeStandings(count: number): ReclasiStanding[] {
  return Array.from({ length: count }, (_, i) => ({
    teamId: `t${i + 1}`,
    aperturaPoints: 30 - i,
    clausuraPoints: 30 - i,
    totalPoints: 60 - i * 2,
    goalsFor: 50 - i,
    goalsAgainst: 30 - i,
    goalDifference: 20 - i,
    rank: i + 1,
  }));
}

describe("evaluateColombiaContinentQualifiers", () => {
  it("Apertura + Clausura + 2 reclasi = 4 lib slots", () => {
    const result = evaluateColombiaContinentQualifiers({
      annualStandings: makeStandings(20),
      aperturaChampionTeamId: "t1",
      clausuraChampionTeamId: "t2",
      cupColombiaChampionTeamId: null,
    });
    expect(result.libertadores).toHaveLength(4);
    expect(result.libertadores[0].teamId).toBe("t1");
    expect(result.libertadores[1].teamId).toBe("t2");
  });

  it("with Cup Colombia winner, goes to Sudamericana", () => {
    const result = evaluateColombiaContinentQualifiers({
      annualStandings: makeStandings(20),
      aperturaChampionTeamId: "t1",
      clausuraChampionTeamId: "t2",
      cupColombiaChampionTeamId: "t10",
    });
    const cupInSud = result.sudamericana.find((q) => q.teamId === "t10");
    expect(cupInSud).toBeDefined();
  });

  it("4 sudamericana slots", () => {
    const result = evaluateColombiaContinentQualifiers({
      annualStandings: makeStandings(20),
      aperturaChampionTeamId: "t1",
      clausuraChampionTeamId: "t2",
      cupColombiaChampionTeamId: null,
    });
    expect(result.sudamericana).toHaveLength(4);
  });
});
