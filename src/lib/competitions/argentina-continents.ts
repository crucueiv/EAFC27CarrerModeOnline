import { prisma } from "@/lib/prisma";
import { type AnnualStanding } from "./argentina-annual";

export type ArgentinaContinentResult = {
  libertadores: Array<{ teamId: string; source: "APERTURA" | "CLAUSURA" | "ANUAL" | "CUP" | "EXTRA" }>;
  sudamericana: Array<{ teamId: string; source: "ANUAL" }>;
};

export type EvaluateArgentinaContinentInput = {
  seasonId: string;
  leagueId: string;
  annualStandings: AnnualStanding[];
  aperturaChampionTeamId: string | null;
  clausuraChampionTeamId: string | null;
  cupArgentinaChampionTeamId: string | null;
  previousSudamericanaWinnerIsArgentinian: boolean;
};

const BASE_LIBERTADORES = 6;
const BASE_SUDAMERICANA = 6;

function uniqueByTeamId(items: Array<{ teamId: string; source: string }>): typeof items {
  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.teamId)) return false;
    seen.add(i.teamId);
    return true;
  });
}

export function evaluateArgentinaContinentQualifiers(
  input: EvaluateArgentinaContinentInput,
): ArgentinaContinentResult {
  const lib: Array<{ teamId: string; source: "APERTURA" | "CLAUSURA" | "ANUAL" | "CUP" | "EXTRA" }> = [];
  if (input.aperturaChampionTeamId) {
    lib.push({ teamId: input.aperturaChampionTeamId, source: "APERTURA" });
  }
  if (input.clausuraChampionTeamId) {
    lib.push({ teamId: input.clausuraChampionTeamId, source: "CLAUSURA" });
  }
  if (input.cupArgentinaChampionTeamId) {
    lib.push({ teamId: input.cupArgentinaChampionTeamId, source: "CUP" });
  }
  const libSlots: Array<{ teamId: string; source: "APERTURA" | "CLAUSURA" | "ANUAL" | "CUP" | "EXTRA" }> = [];
  for (const item of lib) {
    if (!libSlots.some((q) => q.teamId === item.teamId)) {
      libSlots.push(item);
    }
  }

  const championsTaken = new Set(libSlots.map((q) => q.teamId));
  const remainingLib = BASE_LIBERTADORES - libSlots.length;
  let filledFromAnnual = 0;
  for (const standing of input.annualStandings) {
    if (filledFromAnnual >= remainingLib) break;
    if (championsTaken.has(standing.teamId)) continue;
    libSlots.push({ teamId: standing.teamId, source: "ANUAL" });
    championsTaken.add(standing.teamId);
    filledFromAnnual++;
  }

  if (input.previousSudamericanaWinnerIsArgentinian) {
    for (const standing of input.annualStandings) {
      if (!championsTaken.has(standing.teamId)) {
        libSlots.push({ teamId: standing.teamId, source: "EXTRA" });
        championsTaken.add(standing.teamId);
        break;
      }
    }
  }

  const annualForSudamericana = input.annualStandings.filter(
    (s) => !championsTaken.has(s.teamId),
  );
  const sud = annualForSudamericana.slice(0, BASE_SUDAMERICANA).map((s) => ({
    teamId: s.teamId,
    source: "ANUAL" as const,
  }));

  return { libertadores: libSlots, sudamericana: sud };
}

export async function persistContinentQualifiers(
  result: ArgentinaContinentResult,
  params: { seasonId: string; leagueId: string },
): Promise<void> {
  if (!prisma) return;
  for (const q of result.libertadores) {
    await prisma.trophy.upsert({
      where: {
        seasonId_leagueId_kind_teamId: {
          seasonId: params.seasonId,
          leagueId: params.leagueId,
          kind: "LEAGUE_CHAMPION",
          teamId: q.teamId,
        },
      },
      update: {},
      create: {
        seasonId: params.seasonId,
        leagueId: params.leagueId,
        teamId: q.teamId,
        kind: "LEAGUE_CHAMPION",
        metadata: { source: q.source, target: "LIBERTADORES" },
      },
    });
  }
  for (const q of result.sudamericana) {
    await prisma.trophy.upsert({
      where: {
        seasonId_leagueId_kind_teamId: {
          seasonId: params.seasonId,
          leagueId: params.leagueId,
          kind: "LEAGUE_CHAMPION",
          teamId: q.teamId,
        },
      },
      update: {},
      create: {
        seasonId: params.seasonId,
        leagueId: params.leagueId,
        teamId: q.teamId,
        kind: "LEAGUE_CHAMPION",
        metadata: { source: q.source, target: "SUDAMERICANA" },
      },
    });
  }
}
