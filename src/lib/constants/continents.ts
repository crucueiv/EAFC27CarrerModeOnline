export const COUNTRY_TO_CONTINENT: Record<string, string> = {
  "Spain": "Europe", "England": "Europe", "Germany": "Europe", "Italy": "Europe", "France": "Europe",
  "Portugal": "Europe", "Netherlands": "Europe", "Belgium": "Europe", "Turkey": "Europe",
  "Russia": "Europe", "Ukraine": "Europe", "Poland": "Europe", "Greece": "Europe",
  "Scotland": "Europe", "Austria": "Europe", "Switzerland": "Europe", "Denmark": "Europe",
  "Sweden": "Europe", "Norway": "Europe", "Finland": "Europe", "Croatia": "Europe",
  "Serbia": "Europe", "Czech Republic": "Europe", "Romania": "Europe", "Hungary": "Europe",
  "Argentina": "South America", "Brazil": "South America", "Uruguay": "South America",
  "Colombia": "South America", "Chile": "South America", "Paraguay": "South America",
  "Ecuador": "South America", "Peru": "South America", "Bolivia": "South America",
  "Venezuela": "South America",
  "Mexico": "North America", "USA": "North America", "Canada": "North America",
  "Costa Rica": "North America", "Honduras": "North America", "Jamaica": "North America",
  "Nigeria": "Africa", "Egypt": "Africa", "Senegal": "Africa", "Morocco": "Africa",
  "Tunisia": "Africa", "Algeria": "Africa", "Cameroon": "Africa", "Ghana": "Africa",
  "Ivory Coast": "Africa", "South Africa": "Africa", "DR Congo": "Africa", "Mali": "Africa",
  "Japan": "Asia", "South Korea": "Asia", "Iran": "Asia", "Saudi Arabia": "Asia",
  "Qatar": "Asia", "Australia": "Asia", "China": "Asia", "Uzbekistan": "Asia",
  "New Zealand": "Oceania",
};

export function getContinent(country: string): string {
  return COUNTRY_TO_CONTINENT[country] || "Europe";
}

export const CONTINENTS = [
  "Europe",
  "South America",
  "North America",
  "Africa",
  "Asia",
  "Oceania"
] as const;