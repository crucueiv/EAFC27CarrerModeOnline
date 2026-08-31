import { translateCountry } from "./country-translations";
import { translateContinent } from "./continent-translations";

export interface LeagueCountryInfo {
  country: string;
  continent: string;
  isPlayable: boolean;
  domesticLeagueId?: string;
}

const COUNTRY_MAP: Record<string, { countryEN: string; continentEN: string; isPlayable: boolean; domesticLeagueId?: string }> = {
  "53": { countryEN: "Spain", continentEN: "Europe", isPlayable: true },
  "54": { countryEN: "Spain", continentEN: "Europe", isPlayable: true },
  "13": { countryEN: "England", continentEN: "Europe", isPlayable: true },
  "14": { countryEN: "England", continentEN: "Europe", isPlayable: true },
  "60": { countryEN: "England", continentEN: "Europe", isPlayable: true },
  "61": { countryEN: "England", continentEN: "Europe", isPlayable: true },
  "19": { countryEN: "Germany", continentEN: "Europe", isPlayable: true },
  "20": { countryEN: "Germany", continentEN: "Europe", isPlayable: true },
  "2076": { countryEN: "Germany", continentEN: "Europe", isPlayable: true },
  "31": { countryEN: "Italy", continentEN: "Europe", isPlayable: true },
  "32": { countryEN: "Italy", continentEN: "Europe", isPlayable: true },
  "16": { countryEN: "France", continentEN: "Europe", isPlayable: true },
  "17": { countryEN: "France", continentEN: "Europe", isPlayable: true },
  "10": { countryEN: "Netherlands", continentEN: "Europe", isPlayable: true },
  "4": { countryEN: "Belgium", continentEN: "Europe", isPlayable: true },
  "308": { countryEN: "Portugal", continentEN: "Europe", isPlayable: true },
  "65": { countryEN: "Ireland", continentEN: "Europe", isPlayable: true },
  "50": { countryEN: "Scotland", continentEN: "Europe", isPlayable: true },
  "1": { countryEN: "Denmark", continentEN: "Europe", isPlayable: true },
  "80": { countryEN: "Austria", continentEN: "Europe", isPlayable: true },
  "41": { countryEN: "Norway", continentEN: "Europe", isPlayable: true },
  "56": { countryEN: "Sweden", continentEN: "Europe", isPlayable: true },
  "189": { countryEN: "Switzerland", continentEN: "Europe", isPlayable: true },
  "68": { countryEN: "Turkey", continentEN: "Europe", isPlayable: true },
  "66": { countryEN: "Poland", continentEN: "Europe", isPlayable: true },
  "330": { countryEN: "Romania", continentEN: "Europe", isPlayable: true },
  "319": { countryEN: "Czech Republic", continentEN: "Europe", isPlayable: true },
  "351": { countryEN: "Australia", continentEN: "Oceania", isPlayable: true },
  "83": { countryEN: "South Korea", continentEN: "Asia", isPlayable: true },
  "350": { countryEN: "Saudi Arabia", continentEN: "Asia", isPlayable: true },
  "39": { countryEN: "USA", continentEN: "North America", isPlayable: true },
  "353": { countryEN: "Argentina", continentEN: "South America", isPlayable: true },
  "341": { countryEN: "Mexico", continentEN: "North America", isPlayable: true },
  "2209": { countryEN: "Colombia", continentEN: "South America", isPlayable: true },
  "317": { countryEN: "Croatia", continentEN: "Europe", isPlayable: true },
  "322": { countryEN: "Finland", continentEN: "Europe", isPlayable: true },
  "2211": { countryEN: "Hungary", continentEN: "Europe", isPlayable: true },
  "2244": { countryEN: "Azerbaijan", continentEN: "Europe", isPlayable: true },
  "2249": { countryEN: "Chile", continentEN: "South America", isPlayable: true },
  "63": { countryEN: "Greece", continentEN: "Europe", isPlayable: true },
  "2210": { countryEN: "Cyprus", continentEN: "Europe", isPlayable: true },
  "2271": { countryEN: "Thailand", continentEN: "Asia", isPlayable: true },
  "2272": { countryEN: "Norway", continentEN: "Europe", isPlayable: false },
  "2273": { countryEN: "Iceland", continentEN: "Europe", isPlayable: false },
  "2274": { countryEN: "Bulgaria", continentEN: "Europe", isPlayable: true },
  "2149": { countryEN: "India", continentEN: "Asia", isPlayable: true },
  "2172": { countryEN: "United Arab Emirates", continentEN: "Asia", isPlayable: true },
  "1003": { countryEN: "International", continentEN: "South America", isPlayable: false },
  "1014": { countryEN: "International", continentEN: "South America", isPlayable: false },
  "2267": { countryEN: "Brazil", continentEN: "South America", isPlayable: false, domesticLeagueId: "2267" },
  "2012": { countryEN: "China", continentEN: "Asia", isPlayable: false },
  "332": { countryEN: "Ukraine", continentEN: "Europe", isPlayable: false },
  "2229": { countryEN: "Netherlands", continentEN: "Europe", isPlayable: false },
  "2232": { countryEN: "Sweden", continentEN: "Europe", isPlayable: false },
  "2231": { countryEN: "Switzerland", continentEN: "Europe", isPlayable: false },
  "2228": { countryEN: "Portugal", continentEN: "Europe", isPlayable: false },
  "2218": { countryEN: "France", continentEN: "Europe", isPlayable: false },
  "2221": { countryEN: "USA", continentEN: "North America", isPlayable: false },
  "2222": { countryEN: "Spain", continentEN: "Europe", isPlayable: false },
  "2215": { countryEN: "Germany", continentEN: "Europe", isPlayable: false },
  "2230": { countryEN: "Czech Republic", continentEN: "Europe", isPlayable: false },
  "2233": { countryEN: "Scotland", continentEN: "Europe", isPlayable: false },
  "2236": { countryEN: "Italy", continentEN: "Europe", isPlayable: false },
  "2216": { countryEN: "England", continentEN: "Europe", isPlayable: false },
};

