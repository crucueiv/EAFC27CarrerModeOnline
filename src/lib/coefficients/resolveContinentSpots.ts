import { prisma } from "@/lib/prisma";
import { type LeagueFormatSpec } from "@/lib/league-formats/catalog";
import {
  getUefaAllocation,
  type UefaAllocation,
} from "@/lib/coefficients/uefa-defaults";
import { getConmebolAllocation, type ConmebolAllocation } from "@/lib/coefficients/conmebol-defaults";

export type ContinentSpots = {
  championsDirect: number;
  championsQualifying: number;
  championsPlayoffSlots: number;
  europa: number;
  conference: number;
  libertadoresDirect: number;
  libertadoresQualifying: number;
  sudamericana: number;
  extraFromSudamericanaWinner: boolean;
  usesReclasiTable: boolean;
};

type CacheEntry = {
  value: ContinentSpots;
  expiresAt: number;
};

const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 30 * 1000;

function cacheKey(leagueId: string, seasonId: string): string {
  return `${leagueId}:${seasonId}`;
}

export function clearContinentSpotsCache(): void {
  CACHE.clear();
}

function isAllZeroSpots(spots: ContinentSpots): boolean {
  return (
    spots.championsDirect === 0 &&
    spots.championsQualifying === 0 &&
    spots.championsPlayoffSlots === 0 &&
    spots.europa === 0 &&
    spots.conference === 0 &&
    spots.libertadoresDirect === 0 &&
    spots.libertadoresQualifying === 0 &&
    spots.sudamericana === 0
  );
}

export async function resolveContinentSpots(
  league: { id: string; country: string },
  season: { id: string },
  format: LeagueFormatSpec,
): Promise<ContinentSpots> {
  const key = cacheKey(league.id, season.id);
  const now = Date.now();
  const cached = CACHE.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = await computeContinentSpots(league, season, format);
  CACHE.set(key, { value, expiresAt: now + TTL_MS });
  return value;
}

async function computeContinentSpots(
  league: { id: string; country: string },
  season: { id: string },
  format: LeagueFormatSpec,
): Promise<ContinentSpots> {
  const persisted = await loadPersistedConfig(league.id, season.id);
  if (persisted && !isAllZeroSpots(persisted)) {
    return persisted;
  }

  const uefa = getUefaAllocation(league.country);
  const conmebol = getConmebolAllocation(league.country);

  return {
    championsDirect: uefa?.championsDirect ?? 0,
    championsQualifying: uefa?.championsQualifying ?? 0,
    championsPlayoffSlots: uefa?.championsPlayoffSlots ?? 0,
    europa: uefa?.europa ?? 0,
    conference: uefa?.conference ?? 0,
    libertadoresDirect: conmebol?.libertadoresDirect ?? 0,
    libertadoresQualifying: conmebol?.libertadoresQualifying ?? 0,
    sudamericana: conmebol?.sudamericana ?? 0,
    extraFromSudamericanaWinner: conmebol?.extraFromSudamericanaWinner ?? false,
    usesReclasiTable: format.usesReclasiTable ?? false,
  };
}

async function loadPersistedConfig(
  leagueId: string,
  seasonId: string,
): Promise<ContinentSpots | null> {
  if (!prisma) return null;
  const config = await prisma.leagueSeasonConfig.findUnique({
    where: { leagueId_seasonId: { leagueId, seasonId } },
  });
  if (!config) return null;
  return {
    championsDirect: config.championsSpots,
    championsQualifying: config.championsQualifyingSpots,
    championsPlayoffSlots: config.championsPlayoffSlots ?? 0,
    europa: config.europaSpots,
    conference: config.conferenceSpots,
    libertadoresDirect: config.libertadoresDirectSpots,
    libertadoresQualifying: config.libertadoresQualifyingSpots,
    sudamericana: config.sudamericanaSpots,
    extraFromSudamericanaWinner: config.extraFromSudamericanaWinner,
    usesReclasiTable: config.usesReclasiTable,
  };
}
