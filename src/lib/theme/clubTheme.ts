export type ThemeMode = "light" | "dark";

export type TeamThemeSeed = {
  mode?: ThemeMode;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  leaguePrimaryColor?: string | null;
  leagueSecondaryColor?: string | null;
};

const FALLBACK_PRIMARY = "#2563eb";
const FALLBACK_SECONDARY = "#f8fafc";
const FALLBACK_LEAGUE_PRIMARY = "#dc2626";
const FALLBACK_LEAGUE_SECONDARY = "#111827";

function normalizeHex(value: string | null | undefined, fallback: string) {
  if (!value || typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (!trimmed.startsWith("#")) return fallback;
  if (trimmed.length === 4) {
    return `#${trimmed
      .slice(1)
      .split("")
      .map((char) => char + char)
      .join("")}`.toLowerCase();
  }
  if (trimmed.length === 7) return trimmed.toLowerCase();
  return fallback;
}

export function resolveThemeSeed(seed?: TeamThemeSeed | null): {
  mode: ThemeMode;
  primaryColor: string;
  secondaryColor: string;
  leaguePrimaryColor: string;
  leagueSecondaryColor: string;
} {
  const safeSeed = seed ?? {};
  return {
    mode: safeSeed.mode ?? "light",
    primaryColor: normalizeHex(safeSeed.primaryColor, FALLBACK_PRIMARY),
    secondaryColor: normalizeHex(safeSeed.secondaryColor, FALLBACK_SECONDARY),
    leaguePrimaryColor: normalizeHex(safeSeed.leaguePrimaryColor, FALLBACK_LEAGUE_PRIMARY),
    leagueSecondaryColor: normalizeHex(safeSeed.leagueSecondaryColor, FALLBACK_LEAGUE_SECONDARY),
  };
}
