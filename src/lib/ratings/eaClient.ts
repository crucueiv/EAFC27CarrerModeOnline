export type EaRatingsSearchParams = {
  locale?: string;
  name?: string;
  position?: string | number;
  limit?: number;
  page?: number;
  offset?: number;
  /** @deprecated Use limit instead. */
  pageSize?: number;
  allowEmpty?: boolean;
};

export type EaVisualMetadata = {
  id: string;
  name: string;
  imageUrl: string | null;
};

export type EaRatingRecord = {
  externalId: string;
  eaId: number;
  name: string;
  position: string;
  positionId?: string;
  overall: number;
  potential: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  avatarUrl: string;
  marketValue?: number;
  gender: "MALE" | "FEMALE";
  birthdate?: string;
  team?: EaVisualMetadata;
  nationality?: EaVisualMetadata;
  league?: EaVisualMetadata;
};

const EA_RATINGS_URL = "https://drop-api.ea.com/rating/ea-sports-fc";
const DEFAULT_TIMEOUT_MS = 8_000;

function valueAt(input: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (input[key] !== undefined && input[key] !== null) return input[key];
    const matchingKey = Object.keys(input).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
    if (matchingKey && input[matchingKey] !== undefined && input[matchingKey] !== null) return input[matchingKey];
  }
  return undefined;
}

function numberValue(input: Record<string, unknown>, keys: string[]): number | undefined {
  const value = valueAt(input, keys);
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  if (value && typeof value === "object") {
    const nested = value as Record<string, unknown>;
    return numberValue(nested, ["value", "rating", "score"]);
  }
  return undefined;
}

function stringValue(input: Record<string, unknown>, keys: string[]): string | undefined {
  const value = valueAt(input, keys);
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object") {
    const nested = value as Record<string, unknown>;
    return stringValue(nested, ["shortLabel", "shortName", "label", "name", "id"]);
  }
  return undefined;
}

function candidateItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const object = payload as Record<string, unknown>;
  for (const key of ["items", "players", "ratings", "results", "data", "records", "content", "response"]) {
    const matchingKey = Object.keys(object).find((candidate) => candidate.toLowerCase() === key);
    const value = matchingKey ? object[matchingKey] : undefined;
    if (Array.isArray(value) && value.length) return value;
    if (value && typeof value === "object") {
      const nested = candidateItems(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

function statValue(item: Record<string, unknown>, stats: Record<string, unknown>, keys: string[]): number {
  return Math.max(0, Math.min(99, numberValue(item, keys) ?? numberValue(stats, keys) ?? 0));
}

function visualMetadata(input: unknown): EaVisualMetadata | undefined {
  if (!input || typeof input !== "object") return undefined;
  const object = input as Record<string, unknown>;
  const id = stringValue(object, ["id", "externalId", "externalID"]);
  const name = stringValue(object, ["label", "name", "shortName"]);
  if (!id || !name) return undefined;
  return {
    id,
    name,
    imageUrl: stringValue(object, ["imageUrl", "logoUrl", "flagUrl", "url"]) ?? null
  };
}

export function normalizeEaRating(input: unknown): EaRatingRecord | null {
  if (!input || typeof input !== "object") return null;
  const item = input as Record<string, unknown>;
  const stats = item.stats && typeof item.stats === "object" ? item.stats as Record<string, unknown> : {};
  const eaId = numberValue(item, ["eaId", "eaID", "playerId", "playerID", "id"]);
  const firstName = stringValue(item, ["firstName"]);
  const lastName = stringValue(item, ["lastName"]);
  const name = stringValue(item, ["name", "fullName"]) ??
    ([firstName, lastName].filter(Boolean).join(" ") || stringValue(item, ["commonName"]));
  const overall = numberValue(item, ["overall", "overallRating", "rating"]);
  const positionObject = item.position && typeof item.position === "object"
    ? item.position as Record<string, unknown>
    : undefined;
  const position = stringValue(item, ["position", "preferredPosition"]) ??
    (positionObject ? stringValue(positionObject, ["shortLabel", "label", "name"]) : undefined) ??
    "UNK";
  const positionId = positionObject ? stringValue(positionObject, ["id"]) : undefined;
  const team = visualMetadata(item.team);
  const nationality = visualMetadata(item.nationality);
  const genderObject = item.gender && typeof item.gender === "object" ? item.gender as Record<string, unknown> : undefined;
  const genderLabel = genderObject ? stringValue(genderObject, ["label", "name", "id"]) : stringValue(item, ["gender"]);
  const gender = genderLabel?.toLowerCase().includes("fem") || genderLabel === "1" ? "FEMALE" : "MALE";
  const birthdate = stringValue(item, ["birthdate", "dateOfBirth"]);
  const teamObject = item.team && typeof item.team === "object" ? item.team as Record<string, unknown> : undefined;
  const league = visualMetadata(item.league) ??
    (teamObject ? visualMetadata(teamObject.league) : undefined) ??
    (() => {
      const leagueName = stringValue(item, ["leagueName"]);
      if (!leagueName) return undefined;
      return {
        id: stringValue(item, ["leagueId"]) ?? leagueName,
        name: leagueName,
        imageUrl: stringValue(item, ["leagueImageUrl"]) ?? null
      };
    })();

  if (eaId === undefined || !name || overall === undefined || !position) return null;

  const normalizedOverall = Math.max(1, Math.min(99, overall));
  const potential = Math.max(
    normalizedOverall,
    Math.min(99, numberValue(item, ["potential", "potentialRating"]) ?? normalizedOverall)
  );

  return {
    externalId: stringValue(item, ["externalId", "externalID", "external_id"]) ?? String(eaId),
    eaId,
    name,
    position,
    ...(positionId ? { positionId } : {}),
    overall: normalizedOverall,
    potential,
    pace: statValue(item, stats, ["pace", "pac"]),
    shooting: statValue(item, stats, ["shooting", "sho"]),
    passing: statValue(item, stats, ["passing", "pas"]),
    dribbling: statValue(item, stats, ["dribbling", "dri"]),
    defending: statValue(item, stats, ["defending", "def"]),
    physical: statValue(item, stats, ["physical", "phy"]),
    avatarUrl: stringValue(item, ["avatarUrl"]) ??
      `https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p${eaId}.png`,
    ...(team ? { team } : {}),
    ...(nationality ? { nationality } : {}),
    ...(league ? { league } : {}),
    marketValue: numberValue(item, ["marketValue", "value", "price"]),
    gender,
    ...(birthdate ? { birthdate } : {})
  };
}

export function buildEaRatingsUrl(params: EaRatingsSearchParams): string {
  const url = new URL(EA_RATINGS_URL);
  const requestedLimit = params.limit ?? params.pageSize ?? 100;
  const normalizedLimit = Number.isFinite(requestedLimit)
    ? Math.min(100, Math.max(1, Math.trunc(requestedLimit)))
    : 100;
  const normalizedPage = params.page === undefined || !Number.isFinite(params.page)
    ? undefined
    : Math.max(1, Math.trunc(params.page));
  const normalizedOffset = params.offset === undefined || !Number.isFinite(params.offset)
    ? undefined
    : Math.max(0, Math.trunc(params.offset));

  url.searchParams.set("locale", params.locale?.trim() || "es");
  url.searchParams.set("limit", String(normalizedLimit));
  if (params.name?.trim()) url.searchParams.set("search", params.name.trim());
  if (params.position !== undefined && String(params.position).trim()) {
    url.searchParams.set("position", String(params.position).trim());
  }
  if (normalizedOffset !== undefined || normalizedPage !== undefined) {
    url.searchParams.set(
      "offset",
      String(normalizedOffset ?? (normalizedPage! - 1) * normalizedLimit)
    );
  }
  return url.toString();
}

function timeoutMs() {
  const configured = Number(process.env.EA_RATINGS_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? Math.trunc(configured) : DEFAULT_TIMEOUT_MS;
}

export async function fetchEaRatings(params: EaRatingsSearchParams): Promise<readonly EaRatingRecord[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());

  try {
    const response = await fetch(buildEaRatingsUrl(params), {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`EA ratings request failed with status ${response.status}.`);

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new Error("EA ratings response was not valid JSON.");
    }

    const items = candidateItems(payload);
    if (!items.length) {
      if (params.allowEmpty) return [];
      throw new Error("EA ratings response did not contain player records.");
    }
    const records = items.map(normalizeEaRating).filter((record): record is EaRatingRecord => record !== null);
    if (!records.length) throw new Error("EA ratings response contained no valid player records.");
    return records;
  } finally {
    clearTimeout(timer);
  }
}
