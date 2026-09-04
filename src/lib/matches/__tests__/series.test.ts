import { describe, it, expect } from "vitest";
import { computeSeriesStanding } from "../series";

describe("computeSeriesStanding - best of 3", () => {
  it("home wins 2-0 in 2 games", () => {
    const result = computeSeriesStanding(
      [
        { homeScore: 2, awayScore: 1 },
        { homeScore: 1, awayScore: 0 },
        { homeScore: null, awayScore: null },
      ],
      "BEST_OF_3",
    );
    expect(result.homeWins).toBe(2);
    expect(result.awayWins).toBe(0);
    expect(result.winner).toBe("HOME");
    expect(result.isComplete).toBe(true);
  });

  it("away wins 2-1", () => {
    const result = computeSeriesStanding(
      [
        { homeScore: 0, awayScore: 1 },
        { homeScore: 1, awayScore: 0 },
        { homeScore: 0, awayScore: 2 },
      ],
      "BEST_OF_3",
    );
    expect(result.awayWins).toBe(2);
    expect(result.winner).toBe("AWAY");
  });

  it("1-1 after 2 games is incomplete", () => {
    const result = computeSeriesStanding(
      [
        { homeScore: 1, awayScore: 0 },
        { homeScore: 0, awayScore: 1 },
        { homeScore: null, awayScore: null },
      ],
      "BEST_OF_3",
    );
    expect(result.isComplete).toBe(false);
    expect(result.winner).toBeNull();
  });
});

describe("computeSeriesStanding - best of 5", () => {
  it("home needs 3 wins", () => {
    const result = computeSeriesStanding(
      [
        { homeScore: 1, awayScore: 0 },
        { homeScore: 1, awayScore: 0 },
        { homeScore: 1, awayScore: 0 },
        { homeScore: null, awayScore: null },
        { homeScore: null, awayScore: null },
      ],
      "BEST_OF_5",
    );
    expect(result.winner).toBe("HOME");
  });
});
