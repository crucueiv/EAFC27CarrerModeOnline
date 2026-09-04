export type ConmebolAllocation = {
  libertadoresDirect: number;
  libertadoresQualifying: number;
  sudamericana: number;
  extraFromSudamericanaWinner: boolean;
  usesReclasiTable: boolean;
};

const COUNTRY_NAME_EN_TO_ES: Record<string, string> = {
  Argentina: "Argentina",
  Brazil: "Brasil",
  Chile: "Chile",
  Colombia: "Colombia",
};

function normalizeCountryKey(country: string): string {
  if (COUNTRY_NAME_EN_TO_ES[country]) return COUNTRY_NAME_EN_TO_ES[country];
  return country;
}

export const CONMEBOL_DEFAULTS: Record<string, ConmebolAllocation> = {
  Argentina: { libertadoresDirect: 0, libertadoresQualifying: 9, sudamericana: 12, extraFromSudamericanaWinner: false, usesReclasiTable: false },
};

export function getConmebolAllocation(country: string): ConmebolAllocation | null {
  const key = normalizeCountryKey(country);
  return CONMEBOL_DEFAULTS[key] ?? null;
}
