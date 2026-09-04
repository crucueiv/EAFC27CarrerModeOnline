import { type LeagueFormatSpec } from "@/lib/league-formats/catalog";
import { getArgentinaClassicRival, splitArgentinaZones } from "./argentina-classics";
import { hashSeed } from "./fixture-generator";

function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export type ArgentinaFixtureInput = {
  teamIds: string[];
  teamNames: Map<string, string>;
  seasonId: string;
  careerGroupId: string;
  startDate: Date;
  calendarSpanWeeks: number;
  matchweekIntervalDays: number;
};

export type ArgentinaFixture = {
  homeTeamId: string;
  awayTeamId: string;
  matchweek: number;
  scheduledAt: Date;
  zone: "A" | "B" | "INTERZONE";
  isClassic: boolean;
  tournamentStageId: string;
};

export type ArgentinaFixtureOutput = {
  fixtures: ArgentinaFixture[];
  zoneA: string[];
  zoneB: string[];
};

function buildIntraZoneRoundRobin(teamIds: string[], seed: number): Array<[string, string][]> {
  if (teamIds.length === 0) return [];
  const rng = mulberry32(seed);
  const list = teamIds.length % 2 === 0 ? [...teamIds] : [...teamIds, "BYE"];
  const n = list.length;
  const rounds: Array<[string, string][]> = [];
  for (let r = 0; r < n - 1; r++) {
    const round: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const home = list[i];
      const away = list[n - 1 - i];
      if (home === "BYE" || away === "BYE") continue;
      round.push([home, away]);
    }
    rounds.push(round);
    const fixed = list[0];
    const rest = list.slice(1);
    rest.push(rest.shift()!);
    list.splice(0, list.length, fixed, ...rest);
  }
  return rounds.map((round) =>
    round.map(([h, a]) => (rng() < 0.5 ? [h, a] : [a, h]) as [string, string]),
  );
}

export function generateArgentinaShortTournamentFixtures(
  input: ArgentinaFixtureInput,
  format: LeagueFormatSpec,
): ArgentinaFixtureOutput {
  const { teamIds, teamNames, seasonId, careerGroupId, startDate, calendarSpanWeeks, matchweekIntervalDays } = input;
  const seed = hashSeed(`${careerGroupId}:${seasonId}:argentina`);
  const { zoneA, zoneB } = splitArgentinaZones(teamIds);
  const intraARounds = buildIntraZoneRoundRobin(zoneA, seed);
  const intraBRounds = buildIntraZoneRoundRobin(zoneB, seed + 1);

  const allRounds: Array<Array<[string, string, "A" | "B"]>> = [];
  for (let i = 0; i < Math.max(intraARounds.length, intraBRounds.length); i++) {
    const round: Array<[string, string, "A" | "B"]> = [];
    if (i < intraARounds.length) {
      for (const [h, a] of intraARounds[i]) round.push([h, a, "A"]);
    }
    if (i < intraBRounds.length) {
      for (const [h, a] of intraBRounds[i]) round.push([h, a, "B"]);
    }
    allRounds.push(round);
  }

  const classicDate = new Date(startDate);
  classicDate.setUTCDate(classicDate.getUTCDate() + 7 * 7);
  const classicFixtures: ArgentinaFixture[] = [];
  for (const teamId of zoneA) {
    const teamName = teamNames.get(teamId) ?? "";
    const rivalName = getArgentinaClassicRival(teamName);
    if (!rivalName) continue;
    const rivalId = teamIds.find((id) => (teamNames.get(id) ?? "").toLowerCase() === rivalName.toLowerCase());
    if (!rivalId) continue;
    if (classicFixtures.some((f) => (f.homeTeamId === teamId && f.awayTeamId === rivalId) || (f.homeTeamId === rivalId && f.awayTeamId === teamId))) {
      continue;
    }
    classicFixtures.push({
      homeTeamId: teamId,
      awayTeamId: rivalId,
      matchweek: 8,
      scheduledAt: classicDate,
      zone: "INTERZONE",
      isClassic: true,
      tournamentStageId: "",
    });
  }

  const totalMatchweeks = allRounds.length + 1;
  const totalDays = calendarSpanWeeks * 7;
  const daysPerMatchweek = totalDays / totalMatchweeks;

  const fixtures: ArgentinaFixture[] = [];
  for (let r = 0; r < allRounds.length; r++) {
    const matchweek = r + 1;
    if (matchweek === 8) continue;
    const scheduledAt = new Date(startDate);
    scheduledAt.setUTCDate(
      scheduledAt.getUTCDate() + Math.floor(r * daysPerMatchweek),
    );
    for (const [home, away, zone] of allRounds[r]) {
      fixtures.push({
        homeTeamId: home,
        awayTeamId: away,
        matchweek,
        scheduledAt,
        zone,
        isClassic: false,
        tournamentStageId: "",
      });
    }
  }
  fixtures.push(...classicFixtures);

  return { fixtures, zoneA, zoneB };
}
