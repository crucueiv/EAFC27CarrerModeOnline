import { type LeagueFormatSpec } from "@/lib/league-formats/catalog";
import { type ContinentSpots } from "@/lib/coefficients/resolveContinentSpots";
import { continentToZoneGroup, type ZoneId } from "./zones";

export type ZoneComputationInput = {
  rank: number;
  totalTeams: number;
  format: LeagueFormatSpec;
  spots: ContinentSpots;
  isTopDivision: boolean;
  hasRelegationZone: boolean;
  continent: string;
};

export function getZoneForRank(input: ZoneComputationInput): ZoneId {
  const { rank, totalTeams, format, spots, isTopDivision, hasRelegationZone, continent } = input;
  const continentGroup = continentToZoneGroup(continent);

  if (format.splitConfig) {
    const upperSize = format.splitConfig.upperGroupSize;
    if (rank <= upperSize) return "SPLIT_UPPER";
    return "SPLIT_LOWER";
  }

  if (rank === 1) return "CHAMPION";

  if (format.promotion?.type === "DIRECT") {
    const directPromoStart = 2;
    const directPromoEnd = 1 + format.promotion.slots;
    if (rank >= directPromoStart && rank <= directPromoEnd) return "DIRECT_PROMOTION";
  }

  const showContinental =
    isTopDivision && (continentGroup === "UEFA" || continentGroup === "CONMEBOL");

  if (showContinental) {
    if (continentGroup === "UEFA") {
      const championsDirectEnd = 1 + spots.championsDirect;
      if (rank <= championsDirectEnd) return "CONTINENTAL_DIRECT";

      const championsPlayoffEnd = championsDirectEnd + spots.championsPlayoffSlots;
      if (rank <= championsPlayoffEnd) return "CONTINENTAL_PLAYOFF";

      const championsQualifyingEnd = championsPlayoffEnd + spots.championsQualifying;
      if (rank <= championsQualifyingEnd) return "CONTINENTAL_QUALIFYING";

      const europaEnd = championsQualifyingEnd + spots.europa;
      if (rank <= europaEnd) return "SECONDARY_DIRECT";

      const conferenceEnd = europaEnd + spots.conference;
      if (rank <= conferenceEnd) return "CONFERENCE_DIRECT";
    } else if (continentGroup === "CONMEBOL") {
      const libertadoresDirectEnd = 1 + spots.libertadoresDirect;
      if (rank <= libertadoresDirectEnd) return "CONTINENTAL_DIRECT";

      const libertadoresQualifyingEnd =
        libertadoresDirectEnd + spots.libertadoresQualifying;
      if (rank <= libertadoresQualifyingEnd) return "CONTINENTAL_QUALIFYING";

      const sudamericanaEnd = libertadoresQualifyingEnd + spots.sudamericana;
      if (rank <= sudamericanaEnd) return "SECONDARY_DIRECT";
    }
  }

  if (format.promotion?.playoffSlots && format.promotion.playoffSlots > 0) {
    const playoffStart = format.promotion.playoffTopN ?? 1 + format.promotion.slots;
    const playoffEnd = playoffStart + format.promotion.playoffSlots - 1;
    if (rank >= playoffStart && rank <= playoffEnd) return "PLAYOFF_PROMOTION";
  }

  if (hasRelegationZone && format.relegation) {
    if (format.relegation.type === "RELEGATION_PLAYOFF" || format.relegation.type === "PLAYOUT") {
      if (format.relegation.playoffSlots && format.relegation.playoffSlots > 0) {
        const relStart = totalTeams - format.relegation.slots + 1;
        const playRelEnd = relStart - 1;
        const playRelStart = playRelEnd - format.relegation.playoffSlots + 1;
        if (rank >= playRelStart && rank <= playRelEnd) return "PLAYOFF_RELEGATION";
      }
    }
    if (format.relegation.slots > 0) {
      const relStart = totalTeams - format.relegation.slots + 1;
      if (rank >= relStart) return "RELEGATION_DIRECT";
    }
  }

  return "MID_TABLE";
}
