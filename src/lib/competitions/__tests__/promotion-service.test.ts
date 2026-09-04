import { describe, it, expect } from "vitest";
import { getLeagueFormatSpec } from "@/lib/league-formats/catalog";
import {
  evaluatePromotion,
  evaluateRelegation,
  type StandingRow,
} from "../promotion-service";

function makeStandings(teamCount: number): StandingRow[] {
  return Array.from({ length: teamCount }, (_, i) => ({
    teamId: `t${i + 1}`,
    rank: i + 1,
    points: (teamCount - i) * 3,
  }));
}

describe("evaluatePromotion - EFL Championship", () => {
  const format = getLeagueFormatSpec("14")!;
  const standings = makeStandings(24);

  it("1st and 2nd are DIRECT", () => {
    const result = evaluatePromotion(standings, format);
    expect(result.promoted).toHaveLength(2);
    expect(result.promoted[0].teamId).toBe("t1");
    expect(result.promoted[1].teamId).toBe("t2");
  });

  it("3rd-6th are playoff participants", () => {
    const result = evaluatePromotion(standings, format);
    expect(result.playoffParticipants).toEqual(["t3", "t4", "t5", "t6"]);
  });
});

describe("evaluatePromotion - EFL League Two (3 direct)", () => {
  const format = getLeagueFormatSpec("61")!;
  const standings = makeStandings(24);

  it("1st-3rd are DIRECT", () => {
    const result = evaluatePromotion(standings, format);
    expect(result.promoted).toHaveLength(3);
    expect(result.promoted.map((p) => p.teamId)).toEqual(["t1", "t2", "t3"]);
  });

  it("4th-7th are playoff participants", () => {
    const result = evaluatePromotion(standings, format);
    expect(result.playoffParticipants).toEqual(["t4", "t5", "t6", "t7"]);
  });
});

describe("evaluatePromotion - Premier League (no promotion)", () => {
  const format = getLeagueFormatSpec("13")!;
  const standings = makeStandings(20);

  it("no promotions", () => {
    const result = evaluatePromotion(standings, format);
    expect(result.promoted).toHaveLength(0);
    expect(result.playoffParticipants).toHaveLength(0);
  });
});

describe("evaluateRelegation - Premier League", () => {
  const format = getLeagueFormatSpec("13")!;
  const standings = makeStandings(20);

  it("last 3 are DIRECT relegation", () => {
    const result = evaluateRelegation(standings, format);
    expect(result.relegated).toHaveLength(3);
    expect(result.relegated.map((r) => r.teamId)).toEqual(["t18", "t19", "t20"]);
  });

  it("no playoff participants", () => {
    const result = evaluateRelegation(standings, format);
    expect(result.playoffParticipants).toHaveLength(0);
  });
});

describe("evaluateRelegation - Bundesliga (16th playoff, 17-18 direct)", () => {
  const format = getLeagueFormatSpec("19")!;
  const standings = makeStandings(18);

  it("16th is playoff participant", () => {
    const result = evaluateRelegation(standings, format);
    expect(result.playoffParticipants).toEqual(["t16"]);
  });

  it("17th and 18th are direct relegation", () => {
    const result = evaluateRelegation(standings, format);
    expect(result.relegated).toHaveLength(2);
    expect(result.relegated.map((r) => r.teamId)).toEqual(["t17", "t18"]);
  });
});

describe("evaluateRelegation - Bundesliga 2 (16th playoff, 17-18 direct)", () => {
  const format = getLeagueFormatSpec("20")!;
  const standings = makeStandings(18);

  it("16th is playoff participant", () => {
    const result = evaluateRelegation(standings, format);
    expect(result.playoffParticipants).toEqual(["t16"]);
  });

  it("17th and 18th are direct relegation", () => {
    const result = evaluateRelegation(standings, format);
    expect(result.relegated).toHaveLength(2);
    expect(result.relegated.map((r) => r.teamId)).toEqual(["t17", "t18"]);
  });
});

describe("evaluateRelegation - Argentinian League (no relegation)", () => {
  const format = getLeagueFormatSpec("353")!;
  const standings = makeStandings(30);

  it("no relegation", () => {
    const result = evaluateRelegation(standings, format);
    expect(result.relegated).toHaveLength(0);
  });
});
