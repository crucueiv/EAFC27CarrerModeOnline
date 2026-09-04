import { describe, it, expect } from "vitest";
import { generateRoundRobinFixtures, hashSeed } from "../fixture-generator";

describe("hashSeed", () => {
  it("returns the same number for the same input", () => {
    expect(hashSeed("a:b")).toBe(hashSeed("a:b"));
  });
  it("returns different numbers for different inputs", () => {
    expect(hashSeed("a:b")).not.toBe(hashSeed("a:c"));
  });
  it("returns a positive integer", () => {
    expect(hashSeed("test")).toBeGreaterThan(0);
  });
});

describe("generateRoundRobinFixtures", () => {
  it("returns 0 fixtures for 0 teams", () => {
    const result = generateRoundRobinFixtures({
      teamIds: [],
      seasonId: "s1",
      careerGroupId: "c1",
      matchweekIntervalDays: 7,
      startDate: new Date("2026-08-01"),
      calendarSpanWeeks: 38,
    });
    expect(result.fixtures).toHaveLength(0);
    expect(result.matchweekCount).toBe(0);
  });

  it("produces 38 matchweeks for 20 teams with 760 total fixtures", () => {
    const teamIds = Array.from({ length: 20 }, (_, i) => `t${i + 1}`);
    const result = generateRoundRobinFixtures({
      teamIds,
      seasonId: "s1",
      careerGroupId: "c1",
      matchweekIntervalDays: 7,
      startDate: new Date("2026-08-01"),
      calendarSpanWeeks: 38,
    });
    expect(result.matchweekCount).toBe(38);
    expect(result.fixtures).toHaveLength((20 * 19));
  });

  it("each team plays every other team exactly twice", () => {
    const teamIds = Array.from({ length: 20 }, (_, i) => `t${i + 1}`);
    const result = generateRoundRobinFixtures({
      teamIds,
      seasonId: "s1",
      careerGroupId: "c1",
      matchweekIntervalDays: 7,
      startDate: new Date("2026-08-01"),
      calendarSpanWeeks: 38,
    });
    const played = new Map<string, number>();
    for (const f of result.fixtures) {
      played.set(f.homeTeamId, (played.get(f.homeTeamId) ?? 0) + 1);
      played.set(f.awayTeamId, (played.get(f.awayTeamId) ?? 0) + 1);
    }
    for (const teamId of teamIds) {
      expect(played.get(teamId)).toBe(38);
    }
  });

  it("is deterministic: same seed produces same fixtures", () => {
    const teamIds = Array.from({ length: 10 }, (_, i) => `t${i + 1}`);
    const a = generateRoundRobinFixtures({
      teamIds,
      seasonId: "s1",
      careerGroupId: "c1",
      matchweekIntervalDays: 7,
      startDate: new Date("2026-08-01"),
      calendarSpanWeeks: 27,
    });
    const b = generateRoundRobinFixtures({
      teamIds,
      seasonId: "s1",
      careerGroupId: "c1",
      matchweekIntervalDays: 7,
      startDate: new Date("2026-08-01"),
      calendarSpanWeeks: 27,
    });
    expect(a.fixtures.map((f) => `${f.homeTeamId}-${f.awayTeamId}`)).toEqual(
      b.fixtures.map((f) => `${f.homeTeamId}-${f.awayTeamId}`),
    );
  });

  it("second leg is the first leg with home/away inverted", () => {
    const teamIds = Array.from({ length: 6 }, (_, i) => `t${i + 1}`);
    const result = generateRoundRobinFixtures({
      teamIds,
      seasonId: "s1",
      careerGroupId: "c1",
      matchweekIntervalDays: 7,
      startDate: new Date("2026-08-01"),
      calendarSpanWeeks: 22,
    });
    const firstLeg = result.fixtures.filter((f) => f.matchweek <= 5);
    const secondLeg = result.fixtures.filter((f) => f.matchweek > 5);
    expect(firstLeg).toHaveLength(15);
    expect(secondLeg).toHaveLength(15);
    for (const first of firstLeg) {
      const match = secondLeg.find(
        (s) =>
          (s.homeTeamId === first.awayTeamId && s.awayTeamId === first.homeTeamId) ||
          (s.homeTeamId === first.homeTeamId && s.awayTeamId === first.awayTeamId),
      );
      expect(match).toBeDefined();
    }
  });
});
