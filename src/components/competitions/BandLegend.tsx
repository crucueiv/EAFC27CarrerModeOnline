import Image from "next/image";
import { getLeagueBandClasses, type CompetitionBand } from "@/lib/competitions";
import {
  ZONE_ORDER,
  type ZoneId,
  continentToZoneGroup,
  getBadgeForZone,
} from "@/lib/competitions/zones";
import type { ContinentSpots } from "@/lib/coefficients/resolveContinentSpots";
import type { LeagueFormatSpec } from "@/lib/league-formats/catalog";

type BandLegendProps = {
  continent: string;
  isTopDivision: boolean;
  hasRelegationZone: boolean;
  spots: ContinentSpots;
  format: LeagueFormatSpec | null;
};

function buildVisibleZones({
  continent,
  isTopDivision,
  hasRelegationZone,
  spots,
  format,
}: BandLegendProps): ZoneId[] {
  const out = new Set<ZoneId>();
  out.add("CHAMPION");
  out.add("MID_TABLE");

  if (format?.splitConfig) {
    out.add("SPLIT_UPPER");
    out.add("SPLIT_LOWER");
  }

  const continentGroup = continentToZoneGroup(continent);
  const showContinental =
    isTopDivision && (continentGroup === "UEFA" || continentGroup === "CONMEBOL");

  if (showContinental) {
    if (continentGroup === "UEFA") {
      if (spots.championsDirect > 0) out.add("CONTINENTAL_DIRECT");
      if (spots.championsQualifying > 0) out.add("CONTINENTAL_QUALIFYING");
      if (spots.europa > 0) out.add("SECONDARY_DIRECT");
      if (spots.conference > 0) out.add("CONFERENCE_DIRECT");
    } else if (continentGroup === "CONMEBOL") {
      const libertadores = spots.libertadoresDirect + spots.libertadoresQualifying;
      if (libertadores > 0) {
        if (spots.libertadoresDirect > 0) out.add("CONTINENTAL_DIRECT");
        if (spots.libertadoresQualifying > 0) out.add("CONTINENTAL_QUALIFYING");
      }
      if (spots.sudamericana > 0) out.add("SECONDARY_DIRECT");
    }
  }

  if (format?.promotion) {
    if (format.promotion.slots > 0) out.add("DIRECT_PROMOTION");
    if (format.promotion.playoffSlots && format.promotion.playoffSlots > 0) {
      out.add("PLAYOFF_PROMOTION");
    }
  }

  if (hasRelegationZone && format?.relegation) {
    if (format.relegation.slots > 0) out.add("RELEGATION_DIRECT");
    if (format.relegation.playoffSlots && format.relegation.playoffSlots > 0) {
      out.add("PLAYOFF_RELEGATION");
    }
  }

  return ZONE_ORDER.filter((z) => out.has(z));
}

export default function BandLegend({
  continent,
  isTopDivision,
  hasRelegationZone,
  spots,
  format,
}: BandLegendProps) {
  const visible = buildVisibleZones({
    continent,
    isTopDivision,
    hasRelegationZone,
    spots,
    format,
  });

  if (visible.length === 0 && !format?.splitConfig) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {format?.splitConfig && (
        <>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${getLeagueBandClasses("SPLIT_UPPER" as CompetitionBand, continent).pill}`}
          >
            <span className="h-2 w-2 rounded-full bg-current opacity-80" />
            {format.splitConfig.upperGroupName}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${getLeagueBandClasses("SPLIT_LOWER" as CompetitionBand, continent).pill}`}
          >
            <span className="h-2 w-2 rounded-full bg-current opacity-80" />
            {format.splitConfig.lowerGroupName}
          </span>
        </>
      )}
      {visible.map((band) => {
        const { pill, label } = getLeagueBandClasses(band as CompetitionBand, continent);
        const badge = getBadgeForZone(band, continent, isTopDivision);
        return (
          <span
            key={band}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${pill}`}
          >
            {badge ? (
              <Image
                src={badge.url}
                alt={badge.alt}
                width={14}
                height={14}
                unoptimized
                className="h-[14px] w-[14px] object-contain"
              />
            ) : (
              <span className="h-2 w-2 rounded-full bg-current opacity-80" />
            )}
            {label}
          </span>
        );
      })}
    </div>
  );
}
