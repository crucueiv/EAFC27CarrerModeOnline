import type { PrismaClient } from "@prisma/client";
import { fetchEaRatings, type EaRatingRecord } from "@/lib/ratings/eaClient";
import { normalizeSearchText } from "@/lib/search/normalize";
import { getContinent } from "@/lib/constants/continents";

const PAGE_SIZE = 100;
const DEFAULT_MAX_PLAYERS = 1_000_000;

const TEAM_API_SPORTS_URL =
  "https://res.cloudinary.com/oiugg8m6/raw/upload/v1788132605/dkrnnw4djtjuld0qe05u.json";

function shortName(name: string): string {
  const compact = name.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "").trim();
  return compact.slice(0, 5).toUpperCase() || "TEAM";
}

function reputationFromOverall(overall: number): number {
  if (overall >= 90) return 5;
  if (overall >= 85) return 4;
  if (overall >= 80) return 3;
  if (overall >= 70) return 2;
  return 1;
}

type CloudinaryTeam = {
  eaId: string;
  apiSportsId: number;
};

export async function fetchTeamApiSportsMap(): Promise<Map<string, number>> {
  try {
    const res = await fetch(TEAM_API_SPORTS_URL, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`[fetchTeamApiSportsMap] failed to fetch Cloudinary JSON: HTTP ${res.status}`);
      return new Map();
    }
    const data = (await res.json()) as CloudinaryTeam[];
    const map = new Map<string, number>();
    for (const entry of data) {
      if (entry.eaId && entry.apiSportsId) {
        map.set(String(entry.eaId), entry.apiSportsId);
      }
    }
    console.log(`[fetchTeamApiSportsMap] loaded ${map.size} team apiSportsId mappings`);
    return map;
  } catch (err) {
    console.warn("[fetchTeamApiSportsMap] error fetching Cloudinary JSON:", err);
    return new Map();
  }
}

