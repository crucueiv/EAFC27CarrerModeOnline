import { prisma } from "@/lib/prisma";
import { hashSeed } from "@/lib/competitions/fixture-generator";

function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export type CreateCupInput = {
  leagueId: string;
  country: string;
  name: string;
  format: "SINGLE_ELIMINATION" | "TWO_ROUND";
  seasonId: string;
  careerGroupId: string;
  teamIds: string[];
};

export type BracketMatch = {
  round: number;
  position: number;
  homeTeamId: string;
  awayTeamId: string;
  homePlaceholder: boolean;
  awayPlaceholder: boolean;
};

export type CupBracket = {
  tournamentId: string;
  domesticCupId: string;
  roundCount: number;
  matches: BracketMatch[];
};

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function seedBracket(teamIds: string[], seed: number): string[][] {
  const rng = mulberry32(seed);
  const total = nextPowerOfTwo(teamIds.length);
  const slots: (string | null)[] = [...teamIds];
  while (slots.length < total) slots.push(null);

  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const firstRound: string[][] = [];
  for (let i = 0; i < total; i += 2) {
    firstRound.push([slots[i] ?? "BYE", slots[i + 1] ?? "BYE"]);
  }
  const rounds: string[][][] = [firstRound];
  let current = firstRound;
  while (current.length > 1) {
    const next: string[][] = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push([current[i][0] ?? "BYE", current[i + 1]?.[0] ?? "BYE"]);
    }
    rounds.push(next);
    current = next;
  }
  return rounds as unknown as string[][];
}

export async function createDomesticCupWithBracket(input: CreateCupInput): Promise<CupBracket | null> {
  if (!prisma) return null;
  if (input.teamIds.length < 2) return null;

  const cup = await prisma.domesticCup.create({
    data: {
      leagueId: input.leagueId,
      country: input.country,
      name: input.name,
      format: input.format,
    },
  });

  const tournament = await prisma.tournament.create({
    data: {
      name: input.name,
      scope: "DOMESTIC_CUP",
      seasonId: input.seasonId,
      careerGroupId: input.careerGroupId,
      format: input.format,
      domesticCupId: cup.id,
    },
  });

  const seed = hashSeed(`${input.careerGroupId}:${input.seasonId}:${input.name}`);
  const rounds = seedBracket(input.teamIds, seed);
  const bracketMatches: BracketMatch[] = [];

  for (let r = 0; r < rounds.length; r++) {
    const stage = await prisma.tournamentStage.create({
      data: {
        tournamentId: tournament.id,
        name: `Ronda ${r + 1}`,
        type: r === rounds.length - 1 ? "FINAL" : r === rounds.length - 2 ? "SEMI_FINAL" : r === 0 ? "ROUND_OF_32" : "QUARTER_FINAL",
        order: r + 1,
        matchFormat: input.format === "TWO_ROUND" ? "TWO_LEGGED" : "SINGLE",
      },
    });

    for (let p = 0; p < rounds[r].length; p++) {
      const [home, away] = rounds[r][p];
      if (home === "BYE" || away === "BYE") continue;
      const isLast = r === rounds.length - 1;
      await prisma.match.create({
        data: {
          seasonId: input.seasonId,
          tournamentId: tournament.id,
          tournamentStageId: stage.id,
          homeTeamId: home,
          awayTeamId: away,
          scheduledAt: new Date(),
          status: "PENDING",
          mode: "CPU_VS_CPU",
          matchFormat: "SINGLE",
        },
      });
      bracketMatches.push({
        round: r + 1,
        position: p,
        homeTeamId: home,
        awayTeamId: away,
        homePlaceholder: false,
        awayPlaceholder: false,
      });
      void isLast;
    }
  }

  return {
    tournamentId: tournament.id,
    domesticCupId: cup.id,
    roundCount: rounds.length,
    matches: bracketMatches,
  };
}

export async function setCupWinner(params: {
  domesticCupId: string;
  seasonId: string;
  teamId: string;
}): Promise<void> {
  if (!prisma) return;
  await prisma.domesticCupWinner.upsert({
    where: {
      domesticCupId_seasonId: {
        domesticCupId: params.domesticCupId,
        seasonId: params.seasonId,
      },
    },
    update: { teamId: params.teamId },
    create: {
      domesticCupId: params.domesticCupId,
      seasonId: params.seasonId,
      teamId: params.teamId,
    },
  });
}

export async function getCupWinner(params: {
  domesticCupId: string;
  seasonId: string;
}): Promise<{ teamId: string } | null> {
  if (!prisma) return null;
  const w = await prisma.domesticCupWinner.findUnique({
    where: { domesticCupId_seasonId: { domesticCupId: params.domesticCupId, seasonId: params.seasonId } },
  });
  return w ? { teamId: w.teamId } : null;
}