export const WOMEN_LEAGUE_IDS = new Set([
  "2215", "2216", "2218", "2221", "2222", "2228", "2229", "2230", "2231", "2232", "2233", "2236"
]);

export const CONMEBOL_TOURNAMENT_IDS = new Set(["1003", "1014"]);

export function getLeagueCountryInfo(eaId: string): LeagueCountryInfo {
  const info = COUNTRY_MAP[eaId] ?? { countryEN: "International", continentEN: "Europe", isPlayable: false };
  return {
    country: translateCountry(info.countryEN),
    continent: translateContinent(info.continentEN),
    isPlayable: info.isPlayable,
    domesticLeagueId: info.domesticLeagueId,
  };
}

export function isWomenLeague(eaId: string): boolean {
  return WOMEN_LEAGUE_IDS.has(eaId);
}

export function isConmebolTournament(eaId: string): boolean {
  return CONMEBOL_TOURNAMENT_IDS.has(eaId);
}

export function isPlayableLeague(eaId: string): boolean {
  const info = COUNTRY_MAP[eaId];
  return info?.isPlayable ?? false;
}

export function getPlayableLeagueIds(): string[] {
  return Object.entries(COUNTRY_MAP)
    .filter(([_, v]) => v.isPlayable)
    .map(([k]) => k);
}

export const CONMEBOL_TEAM_DOMESTIC_LEAGUE: Record<string, string> = {
  "111011": "2209",
  "112868": "2209",
  "114611": "2209",
  "101099": "2209",
  "110975": "2209",
  "110982": "2209",
  "101103": "2209",
  "110989": "2209",
  "111328": "2209",
  "517": "2267",
  "101108": "2209",
  "111012": "2209",
  "112112": "2209",
  "112116": "2209",
  "113143": "2209",
  "114578": "2209",
  "115517": "2209",
  "131826": "2209",
  "101097": "2209",
  "110967": "2209",
  "101100": "2209",
  "110986": "2209",
  "110981": "2209",
  "111008": "2209",
  "111014": "2209",
  "111325": "2209",
  "112908": "2209",
  "112716": "2209",
  "111013": "2209",
  "101110": "2209",
"110968": "2209",
  "110991": "2209",
  "101105": "2209",
  "101101": "2209",
  "111722": "2209",
  "112659": "2209",
  "101104": "2209",
  "112705": "2209",
  "112853": "2209",
  "114577": "2209",
  "115693": "2209",
};

export function getConmebolTeamDomesticLeague(teamEaId: string): string | undefined {
  return CONMEBOL_TEAM_DOMESTIC_LEAGUE[teamEaId];
}