export async function upsertEaRecords(
  database: PrismaClient,
  records: readonly EaRatingRecord[],
  apiSportsMap?: Map<string, number>
) {
  return database.$transaction(async (transaction) => {
    let players = 0;
    let teams = 0;
    let leagues = 0;
    let countries = 0;
    let rosters = 0;

    for (const record of records) {
      if (record.gender !== "MALE") continue;
      let leagueId: string | undefined;
      if (record.league) {
        const league = await transaction.league.upsert({
          where: { eaId: record.league.id },
          update: {
            name: record.league.name,
            normalizedName: normalizeSearchText(record.league.name),
            imageUrl: record.league.imageUrl
          },
          create: {
            eaId: record.league.id,
            name: record.league.name,
            normalizedName: normalizeSearchText(record.league.name),
            country: "Internacional",
            continent: "Europe",
            imageUrl: record.league.imageUrl
          }
        });
        leagueId = league.id;
        leagues += 1;
      }

      let countryId: string | undefined;
      if (record.nationality) {
        const country = await transaction.country.upsert({
          where: { eaId: record.nationality.id },
          update: {
            name: record.nationality.name,
            normalizedName: normalizeSearchText(record.nationality.name),
            flagUrl: record.nationality.imageUrl
          },
          create: {
            eaId: record.nationality.id,
            name: record.nationality.name,
            normalizedName: normalizeSearchText(record.nationality.name),
            flagUrl: record.nationality.imageUrl
          }
        });
        countryId = country.id;
        countries += 1;
      }

      let teamId: string | undefined;
      if (record.team) {
        const cloudinaryApiSportsId = apiSportsMap?.get(record.team.id);
        const team = await transaction.team.upsert({
          where: { eaId: record.team.id },
          update: {
            name: record.team.name,
            normalizedName: normalizeSearchText(record.team.name),
            shortName: shortName(record.team.name),
            imageUrl: record.team.imageUrl,
            ...(leagueId ? { leagueId } : {}),
            ...(cloudinaryApiSportsId ? { apiSportsId: cloudinaryApiSportsId } : {})
          },
          create: {
            eaId: record.team.id,
            name: record.team.name,
            normalizedName: normalizeSearchText(record.team.name),
            shortName: shortName(record.team.name),
            imageUrl: record.team.imageUrl,
            leagueId,
            ...(cloudinaryApiSportsId ? { apiSportsId: cloudinaryApiSportsId } : {})
          }
        });
        teamId = team.id;
        teams += 1;
      }

      const player = await transaction.player.upsert({
        where: { eaId: record.eaId },
        update: {
          name: record.name,
          normalizedName: normalizeSearchText(record.name),
          gender: "MALE",
          ...(record.birthdate ? { birthdate: new Date(record.birthdate) } : {}),
          position: record.position,
          eaPositionId: record.positionId ?? null,
          overall: record.overall,
          potential: record.potential,
          pace: record.pace,
          shooting: record.shooting,
          passing: record.passing,
          dribbling: record.dribbling,
          defending: record.defending,
          physical: record.physical,
          avatarUrl: record.avatarUrl,
          ...(countryId ? { nationalityId: countryId } : {})
        },
        create: {
          eaId: record.eaId,
          externalId: record.externalId,
          name: record.name,
          normalizedName: normalizeSearchText(record.name),
          gender: "MALE",
          internationalReputation: reputationFromOverall(record.overall),
          ...(record.birthdate ? { birthdate: new Date(record.birthdate) } : {}),
          position: record.position,
          eaPositionId: record.positionId ?? null,
          overall: record.overall,
          potential: record.potential,
          pace: record.pace,
          shooting: record.shooting,
          passing: record.passing,
          dribbling: record.dribbling,
          defending: record.defending,
          physical: record.physical,
          avatarUrl: record.avatarUrl,
          nationalityId: countryId
        }
      });
      players += 1;

      if (teamId) {
        const activeRoster = await transaction.roster.findFirst({
          where: { playerId: player.id, isActive: true },
          select: { id: true }
        });
        if (!activeRoster) {
          await transaction.roster.create({
            data: { playerId: player.id, teamId, isActive: true, role: player.overall >= 85 ? "CLAVE" : player.overall >= 77 ? "IMPORTANTE" : "ROTACION" }
          });
          rosters += 1;
        } else {
          await transaction.roster.updateMany({
            where: { playerId: player.id, isActive: true, role: "ROTACION" },
            data: { role: player.overall >= 85 ? "CLAVE" : player.overall >= 77 ? "IMPORTANTE" : "ROTACION" }
          });
        }
      }
    }

    return { players, teams, leagues, countries, rosters };
  }, { maxWait: 20_000, timeout: 120_000 });
}

export async function importEaCatalog(
  database: PrismaClient,
  maxPlayers = DEFAULT_MAX_PLAYERS
) {
  const target = Math.max(1, Math.trunc(maxPlayers));
  const seen = new Set<number>();
  const totals = { players: 0, teams: 0, leagues: 0, countries: 0, rosters: 0 };

  const apiSportsMap = await fetchTeamApiSportsMap();

  for (let offset = 0; seen.size < target; offset += PAGE_SIZE) {
    const records = await fetchEaRatings({
      locale: "es",
      limit: PAGE_SIZE,
      offset,
      allowEmpty: true
    });
    if (!records.length) break;
    const uniqueRecords = records.filter((record) => !seen.has(record.eaId)).slice(0, target - seen.size);
    if (!uniqueRecords.length) break;
    uniqueRecords.forEach((record) => seen.add(record.eaId));
    const imported = await upsertEaRecords(database, uniqueRecords, apiSportsMap);
    totals.players += imported.players;
    totals.teams += imported.teams;
    totals.leagues += imported.leagues;
    totals.countries += imported.countries;
    totals.rosters += imported.rosters;
    console.log(`Importados ${totals.players} jugadores (offset ${offset}).`);
    if (records.length < PAGE_SIZE) break;
  }

  return totals;
}
