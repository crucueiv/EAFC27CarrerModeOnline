import { prisma } from "@/lib/prisma";
import { type LeagueFormatSpec } from "@/lib/league-formats/catalog";

export type StandingRow = {
  teamId: string;
  rank: number;
  points: number;
};

export type PromotionResult = {
  leagueId: string;
  seasonId: string;
  promoted: Array<{ teamId: string; kind: "DIRECT" | "PLAYOFF" }>;
  relegated: Array<{ teamId: string; kind: "DIRECT" | "PLAYOFF" }>;
  promotionPlayoffParticipants: string[];
  relegationPlayoffParticipants: string[];
};

export function evaluatePromotion(standings: StandingRow[], format: LeagueFormatSpec): {
  promoted: Array<{ teamId: string; kind: "DIRECT" | "PLAYOFF" }>;
  playoffParticipants: string[];
} {
  if (!format.promotion || format.promotion.type === "NONE") {
    return { promoted: [], playoffParticipants: [] };
  }
  if (format.promotion.type !== "DIRECT") {
    return { promoted: [], playoffParticipants: [] };
  }
  const directSlots = 1 + format.promotion.slots;
  const promoted = standings
    .filter((s) => s.rank >= 1 && s.rank <= directSlots)
    .map((s) => ({ teamId: s.teamId, kind: "DIRECT" as const }));

  const playoffStart = format.promotion.playoffTopN ?? directSlots + 1;
  const playoffCount = format.promotion.playoffSlots ?? 0;
  const playoffEnd = playoffStart + playoffCount - 1;
  const playoffParticipants = standings
    .filter((s) => s.rank >= playoffStart && s.rank <= playoffEnd)
    .map((s) => s.teamId);

  return { promoted, playoffParticipants };
}

export function evaluateRelegation(
  standings: StandingRow[],
  format: LeagueFormatSpec,
): {
  relegated: Array<{ teamId: string; kind: "DIRECT" | "PLAYOFF" }>;
  playoffParticipants: string[];
} {
  if (!format.relegation || format.relegation.type === "NONE") {
    return { relegated: [], playoffParticipants: [] };
  }

  const totalTeams = standings.length;
  const relSlots = format.relegation.slots;
  const relStart = totalTeams - relSlots + 1;
  const relegated = standings
    .filter((s) => s.rank >= relStart)
    .map((s) => ({ teamId: s.teamId, kind: "DIRECT" as const }));

  let playoffParticipants: string[] = [];
  if (
    (format.relegation.type === "RELEGATION_PLAYOFF" || format.relegation.type === "PLAYOUT") &&
    format.relegation.playoffSlots &&
    format.relegation.playoffBottomN
  ) {
    const playoffStart = format.relegation.playoffBottomN;
    const playoffEnd = relStart - 1;
    playoffParticipants = standings
      .filter((s) => s.rank >= playoffStart && s.rank <= playoffEnd)
      .map((s) => s.teamId);
  }

  return { relegated, playoffParticipants };
}

export async function applyPromotion(
  leagueId: string,
  seasonId: string,
  result: PromotionResult,
  higherLeagueId: string | null,
): Promise<void> {
  if (!prisma || !higherLeagueId) return;
  for (const p of result.promoted) {
    await prisma.team.update({
      where: { id: p.teamId },
      data: { leagueId: higherLeagueId },
    });
  }
}

export async function applyRelegation(
  leagueId: string,
  seasonId: string,
  result: PromotionResult,
  lowerLeagueIds: string[],
): Promise<void> {
  if (!prisma || lowerLeagueIds.length === 0) return;
  for (let i = 0; i < result.relegated.length; i++) {
    const rel = result.relegated[i];
    const targetLeague = lowerLeagueIds[i % lowerLeagueIds.length];
    if (targetLeague) {
      await prisma.team.update({
        where: { id: rel.teamId },
        data: { leagueId: targetLeague },
      });
    }
  }
}
