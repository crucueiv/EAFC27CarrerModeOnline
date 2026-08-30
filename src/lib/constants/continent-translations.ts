export const CONTINENT_TRANSLATIONS: Record<string, string> = {
  Europe: "Europa",
  "South America": "Sudamérica",
  "North America": "Norteamérica",
  Africa: "África",
  Asia: "Asia",
  Oceania: "Oceanía",
  International: "Internacional",
};

export function translateContinent(en: string): string {
  return CONTINENT_TRANSLATIONS[en] ?? en;
}

export const CONTINENTS_ES = [
  "Europa",
  "Sudamérica",
  "Norteamérica",
  "África",
  "Asia",
  "Oceanía",
  "Internacional",
] as const;