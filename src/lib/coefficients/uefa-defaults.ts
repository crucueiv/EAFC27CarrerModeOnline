export type UefaBlock = "A" | "B" | "C" | "D";

export type UefaAllocation = {
  championsDirect: number;
  championsQualifying: number;
  championsPlayoffSlots: number;
  europa: number;
  conference: number;
};

export const UEFA_BLOCK_DEFAULTS: Record<UefaBlock, UefaAllocation> = {
  A: { championsDirect: 3, championsQualifying: 0, championsPlayoffSlots: 0, europa: 1, conference: 1 },
  B: { championsDirect: 2, championsQualifying: 0, championsPlayoffSlots: 0, europa: 1, conference: 1 },
  C: { championsDirect: 0, championsQualifying: 0, championsPlayoffSlots: 1, europa: 1, conference: 1 },
  D: { championsDirect: 0, championsQualifying: 1, championsPlayoffSlots: 0, europa: 1, conference: 1 },
};

const COUNTRY_NAME_EN_TO_ES: Record<string, string> = {
  England: "Inglaterra",
  Spain: "España",
  Italy: "Italia",
  Germany: "Alemania",
  Portugal: "Portugal",
  France: "Francia",
  Netherlands: "Países Bajos",
  Belgium: "Bélgica",
  Turkey: "Turquía",
  Austria: "Austria",
  Switzerland: "Suiza",
  "Czech Republic": "República Checa",
  Denmark: "Dinamarca",
  Greece: "Grecia",
  Norway: "Noruega",
  Sweden: "Suecia",
  Scotland: "Escocia",
  Poland: "Polonia",
  Croatia: "Croacia",
  Ukraine: "Ucrania",
  Cyprus: "Chipre",
  Bulgaria: "Bulgaria",
  Hungary: "Hungría",
  Romania: "Rumanía",
  Ireland: "Irlanda",
  Finland: "Finlandia",
  Azerbaijan: "Azerbaiyán",
};

function normalizeCountryKey(country: string): string {
  if (COUNTRY_NAME_EN_TO_ES[country]) return COUNTRY_NAME_EN_TO_ES[country];
  return country;
}

export const COUNTRY_TO_UEFA_BLOCK: Record<string, UefaBlock> = {
  Inglaterra: "A",
  España: "A",
  Italia: "A",
  Alemania: "A",
  Portugal: "A",
  Francia: "B",
  "Países Bajos": "C",
  Bélgica: "C",
  Turquía: "C",
  Austria: "C",
  Suiza: "C",
  "República Checa": "C",
  Dinamarca: "C",
  Grecia: "C",
  Noruega: "C",
  Suecia: "C",
  Escocia: "D",
  Polonia: "D",
  Croacia: "D",
  Ucrania: "D",
  Chipre: "D",
  Bulgaria: "D",
  Hungría: "D",
  Rumanía: "D",
  Irlanda: "D",
  Finlandia: "D",
  Azerbaiyán: "D",
};

export function getCountryUefaBlock(country: string): UefaBlock | null {
  const key = normalizeCountryKey(country);
  return COUNTRY_TO_UEFA_BLOCK[key] ?? null;
}

export function getUefaAllocation(country: string): UefaAllocation | null {
  const block = getCountryUefaBlock(country);
  if (!block) return null;
  return UEFA_BLOCK_DEFAULTS[block];
}

export function computeUefaBlockFromRanking(ranking: number): UefaBlock {
  if (ranking <= 5) return "A";
  if (ranking <= 6) return "B";
  if (ranking <= 15) return "C";
  return "D";
}
