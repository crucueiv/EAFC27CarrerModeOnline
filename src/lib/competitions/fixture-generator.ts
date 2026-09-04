export type GenerateFixturesInput = {
  teamIds: string[];
  seasonId: string;
  careerGroupId: string;
  matchweekIntervalDays: number;
  startDate: Date;
  calendarSpanWeeks: number;
  zones?: Map<string, "A" | "B">;
  classicInterzoneMap?: Map<string, string>;
  interzoneRival?: (teamId: string) => string;
  twoLeggedTiebreakerBy?: "SEED";
};

export type GeneratedFixture = {
  homeTeamId: string;
  awayTeamId: string;
  matchweek: number;
  scheduledAt: Date;
  tournamentStageId: string;
};

export type GenerateFixturesOutput = {
  fixtures: GeneratedFixture[];
  matchweekCount: number;
};

export function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & 0x7fffffff;
  }
  return hash;
}

function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function roundRobinSingleLeg(teams: string[]): Array<Array<[string, string]>> {
  const list = teams.length % 2 === 0 ? [...teams] : [...teams, "BYE"];
  const n = list.length;
  const rounds: Array<Array<[string, string]>> = [];
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
  return rounds;
}

export function generateRoundRobinFixtures(input: GenerateFixturesInput): GenerateFixturesOutput {
  const {
    teamIds,
    seasonId,
    careerGroupId,
    matchweekIntervalDays,
    startDate,
    calendarSpanWeeks,
  } = input;

  if (teamIds.length === 0) {
    return { fixtures: [], matchweekCount: 0 };
  }

  const rng = mulberry32(hashSeed(`${careerGroupId}:${seasonId}`));
  const ordered = shuffle(teamIds, rng);
  const singleLegRounds = roundRobinSingleLeg(ordered);

  const firstLegRounds: Array<Array<[string, string]>> = singleLegRounds.map((round) =>
    round.map(([h, a]) => (rng() < 0.5 ? [h, a] : [a, h])),
  );

  const secondLegRounds: Array<Array<[string, string]>> = firstLegRounds.map((round) =>
    round.map(([h, a]) => [a, h] as [string, string]),
  );

  const totalMatchweeks = firstLegRounds.length + secondLegRounds.length;
  const totalDays = calendarSpanWeeks * 7;
  const daysPerMatchweek = totalDays / totalMatchweeks;

  const fixtures: GeneratedFixture[] = [];
  let matchweekCounter = 0;

  for (const round of firstLegRounds) {
    matchweekCounter++;
    for (const [home, away] of round) {
      const scheduledAt = new Date(startDate);
      scheduledAt.setUTCDate(
        scheduledAt.getUTCDate() + Math.floor((matchweekCounter - 1) * daysPerMatchweek),
      );
      fixtures.push({
        homeTeamId: home,
        awayTeamId: away,
        matchweek: matchweekCounter,
        scheduledAt,
        tournamentStageId: "",
      });
    }
  }

  for (const round of secondLegRounds) {
    matchweekCounter++;
    for (const [home, away] of round) {
      const scheduledAt = new Date(startDate);
      scheduledAt.setUTCDate(
        scheduledAt.getUTCDate() + Math.floor((matchweekCounter - 1) * daysPerMatchweek),
      );
      fixtures.push({
        homeTeamId: home,
        awayTeamId: away,
        matchweek: matchweekCounter,
        scheduledAt,
        tournamentStageId: "",
      });
    }
  }

  if (matchweekIntervalDays > 0) {
    fixtures.sort((a, b) => {
      if (a.matchweek !== b.matchweek) return a.matchweek - b.matchweek;
      return a.scheduledAt.getTime() - b.scheduledAt.getTime();
    });
  }

  return { fixtures, matchweekCount: totalMatchweeks };
}
