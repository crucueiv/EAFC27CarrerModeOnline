import type { Prisma, Player } from "@prisma/client";
import { demoTransferPlayers } from "@/lib/demoData";
import { hasDatabaseUrl, prisma } from "@/lib/prisma";
import {
  calculatePlayerValueAndClause
} from "@/lib/transfers/pricingEngine";
import { normalizeSearchText } from "@/lib/search/normalize";
import { EA_POSITION_BY_ID } from "@/lib/ratings/positions";

export type TransferSearchParams = {
  name?: string;
  minOverall?: number;
  maxOverall?: number;
  minPace?: number;
  minShooting?: number;
  minPassing?: number;
  minDribbling?: number;
  minDefending?: number;
  minPhysical?: number;
  maxPrice?: number;
  position?: string | number;
  leagueId?: string;
  leagueName?: string;
  teamId?: string;
  teamName?: string;
  nationalityId?: string;
  nationalityName?: string;
  freeAgents?: boolean;
  excludeTeamId?: string;
  page?: number;
  pageSize?: number;
};

export type TransferPlayerResult = {
  id: string;
  name: string;
  position: string;
  eaPositionId: string | null;
  overall: number;
  potential: number;
  eaId: number | null;
  avatarUrl: string | null;
  price: number;
  salary: number;
  releaseClause: number;
  financialBreakdown: {
    performanceAverage: number | null;
  };
  role: string;
  stats: Record<"pace" | "shooting" | "passing" | "dribbling" | "defending" | "physical", number>;
  currentTeam: {
    id: string;
    eaId: string | null;
    name: string;
    shortName: string;
    imageUrl: string | null;
    primaryColor: string | null;
    managerId: string | null;
    league: { id: string; name: string; imageUrl: string | null; eaId: string | null } | null;
  } | null;
  isLoanEligible?: boolean;
  nationality: { id: string; name: string; code: string | null; flagUrl: string | null } | null;
};

function getLeagueIconUrl(league: { eaId: string | null; imageUrl: string | null }): string | null {
  if (league.eaId) {
    return `https://assets.easysbc.io/fc26/leagues/${league.eaId}.png`;
  }
  return league.imageUrl;
}

export type TransferSearchResult = {
  players: TransferPlayerResult[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  source: "database" | "demo" | "configuration";
  error?: string;
  hydrationError?: string;
};

export type TransferFilterOptions = {
  leagues: Array<{ id: string; name: string; imageUrl: string | null; eaId: string | null }>;
  nationalities: Array<{ id: string; name: string; flagUrl: string | null }>;
};

export async function getTransferFilterOptions(): Promise<TransferFilterOptions> {
  if (!prisma) return { leagues: [], nationalities: [] };
  const [leagues, nationalities] = await Promise.all([
    prisma.league.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, imageUrl: true, eaId: true }, take: 250 }),
    prisma.country.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, flagUrl: true }, take: 250 })
  ]);
  return {
    leagues: leagues.map((l) => ({ ...l, imageUrl: getLeagueIconUrl(l) })),
    nationalities
  };
}

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number) {
  return value === undefined || !Number.isFinite(value) ? fallback : Math.min(max, Math.max(min, Math.trunc(value)));
}

