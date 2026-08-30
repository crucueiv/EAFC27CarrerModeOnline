export interface NationalTeamConfig {
  eaId: string;
  nameES: string;
  shortName: string;
  countryCode: string;
  flagId: number;
  confederation: "UEFA" | "CONMEBOL" | "AFC" | "CAF" | "CONCACAF";
}

export const NATIONAL_TEAMS_CONFIG: NationalTeamConfig[] = [
  // UEFA (21)
  { eaId: "45", nameES: "España", shortName: "ESP", countryCode: "ES", flagId: 45, confederation: "UEFA" },
  { eaId: "18", nameES: "Francia", shortName: "FRA", countryCode: "FR", flagId: 18, confederation: "UEFA" },
  { eaId: "13", nameES: "Inglaterra", shortName: "ENG", countryCode: "GB", flagId: 13, confederation: "UEFA" },
  { eaId: "19", nameES: "Alemania", shortName: "GER", countryCode: "DE", flagId: 19, confederation: "UEFA" },
  { eaId: "31", nameES: "Italia", shortName: "ITA", countryCode: "IT", flagId: 31, confederation: "UEFA" },
  { eaId: "10", nameES: "Países Bajos", shortName: "NED", countryCode: "NL", flagId: 10, confederation: "UEFA" },
  { eaId: "4", nameES: "Bélgica", shortName: "BEL", countryCode: "BE", flagId: 4, confederation: "UEFA" },
  { eaId: "308", nameES: "Portugal", shortName: "POR", countryCode: "PT", flagId: 308, confederation: "UEFA" },
  { eaId: "1", nameES: "Dinamarca", shortName: "DEN", countryCode: "DK", flagId: 1, confederation: "UEFA" },
  { eaId: "80", nameES: "Austria", shortName: "AUT", countryCode: "AT", flagId: 80, confederation: "UEFA" },
  { eaId: "41", nameES: "Noruega", shortName: "NOR", countryCode: "NO", flagId: 41, confederation: "UEFA" },
  { eaId: "56", nameES: "Suecia", shortName: "SWE", countryCode: "SE", flagId: 56, confederation: "UEFA" },
  { eaId: "189", nameES: "Suiza", shortName: "SUI", countryCode: "CH", flagId: 189, confederation: "UEFA" },
  { eaId: "68", nameES: "Turquía", shortName: "TUR", countryCode: "TR", flagId: 68, confederation: "UEFA" },
  { eaId: "66", nameES: "Polonia", shortName: "POL", countryCode: "PL", flagId: 66, confederation: "UEFA" },
  { eaId: "330", nameES: "Rumania", shortName: "ROU", countryCode: "RO", flagId: 330, confederation: "UEFA" },
  { eaId: "319", nameES: "República Checa", shortName: "CZE", countryCode: "CZ", flagId: 319, confederation: "UEFA" },
  { eaId: "317", nameES: "Croacia", shortName: "CRO", countryCode: "HR", flagId: 317, confederation: "UEFA" },
  { eaId: "322", nameES: "Finlandia", shortName: "FIN", countryCode: "FI", flagId: 322, confederation: "UEFA" },
  { eaId: "2211", nameES: "Hungría", shortName: "HUN", countryCode: "HU", flagId: 2211, confederation: "UEFA" },
  { eaId: "2244", nameES: "Azerbaiyán", shortName: "AZE", countryCode: "AZ", flagId: 2244, confederation: "UEFA" },
  { eaId: "63", nameES: "Grecia", shortName: "GRE", countryCode: "GR", flagId: 63, confederation: "UEFA" },
  { eaId: "2210", nameES: "Chipre", shortName: "CYP", countryCode: "CY", flagId: 2210, confederation: "UEFA" },
  { eaId: "322", nameES: "Finlandia", shortName: "FIN", countryCode: "FI", flagId: 322, confederation: "UEFA" },
  { eaId: "2210", nameES: "Chipre", shortName: "CYP", countryCode: "CY", flagId: 2210, confederation: "UEFA" },

  // CONMEBOL (5)
  { eaId: "353", nameES: "Argentina", shortName: "ARG", countryCode: "AR", flagId: 353, confederation: "CONMEBOL" },
  { eaId: "341", nameES: "Brasil", shortName: "BRA", countryCode: "BR", flagId: 341, confederation: "CONMEBOL" },
  { eaId: "2209", nameES: "Colombia", shortName: "COL", countryCode: "CO", flagId: 2209, confederation: "CONMEBOL" },
  { eaId: "2249", nameES: "Chile", shortName: "CHI", countryCode: "CL", flagId: 2249, confederation: "CONMEBOL" },
  { eaId: "58", nameES: "Perú", shortName: "PER", countryCode: "PE", flagId: 58, confederation: "CONMEBOL" },
  { eaId: "99", nameES: "Venezuela", shortName: "VEN", countryCode: "VE", flagId: 99, confederation: "CONMEBOL" },

  // AFC/CAF/CONCACAF
  { eaId: "350", nameES: "Arabia Saudí", shortName: "KSA", countryCode: "SA", flagId: 350, confederation: "AFC" },
  { eaId: "117", nameES: "Camerún", shortName: "CMR", countryCode: "CM", flagId: 117, confederation: "CAF" },
  { eaId: "95", nameES: "Estados Unidos", shortName: "USA", countryCode: "US", flagId: 95, confederation: "CONCACAF" },
  { eaId: "118", nameES: "Ghana", shortName: "GHA", countryCode: "GH", flagId: 118, confederation: "CAF" },
  { eaId: "2149", nameES: "India", shortName: "IND", countryCode: "IN", flagId: 2149, confederation: "AFC" },
  { eaId: "2271", nameES: "Indonesia", shortName: "IDN", countryCode: "ID", flagId: 2271, confederation: "AFC" },
  { eaId: "144", nameES: "Marruecos", shortName: "MAR", countryCode: "MA", flagId: 144, confederation: "CAF" },
  { eaId: "341", nameES: "México", shortName: "MEX", countryCode: "MX", flagId: 341, confederation: "CONCACAF" },
  { eaId: "350", nameES: "Catar", shortName: "QAT", countryCode: "QA", flagId: 350, confederation: "AFC" },
  { eaId: "234", nameES: "Vietnam", shortName: "VIE", countryCode: "VN", flagId: 234, confederation: "AFC" },
];

export function getNationalTeamFlagUrl(flagId: number): string {
  return `https://assets.easysbc.io/fc26/countries/${flagId}.png`;
}

export function getNationalTeamByEAId(eaId: string): NationalTeamConfig | undefined {
  return NATIONAL_TEAMS_CONFIG.find(n => n.eaId === eaId);
}

export function getNationalTeamsByConfederation(confed: "UEFA" | "CONMEBOL" | "AFC" | "CAF" | "CONCACAF"): NationalTeamConfig[] {
  return NATIONAL_TEAMS_CONFIG.filter(n => n.confederation === confed);
}