import { describe, it, expect } from "vitest";
import {
  generateArgentinaShortTournamentFixtures,
} from "../argentina-fixtures";
import { LEAGUE_FORMAT_CATALOG } from "@/lib/league-formats/catalog";

describe("generateArgentinaShortTournamentFixtures", () => {
  it("generates 15+15 split", () => {
    const teamIds = Array.from({ length: 30 }, (_, i) => `t${i + 1}`);
    const teamNames = new Map<string, string>(teamIds.map((id) => [id, id]));
    const result = generateArgentinaShortTournamentFixtures({
      teamIds,
      teamNames,
      seasonId: "s1",
      careerGroupId: "c1",
      startDate: new Date("2026-01-01"),
      calendarSpanWeeks: 16,
      matchweekIntervalDays: 7,
    }, LEAGUE_FORMAT_CATALOG.find((f) => f.eaId === "353")!);
    expect(result.zoneA).toHaveLength(15);
    expect(result.zoneB).toHaveLength(15);
  });

  it("is deterministic: same seed produces same zones", () => {
    const teamIds = Array.from({ length: 30 }, (_, i) => `t${i + 1}`);
    const teamNames = new Map<string, string>(teamIds.map((id) => [id, id]));
    const a = generateArgentinaShortTournamentFixtures({
      teamIds,
      teamNames,
      seasonId: "s1",
      careerGroupId: "c1",
      startDate: new Date("2026-01-01"),
      calendarSpanWeeks: 16,
      matchweekIntervalDays: 7,
    }, LEAGUE_FORMAT_CATALOG.find((f) => f.eaId === "353")!);
    const b = generateArgentinaShortTournamentFixtures({
      teamIds,
      teamNames,
      seasonId: "s1",
      careerGroupId: "c1",
      startDate: new Date("2026-01-01"),
      calendarSpanWeeks: 16,
      matchweekIntervalDays: 7,
    }, LEAGUE_FORMAT_CATALOG.find((f) => f.eaId === "353")!);
    expect(a.zoneA).toEqual(b.zoneA);
    expect(a.zoneB).toEqual(b.zoneB);
  });
});
