export type EasySBCSearchParams = {
  league?: string;
  country?: string;
  club?: string;
  page?: number;
  sort?: string;
};

export type EasySBCPlayer = {
  resourceId: number;
  assetId: number;
  eaPlayerId: number | null;
  playerRoleId: number;
  name: string;
  rating: number;
  metaRatingZeroChem: number;
  positions: string[];
  possiblePositions: string[];
  metaRating: number;
  owned: boolean;
  sbcStorage: boolean;
  attributes: number[];
  countryId: number;
  leagueId: number;
  clubId: number;
  price: number;
  priceInfo: {
    displayPrice: number;
    source: string;
    launchPrice: number;
  };
  isObjectivePlayer: boolean;
  isSbcPlayer: boolean;
  skillMoves: number;
  weakFoot: number;
  preferredFoot: string;
  untradeable: boolean;
  versionId: number;
  preferredPosition: string;
  metalId: number;
  hasDynamicImage: boolean;
  playerUrl: string;
  playStylesPlus: any[];
  cardName: string;
  rolesPlus: any[];
  playStyles: any[];
  canEvolve: boolean;
  newPlayer: boolean;
};

export type EasySBCResponse = {
  players: EasySBCPlayer[];
  total: number;
  pages: number;
  page: number;
};

const EASYSBC_BASE_URL = "https://api-fc27.easysbc.io/players";
const DEFAULT_TIMEOUT_MS = 8_000;
const PAGE_SIZE = 20;

function buildEasySBCUrl(params: EasySBCSearchParams): string {
  const url = new URL(EASYSBC_BASE_URL);
  url.searchParams.set("v2", "");
  url.searchParams.set("sort-rating", "");
  url.searchParams.set("page", String(params.page ?? 1));
  if (params.league) url.searchParams.set("league", params.league);
  if (params.country) url.searchParams.set("country", params.country);
  if (params.club) url.searchParams.set("club", params.club);
  return url.toString();
}

export async function fetchEasySBCPlayers(params: EasySBCSearchParams): Promise<EasySBCResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(buildEasySBCUrl(params), {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`EasySBC request failed with status ${response.status}.`);

    const data = await response.json();
    return data as EasySBCResponse;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchAllPlayersForLeague(leagueId: string): Promise<EasySBCPlayer[]> {
  const allPlayers: EasySBCPlayer[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchEasySBCPlayers({ league: leagueId, page });
    const players = response.players ?? [];
    
    if (players.length === 0) {
      hasMore = false;
      break;
    }

    allPlayers.push(...players);
    
    if (response.pages && page >= response.pages) {
      hasMore = false;
      break;
    }

    page++;
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return allPlayers;
}

export function mapAttributesToStats(attributes: number[]): {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  overallAverage: number;
} {
  const [pace, shooting, passing, dribbling, defending, physical] = attributes;
  const overallAverage = Math.round((pace + shooting + passing + dribbling + defending + physical) / 6);
  
  return {
    pace: Math.max(1, Math.min(99, pace)),
    shooting: Math.max(1, Math.min(99, shooting)),
    passing: Math.max(1, Math.min(99, passing)),
    dribbling: Math.max(1, Math.min(99, dribbling)),
    defending: Math.max(1, Math.min(99, defending)),
    physical: Math.max(1, Math.min(99, physical)),
    overallAverage,
  };
}