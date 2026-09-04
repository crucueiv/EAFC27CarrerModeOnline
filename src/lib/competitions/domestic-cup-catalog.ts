export type DomesticCupSpec = {
  eaId: string;
  name: string;
  country: string;
  format: "SINGLE_ELIMINATION" | "TWO_ROUND";
  continent: "UEFA" | "CONMEBOL";
  affectsContinentSlot: "CHAMPIONS" | "EUROPA" | "CONFERENCE" | "LIBERTADORES" | "SUDAMERICANA";
};

export const DOMESTIC_CUP_CATALOG: DomesticCupSpec[] = [
  { eaId: "53", name: "Copa del Rey", country: "Spain", format: "SINGLE_ELIMINATION", continent: "UEFA", affectsContinentSlot: "CONFERENCE" },
  { eaId: "13", name: "FA Cup", country: "England", format: "SINGLE_ELIMINATION", continent: "UEFA", affectsContinentSlot: "CONFERENCE" },
  { eaId: "31", name: "Coppa Italia", country: "Italy", format: "SINGLE_ELIMINATION", continent: "UEFA", affectsContinentSlot: "CONFERENCE" },
  { eaId: "19", name: "DFB-Pokal", country: "Germany", format: "SINGLE_ELIMINATION", continent: "UEFA", affectsContinentSlot: "CONFERENCE" },
  { eaId: "16", name: "Coupe de France", country: "France", format: "SINGLE_ELIMINATION", continent: "UEFA", affectsContinentSlot: "EUROPA" },
  { eaId: "308", name: "Taça de Portugal", country: "Portugal", format: "SINGLE_ELIMINATION", continent: "UEFA", affectsContinentSlot: "CONFERENCE" },
  { eaId: "10", name: "KNVB Beker", country: "Netherlands", format: "SINGLE_ELIMINATION", continent: "UEFA", affectsContinentSlot: "CONFERENCE" },
  { eaId: "4", name: "Copa de Bélgica", country: "Belgium", format: "SINGLE_ELIMINATION", continent: "UEFA", affectsContinentSlot: "CONFERENCE" },
  { eaId: "353", name: "Copa Argentina", country: "Argentina", format: "SINGLE_ELIMINATION", continent: "CONMEBOL", affectsContinentSlot: "LIBERTADORES" },
  { eaId: "2209", name: "Copa Colombia", country: "Colombia", format: "SINGLE_ELIMINATION", continent: "CONMEBOL", affectsContinentSlot: "SUDAMERICANA" },
];

export function getDomesticCupForLeague(eaId: string | null | undefined): DomesticCupSpec | null {
  if (!eaId) return null;
  return DOMESTIC_CUP_CATALOG.find((c) => c.eaId === eaId) ?? null;
}