export function parseTransferSearchParams(searchParams: URLSearchParams): TransferSearchParams {
  const number = (key: string) => {
    const value = searchParams.get(key);
    if (value === null || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return {
    name: searchParams.get("name")?.trim() || undefined,
    minOverall: number("minOverall"),
    maxOverall: number("maxOverall"),
    minPace: number("minPace"),
    minShooting: number("minShooting"),
    minPassing: number("minPassing"),
    minDribbling: number("minDribbling"),
    minDefending: number("minDefending"),
    minPhysical: number("minPhysical"),
    maxPrice: number("maxPrice"),
    position: searchParams.get("position")?.trim() || undefined,
    leagueId: searchParams.get("leagueId")?.trim() || undefined,
    leagueName: searchParams.get("leagueName")?.trim() || undefined,
    teamId: searchParams.get("teamId")?.trim() || undefined,
    teamName: searchParams.get("teamName")?.trim() || undefined,
    nationalityId: searchParams.get("nationalityId")?.trim() || undefined,
    nationalityName: searchParams.get("nationalityName")?.trim() || undefined,
    freeAgents: searchParams.get("freeAgents") === "1" || searchParams.get("freeAgents") === "true",
    excludeTeamId: searchParams.get("excludeTeamId")?.trim() || undefined,
    page: number("page"),
    pageSize: number("pageSize")
  };
}

function normalizeParams(params: TransferSearchParams) {
  return {
    ...params,
    position: params.position === undefined ? undefined : String(params.position).trim(),
    page: boundedInteger(params.page, 1, 1, 100000),
    pageSize: boundedInteger(params.pageSize, 12, 1, 100)
  };
}

function demoResults(params: TransferSearchParams): TransferPlayerResult[] {
  const statFilters = [
    ["pace", "minPace"],
    ["shooting", "minShooting"],
    ["passing", "minPassing"],
    ["dribbling", "minDribbling"],
    ["defending", "minDefending"],
    ["physical", "minPhysical"]
  ] as const;

  return demoTransferPlayers
    .filter((player) => {
      const textMatches = !params.name || normalizeSearchText(player.name).includes(normalizeSearchText(params.name));
      const minOverall = params.minOverall === undefined || player.overall >= params.minOverall;
      const maxOverall = params.maxOverall === undefined || player.overall <= params.maxOverall;
      const requestedPosition = params.position === undefined ? undefined : String(params.position).toLowerCase();
      const numericPosId = requestedPosition !== undefined && /^\d+$/.test(requestedPosition);
      const resolvedPosition = numericPosId && requestedPosition
        ? (EA_POSITION_BY_ID.get(requestedPosition)?.shortLabel.toLowerCase() ?? requestedPosition)
        : requestedPosition;
      const position = !resolvedPosition || player.position.toLowerCase() === resolvedPosition;
      const freeAgent = !params.freeAgents || player.currentTeam?.eaId === "FREE_AGENTS";
      const team = !params.teamId || player.currentTeam?.id === params.teamId;
      const league = !params.leagueId || player.currentTeam?.league?.id === params.leagueId;
      const nationality = !params.nationalityId || player.nationality?.id === params.nationalityId;
      const stats = statFilters.every(([stat, filter]) => params[filter] === undefined || player[stat] >= params[filter]!);
      return textMatches && minOverall && maxOverall && position && freeAgent && team && league && nationality && stats;
    })
    .map((player) => {
      const financial = calculatePlayerValueAndClause({
        overall: player.overall,
        potential: player.potential,
        position: player.position,
        pace: player.pace,
        shooting: player.shooting,
        passing: player.passing,
        dribbling: player.dribbling,
        defending: player.defending,
        physical: player.physical
      });
      const isFreeAgent = player.currentTeam?.eaId === "FREE_AGENTS";
      return {
        id: player.id,
        name: player.name,
        position: player.position,
        eaPositionId: null,
        overall: player.overall,
        potential: player.potential,
        eaId: player.eaId,
        avatarUrl: player.avatarUrl || (player.eaId
          ? `https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p${player.eaId}.png`
          : null),
        price: isFreeAgent ? 0 : financial.marketValue,
        salary: financial.weeklyWage,
        releaseClause: isFreeAgent ? 0 : financial.releaseClause,
        financialBreakdown: { performanceAverage: null },
        role: "ROTACION",
        stats: {
          pace: player.pace,
          shooting: player.shooting,
          passing: player.passing,
          dribbling: player.dribbling,
          defending: player.defending,
          physical: player.physical
        },
        currentTeam: player.currentTeam,
        nationality: player.nationality
      };
    })
    .filter((player) => params.maxPrice === undefined || player.price <= params.maxPrice);
}

type SearchPlayer = Player & {
  rosters: Array<{
    seasonId: string | null;
    role: "CLAVE" | "IMPORTANTE" | "ROTACION";
    team: {
      id: string;
      eaId: string | null;
      name: string;
      shortName: string;
      imageUrl: string | null;
      primaryColor: string | null;
      managerId: string | null;
      league: { id: string; name: string; imageUrl: string | null; eaId: string | null } | null;
    };
  }>;
  nationality: { id: string; name: string; code: string | null; flagUrl: string | null } | null;
  matchStats: Array<{ rating: number }>;
};

function serializePlayer(player: SearchPlayer): TransferPlayerResult {
  const currentRoster = player.rosters.find((roster) => roster.seasonId !== null) ?? player.rosters[0];
  const currentTeam = currentRoster?.team ?? null;
  const role = currentRoster?.role ?? (player.overall >= 85 ? "CLAVE" : player.overall >= 77 ? "IMPORTANTE" : "ROTACION");
  const performanceAverage = player.matchStats.length
    ? player.matchStats.reduce((sum, stat) => sum + stat.rating, 0) / player.matchStats.length
    : undefined;
  const roleForPricing = role === "CLAVE" ? "Crucial" : role === "IMPORTANTE" ? "Important" : "Rotation";
  const financial = calculatePlayerValueAndClause({
    overall: player.overall,
    potential: player.potential,
    birthdate: player.birthdate,
    position: player.position,
    internationalReputation: player.internationalReputation,
    pace: player.pace,
    shooting: player.shooting,
    passing: player.passing,
    dribbling: player.dribbling,
    defending: player.defending,
    physical: player.physical,
    role: roleForPricing,
    leagueFactor: currentTeam?.league ? 1.2 : 1,
    matchRatings: player.matchStats.map((stat) => stat.rating)
  });
  const avatarUrl = player.avatarUrl || (player.eaId
    ? `https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p${player.eaId}.png`
    : null);
  const isFreeAgent = currentTeam?.eaId === "FREE_AGENTS";
  return {
    id: player.id,
    name: player.name,
    position: player.position,
    eaPositionId: player.eaPositionId,
    overall: player.overall,
    potential: player.potential,
    eaId: player.eaId,
    avatarUrl,
    price: isFreeAgent ? 0 : financial.marketValue,
    salary: financial.weeklyWage,
    releaseClause: isFreeAgent ? 0 : financial.releaseClause,
    financialBreakdown: { performanceAverage: financial.performanceAverage },
    role,
    stats: {
      pace: player.pace,
      shooting: player.shooting,
      passing: player.passing,
      dribbling: player.dribbling,
      defending: player.defending,
      physical: player.physical
    },
    currentTeam: currentTeam
      ? {
          id: currentTeam.id,
          eaId: currentTeam.eaId,
          name: currentTeam.name,
          shortName: currentTeam.shortName,
          imageUrl: currentTeam.imageUrl,
          primaryColor: currentTeam.primaryColor,
          managerId: currentTeam.managerId,
          league: currentTeam.league
            ? {
                id: currentTeam.league.id,
                name: currentTeam.league.name,
                imageUrl: getLeagueIconUrl(currentTeam.league),
                eaId: currentTeam.league.eaId
              }
            : null
        }
      : null,
    isLoanEligible:
      currentTeam !== null && currentTeam.eaId !== "FREE_AGENTS" && player.overall < 70,
    nationality: player.nationality
  };
}

function isDatabaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = (error as { code?: unknown }).code;
  return code === "P1001" || code === "P1003" || code === "P1017" || code === "P2021" || code === "P2022";
}

function filterSerializedPlayers(
  players: SearchPlayer[],
  params: ReturnType<typeof normalizeParams>
) {
  return players
    .map(serializePlayer)
    .filter((player) => {
      const textMatches = !params.name || normalizeSearchText(player.name).includes(normalizeSearchText(params.name));
      const requestedPosition = params.position?.toLowerCase();
      const numericPositionId = requestedPosition !== undefined && /^\d+$/.test(requestedPosition);
      const positionMatches = !params.position ||
        (numericPositionId
          ? (EA_POSITION_BY_ID.get(requestedPosition!)
              ? normalizeSearchText(player.position) === normalizeSearchText(EA_POSITION_BY_ID.get(requestedPosition!)!.shortLabel)
              : normalizeSearchText(player.position) === normalizeSearchText(requestedPosition))
          : normalizeSearchText(player.position) === normalizeSearchText(requestedPosition ?? ""));
      const minOverall = params.minOverall === undefined || player.overall >= params.minOverall;
      const maxOverall = params.maxOverall === undefined || player.overall <= params.maxOverall;
      const statFilters = [
        ["pace", params.minPace],
        ["shooting", params.minShooting],
        ["passing", params.minPassing],
        ["dribbling", params.minDribbling],
        ["defending", params.minDefending],
        ["physical", params.minPhysical]
      ] as const;
      const statsMatch = statFilters.every(([stat, minimum]) => minimum === undefined || player.stats[stat] >= minimum);
      const teamMatches = (!params.teamId || player.currentTeam?.id === params.teamId) &&
        (!params.teamName || Boolean(player.currentTeam && normalizeSearchText(player.currentTeam.name).includes(normalizeSearchText(params.teamName))));
      const leagueMatches = (!params.leagueId || player.currentTeam?.league?.id === params.leagueId) &&
        (!params.leagueName || Boolean(player.currentTeam?.league && normalizeSearchText(player.currentTeam.league.name).includes(normalizeSearchText(params.leagueName))));
      const nationalityMatches = (!params.nationalityId || player.nationality?.id === params.nationalityId) &&
        (!params.nationalityName || Boolean(player.nationality && normalizeSearchText(player.nationality.name).includes(normalizeSearchText(params.nationalityName))));
      const priceMatches = params.maxPrice === undefined || player.price <= params.maxPrice;
      const freeAgentMatches = !params.freeAgents || player.currentTeam?.eaId === "FREE_AGENTS";
      const ownClubMatches = !params.excludeTeamId || player.currentTeam?.id !== params.excludeTeamId;
      return textMatches && positionMatches && minOverall && maxOverall && statsMatch &&
        teamMatches && leagueMatches && nationalityMatches && priceMatches && freeAgentMatches && ownClubMatches;
    });
}

export async function getTransferSearchResults(input: TransferSearchParams = {}): Promise<TransferSearchResult> {
  const params = normalizeParams(input);

  if (!prisma) {
    return {
      players: [],
      page: params.page,
      pageSize: params.pageSize,
      total: 0,
      totalPages: 1,
      source: "configuration",
      error: hasDatabaseUrl
        ? "The database client is unavailable."
        : "DATABASE_URL is not configured. Copy .env.example to .env.local and set your Neon connection string."
    };
  }

  try {
    const where: Prisma.PlayerWhereInput = {};
    if (params.name) where.normalizedName = { contains: normalizeSearchText(params.name) };
    where.gender = "MALE";
    if (params.minOverall !== undefined || params.maxOverall !== undefined) {
      where.overall = { gte: params.minOverall, lte: params.maxOverall };
    }
    for (const [field, value] of [
      ["pace", params.minPace],
      ["shooting", params.minShooting],
      ["passing", params.minPassing],
      ["dribbling", params.minDribbling],
      ["defending", params.minDefending],
      ["physical", params.minPhysical]
    ] as const) {
      if (value !== undefined) where[field] = { gte: value };
    }
    const numericPositionId = params.position !== undefined && /^\d+$/.test(params.position);
    if (params.position) {
      if (numericPositionId) {
        const mapped = EA_POSITION_BY_ID.get(params.position);
        if (mapped) {
          where.position = { equals: mapped.shortLabel, mode: "insensitive" };
        } else {
          where.position = { equals: params.position, mode: "insensitive" };
        }
      } else {
        where.position = { equals: params.position, mode: "insensitive" };
      }
    }
    if (params.nationalityId || params.nationalityName) {
      where.nationality = {
        ...(params.nationalityId ? { id: params.nationalityId } : {}),
        ...(params.nationalityName ? { normalizedName: { contains: normalizeSearchText(params.nationalityName) } } : {})
      };
    }
    if (params.excludeTeamId) {
      where.NOT = {
        rosters: {
          some: {
            isActive: true,
            teamId: params.excludeTeamId
          }
        }
      };
    }

    if (params.freeAgents) {
      where.rosters = {
        some: {
          isActive: true,
          team: { eaId: "FREE_AGENTS" }
        }
      };
    } else if (params.teamId || params.teamName || params.leagueId || params.leagueName) {
      where.rosters = {
        some: {
          isActive: true,
          ...(params.teamId ? { teamId: params.teamId } : {}),
          ...(params.teamName || params.leagueId || params.leagueName ? {
            team: {
              ...(params.teamName ? { normalizedName: { contains: normalizeSearchText(params.teamName) } } : {}),
              ...(params.leagueId || params.leagueName ? {
                league: {
                  ...(params.leagueId ? { id: params.leagueId } : {}),
                  ...(params.leagueName ? { normalizedName: { contains: normalizeSearchText(params.leagueName) } } : {})
                }
              } : {})
            }
          } : {})
        }
      };
    }

    const database = prisma;
    if (!database) throw new Error("Player database is unavailable.");
    const queryPlayers = () => database.player.findMany({
      where,
      orderBy: [{ overall: "desc" }, { name: "asc" }, { id: "asc" }],
      include: {
        nationality: true,
        rosters: {
          where: { isActive: true },
          orderBy: [{ season: { startDate: "desc" } }, { id: "asc" }],
          select: {
            seasonId: true,
            role: true,
            team: {
              include: { league: { select: { id: true, eaId: true, name: true, imageUrl: true } } }
            }
          }
        },
        matchStats: { select: { rating: true } }
      }
    });
    let players = await queryPlayers();
    let filtered = filterSerializedPlayers(players, params);

    const start = (params.page - 1) * params.pageSize;
    return {
      players: filtered.slice(start, start + params.pageSize),
      page: params.page,
      pageSize: params.pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / params.pageSize)),
      source: "database",
    };
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const filtered = demoResults(params);
    const start = (params.page - 1) * params.pageSize;
    return {
      players: filtered.slice(start, start + params.pageSize),
      page: params.page,
      pageSize: params.pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / params.pageSize)),
      source: "demo",
      error: "The player database is unavailable."
    };
  }
}
