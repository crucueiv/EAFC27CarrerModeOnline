const EA_RATINGS_PAGE_URL = "https://www.ea.com/es/games/ea-sports-fc/ratings";
const EA_RATINGS_PATH = "/es/games/ea-sports-fc/ratings";
const EA_FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};

let cachedBuildId: string | null = null;

async function fetchEAPageBuildId(): Promise<string> {
  const response = await fetch(EA_RATINGS_PAGE_URL, {
    headers: { ...EA_FETCH_HEADERS, Accept: "text/html" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch EA ratings page: ${response.status}`);
  }
  const html = await response.text();

  const buildIdMatch = html.match(/"buildId"\s*:\s*"([A-Za-z0-9_-]+)"/);
  if (buildIdMatch) return buildIdMatch[1];

  const nextDataMatch = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      if (data?.buildId) return data.buildId;
    } catch {
      // fallthrough
    }
  }

  throw new Error("Could not extract EA buildId from ratings page");
}

export async function getEARatingsBuildId(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedBuildId) return cachedBuildId;
  const id = await fetchEAPageBuildId();
  cachedBuildId = id;
  return id;
}

export async function getEARatingsJsonUrl(): Promise<string> {
  const buildId = await getEARatingsBuildId();
  return `https://www.ea.com/_next/data/${buildId}${EA_RATINGS_PATH}.json`;
}

export async function fetchEARatingsPayload<T = unknown>(): Promise<T> {
  const url = await getEARatingsJsonUrl();
  const response = await fetch(url, { headers: EA_FETCH_HEADERS });
  if (!response.ok) {
    cachedBuildId = null;
    const retryUrl = await getEARatingsJsonUrl();
    const retry = await fetch(retryUrl, { headers: EA_FETCH_HEADERS });
    if (!retry.ok) {
      throw new Error(`Failed to fetch EA ratings: ${retry.status} (url=${retryUrl})`);
    }
    return (await retry.json()) as T;
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    cachedBuildId = null;
    const retryUrl = await getEARatingsJsonUrl();
    const retry = await fetch(retryUrl, { headers: EA_FETCH_HEADERS });
    if (!retry.ok || !(retry.headers.get("content-type") ?? "").includes("application/json")) {
      throw new Error(
        `EA ratings URL did not return JSON (url=${retryUrl}, content-type=${contentType})`,
      );
    }
    return (await retry.json()) as T;
  }
  return (await response.json()) as T;
}
