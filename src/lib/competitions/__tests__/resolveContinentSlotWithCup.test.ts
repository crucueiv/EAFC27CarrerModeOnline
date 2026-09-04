import { describe, it, expect } from "vitest";
import { resolveContinentSlotWithCup } from "../resolveContinentSlotWithCup";

describe("resolveContinentSlotWithCup", () => {
  const standings = [
    { rank: 1, teamId: "t1" },
    { rank: 2, teamId: "t2" },
    { rank: 3, teamId: "t3" },
    { rank: 4, teamId: "t4" },
    { rank: 5, teamId: "t5" },
    { rank: 6, teamId: "t6" },
  ];

  it("returns league rank when no cup winner", () => {
    const result = resolveContinentSlotWithCup({
      leagueStandings: standings,
      cupWinnerTeamId: null,
      slotLeagueRank: 6,
    });
    expect(result.teamId).toBe("t6");
    expect(result.source).toBe("LEAGUE");
  });

  it("returns league rank when cup winner is NOT in league", () => {
    const result = resolveContinentSlotWithCup({
      leagueStandings: standings,
      cupWinnerTeamId: "ext1",
      slotLeagueRank: 6,
    });
    expect(result.teamId).toBe("t6");
    expect(result.source).toBe("LEAGUE");
  });

  it("cup winner at slot in middle, promotes next league team", () => {
    const result = resolveContinentSlotWithCup({
      leagueStandings: standings,
      cupWinnerTeamId: "t3",
      slotLeagueRank: 3,
    });
    expect(result.teamId).toBe("t4");
    expect(result.source).toBe("PROMOTED_LEAGUE");
  });

  it("when cup winner is at last rank, returns cup winner (no league promotion)", () => {
    const result = resolveContinentSlotWithCup({
      leagueStandings: standings,
      cupWinnerTeamId: "t6",
      slotLeagueRank: 6,
    });
    expect(result.teamId).toBe("t6");
    expect(result.source).toBe("CUP");
  });
});
