export type ContinentZoneGroup = "UEFA" | "CONMEBOL" | "NONE";

export type ZoneId =
  | "CHAMPION"
  | "SPLIT_UPPER"
  | "SPLIT_LOWER"
  | "CONTINENTAL_DIRECT"
  | "CONTINENTAL_PLAYOFF"
  | "CONTINENTAL_QUALIFYING"
  | "SECONDARY_DIRECT"
  | "SECONDARY_QUALIFYING"
  | "CONFERENCE_DIRECT"
  | "CONFERENCE_QUALIFYING"
  | "MID_TABLE"
  | "PLAYOFF_PROMOTION"
  | "DIRECT_PROMOTION"
  | "PLAYOFF_RELEGATION"
  | "RELEGATION_DIRECT";

export type ZoneStyle = {
  hex: string;
  label: string;
  labelsByContinent?: Record<ContinentZoneGroup, string>;
  tailwind: {
    border: string;
    rowBg: string;
    pill: string;
    accent: string;
  };
};

const CONTINENTAL_PRIMARY_BY_GROUP: Record<ContinentZoneGroup, string> = {
  UEFA: "Champions League",
  CONMEBOL: "Copa Libertadores",
  NONE: "Competición continental",
};

const CONTINENTAL_SECONDARY_BY_GROUP: Record<ContinentZoneGroup, string> = {
  UEFA: "Europa League",
  CONMEBOL: "Copa Sudamericana",
  NONE: "Competición secundaria",
};

const CONTINENTAL_TERTIARY_BY_GROUP: Record<ContinentZoneGroup, string> = {
  UEFA: "Conference League",
  CONMEBOL: "Copa Sudamericana",
  NONE: "Competición secundaria",
};

export const ZONE_CATALOG: Record<ZoneId, ZoneStyle> = {
  CHAMPION: {
    hex: "#FFD700",
    label: "Campeón",
    tailwind: {
      border: "border-amber-400",
      rowBg: "border-l-[6px] border-amber-400 bg-gradient-to-r from-amber-100 via-amber-100/80 to-transparent dark:from-amber-500/20 dark:via-amber-500/10 dark:to-transparent",
      pill: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-300 dark:text-amber-300",
      accent: "bg-amber-400",
    },
  },
  SPLIT_UPPER: {
    hex: "#0EA5E9",
    label: "Zona alta",
    tailwind: {
      border: "border-sky-500",
      rowBg: "border-l-[6px] border-sky-500 bg-gradient-to-r from-sky-100 via-sky-100/70 to-transparent dark:from-sky-500/20 dark:via-sky-500/10 dark:to-transparent",
      pill: "bg-sky-500/10 text-sky-700 ring-1 ring-sky-300 dark:text-sky-300",
      accent: "bg-sky-500",
    },
  },
  SPLIT_LOWER: {
    hex: "#7C3AED",
    label: "Zona baja",
    tailwind: {
      border: "border-violet-600",
      rowBg: "border-l-[6px] border-violet-600 bg-gradient-to-r from-violet-100 via-violet-100/70 to-transparent dark:from-violet-500/20 dark:via-violet-500/10 dark:to-transparent",
      pill: "bg-violet-500/10 text-violet-700 ring-1 ring-violet-300 dark:text-violet-300",
      accent: "bg-violet-600",
    },
  },
  CONTINENTAL_DIRECT: {
    hex: "#0B3D91",
    label: "Competición continental (directo)",
    labelsByContinent: {
      UEFA: "Champions League (directo)",
      CONMEBOL: "Copa Libertadores (directo)",
      NONE: "Competición continental (directo)",
    },
    tailwind: {
      border: "border-blue-900",
      rowBg: "border-l-[6px] border-blue-900 bg-gradient-to-r from-blue-100 via-blue-100/70 to-transparent dark:from-blue-900/20 dark:via-blue-900/10 dark:to-transparent",
      pill: "bg-blue-900/10 text-blue-900 ring-1 ring-blue-700/40 dark:text-blue-300",
      accent: "bg-blue-900",
    },
  },
  CONTINENTAL_QUALIFYING: {
    hex: "#4FA8FF",
    label: "Competición continental (clasificación)",
    labelsByContinent: {
      UEFA: "Champions League (clasificación)",
      CONMEBOL: "Copa Libertadores (clasificación)",
      NONE: "Competición continental (clasificación)",
    },
    tailwind: {
      border: "border-sky-400",
      rowBg: "border-l-[6px] border-sky-400 bg-gradient-to-r from-sky-100 via-sky-100/70 to-transparent dark:from-sky-400/20 dark:via-sky-400/10 dark:to-transparent",
      pill: "bg-sky-400/10 text-sky-700 ring-1 ring-sky-300 dark:text-sky-300",
      accent: "bg-sky-400",
    },
  },
  CONTINENTAL_PLAYOFF: {
    hex: "#1E3A8A",
    label: "Competición continental (ronda previa)",
    labelsByContinent: {
      UEFA: "Champions League (ronda previa)",
      CONMEBOL: "Copa Libertadores (ronda previa)",
      NONE: "Competición continental (ronda previa)",
    },
    tailwind: {
      border: "border-indigo-700",
      rowBg: "border-l-[6px] border-indigo-700 bg-gradient-to-r from-indigo-100 via-indigo-100/70 to-transparent dark:from-indigo-700/20 dark:via-indigo-700/10 dark:to-transparent",
      pill: "bg-indigo-700/10 text-indigo-700 ring-1 ring-indigo-400 dark:text-indigo-300",
      accent: "bg-indigo-700",
    },
  },
  SECONDARY_DIRECT: {
    hex: "#FF7A00",
    label: "Competición secundaria (directo)",
    labelsByContinent: {
      UEFA: "Europa League (directo)",
      CONMEBOL: "Copa Sudamericana (directo)",
      NONE: "Competición secundaria (directo)",
    },
    tailwind: {
      border: "border-orange-500",
      rowBg: "border-l-[6px] border-orange-500 bg-gradient-to-r from-orange-100 via-orange-100/70 to-transparent dark:from-orange-500/20 dark:via-orange-500/10 dark:to-transparent",
      pill: "bg-orange-500/10 text-orange-700 ring-1 ring-orange-300 dark:text-orange-300",
      accent: "bg-orange-500",
    },
  },
  SECONDARY_QUALIFYING: {
    hex: "#FFB366",
    label: "Competición secundaria (clasificación)",
    labelsByContinent: {
      UEFA: "Europa League (clasificación)",
      CONMEBOL: "Copa Sudamericana (clasificación)",
      NONE: "Competición secundaria (clasificación)",
    },
    tailwind: {
      border: "border-orange-300",
      rowBg: "border-l-[6px] border-orange-300 bg-gradient-to-r from-orange-100/60 via-orange-100/40 to-transparent dark:from-orange-300/20 dark:via-orange-300/10 dark:to-transparent",
      pill: "bg-orange-300/15 text-orange-700 ring-1 ring-orange-300 dark:text-orange-300",
      accent: "bg-orange-300",
    },
  },
  CONFERENCE_DIRECT: {
    hex: "#2E9E44",
    label: "Conference League (directo)",
    labelsByContinent: {
      UEFA: "Conference League (directo)",
      CONMEBOL: "Copa Sudamericana (directo)",
      NONE: "Competición secundaria (directo)",
    },
    tailwind: {
      border: "border-emerald-500",
      rowBg: "border-l-[6px] border-emerald-500 bg-gradient-to-r from-emerald-100 via-emerald-100/70 to-transparent dark:from-emerald-500/20 dark:via-emerald-500/10 dark:to-transparent",
      pill: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-300 dark:text-emerald-300",
      accent: "bg-emerald-500",
    },
  },
  CONFERENCE_QUALIFYING: {
    hex: "#8FD19E",
    label: "Conference League (clasificación)",
    labelsByContinent: {
      UEFA: "Conference League (clasificación)",
      CONMEBOL: "Copa Sudamericana (clasificación)",
      NONE: "Competición secundaria (clasificación)",
    },
    tailwind: {
      border: "border-emerald-300",
      rowBg: "border-l-[6px] border-emerald-300 bg-gradient-to-r from-emerald-100/60 via-emerald-100/40 to-transparent dark:from-emerald-300/20 dark:via-emerald-300/10 dark:to-transparent",
      pill: "bg-emerald-300/15 text-emerald-700 ring-1 ring-emerald-300 dark:text-emerald-300",
      accent: "bg-emerald-300",
    },
  },
  MID_TABLE: {
    hex: "#F2F2F2",
    label: "Zona media",
    tailwind: {
      border: "border-slate-200",
      rowBg: "border-l-[6px] border-slate-200 bg-transparent",
      pill: "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
      accent: "bg-slate-300",
    },
  },
  PLAYOFF_PROMOTION: {
    hex: "#8E44AD",
    label: "Play-off de ascenso",
    tailwind: {
      border: "border-violet-500",
      rowBg: "border-l-[6px] border-violet-500 bg-gradient-to-r from-violet-100 via-violet-100/70 to-transparent dark:from-violet-500/20 dark:via-violet-500/10 dark:to-transparent",
      pill: "bg-violet-500/10 text-violet-700 ring-1 ring-violet-300 dark:text-violet-300",
      accent: "bg-violet-500",
    },
  },
  DIRECT_PROMOTION: {
    hex: "#17A398",
    label: "Ascenso directo",
    tailwind: {
      border: "border-teal-500",
      rowBg: "border-l-[6px] border-teal-500 bg-gradient-to-r from-teal-100 via-teal-100/70 to-transparent dark:from-teal-500/20 dark:via-teal-500/10 dark:to-transparent",
      pill: "bg-teal-500/10 text-teal-700 ring-1 ring-teal-300 dark:text-teal-300",
      accent: "bg-teal-500",
    },
  },
  PLAYOFF_RELEGATION: {
    hex: "#F2A900",
    label: "Play-off de permanencia",
    tailwind: {
      border: "border-amber-500",
      rowBg: "border-l-[6px] border-amber-500 bg-gradient-to-r from-amber-100 via-amber-100/70 to-transparent dark:from-amber-500/20 dark:via-amber-500/10 dark:to-transparent",
      pill: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-300 dark:text-amber-300",
      accent: "bg-amber-500",
    },
  },
  RELEGATION_DIRECT: {
    hex: "#D32F2F",
    label: "Descenso directo",
    tailwind: {
      border: "border-rose-600",
      rowBg: "border-l-[6px] border-rose-600 bg-gradient-to-r from-rose-100 via-rose-100/70 to-transparent dark:from-rose-600/20 dark:via-rose-600/10 dark:to-transparent",
      pill: "bg-rose-600/10 text-rose-700 ring-1 ring-rose-400 dark:text-rose-300",
      accent: "bg-rose-600",
    },
  },
};

export function continentToZoneGroup(continent: string | null | undefined): ContinentZoneGroup {
  if (continent === "Europe" || continent === "Europa") return "UEFA";
  if (continent === "South America" || continent === "Sudamérica" || continent === "Sudamerica")
    return "CONMEBOL";
  return "NONE";
}

export function getZoneStyle(zone: ZoneId, continent?: string | null): ZoneStyle {
  const style = ZONE_CATALOG[zone];
  if (!continent) return style;
  const group = continentToZoneGroup(continent);
  const label = style.labelsByContinent?.[group] ?? style.label;
  return { ...style, label };
}

export const ZONE_ORDER: ZoneId[] = [
  "CHAMPION",
  "SPLIT_UPPER",
  "SPLIT_LOWER",
  "CONTINENTAL_DIRECT",
  "CONTINENTAL_PLAYOFF",
  "CONTINENTAL_QUALIFYING",
  "SECONDARY_DIRECT",
  "SECONDARY_QUALIFYING",
  "CONFERENCE_DIRECT",
  "CONFERENCE_QUALIFYING",
  "MID_TABLE",
  "PLAYOFF_PROMOTION",
  "DIRECT_PROMOTION",
  "PLAYOFF_RELEGATION",
  "RELEGATION_DIRECT",
];

export const CONTINENTAL_PRIMARY_LABEL = CONTINENTAL_PRIMARY_BY_GROUP;
export const CONTINENTAL_SECONDARY_LABEL = CONTINENTAL_SECONDARY_BY_GROUP;
export const CONTINENTAL_TERTIARY_LABEL = CONTINENTAL_TERTIARY_BY_GROUP;

export type CompetitionBadgeKey =
  | "CHAMPIONS"
  | "EUROPA"
  | "CONFERENCE"
  | "LIBERTADORES"
  | "SUDAMERICANA";

export const COMPETITION_BADGES: Record<CompetitionBadgeKey, string> = {
  CHAMPIONS:
    "https://res.cloudinary.com/oiugg8m6/image/upload/v1788444448/pw8twyoixop3s8jmymh5.png",
  EUROPA:
    "https://res.cloudinary.com/oiugg8m6/image/upload/v1788444469/ewax4xrbsza4rkbkbqhv.png",
  CONFERENCE:
    "https://res.cloudinary.com/oiugg8m6/image/upload/v1788444496/rulvz93ao3un05xmwwo1.png",
  LIBERTADORES:
    "https://res.cloudinary.com/oiugg8m6/image/upload/v1788444523/uqfotjipjptxndylrybv.png",
  SUDAMERICANA:
    "https://res.cloudinary.com/oiugg8m6/image/upload/v1788444566/xm2hk1jgi7s6rkkzflmo.png",
};

export function getBadgeForZone(
  zone: ZoneId,
  continent: string | null | undefined,
  isTopDivision = false,
): { url: string; alt: string } | null {
  const group = continentToZoneGroup(continent);

  if (zone === "CHAMPION") {
    if (!isTopDivision) return null;
    if (group === "UEFA") {
      return { url: COMPETITION_BADGES.CHAMPIONS, alt: "Champions League" };
    }
    if (group === "CONMEBOL") {
      return { url: COMPETITION_BADGES.LIBERTADORES, alt: "Copa Libertadores" };
    }
    return null;
  }

  if (group === "UEFA") {
    if (zone === "CONTINENTAL_DIRECT" || zone === "CONTINENTAL_QUALIFYING") {
      return { url: COMPETITION_BADGES.CHAMPIONS, alt: "Champions League" };
    }
    if (zone === "SECONDARY_DIRECT" || zone === "SECONDARY_QUALIFYING") {
      return { url: COMPETITION_BADGES.EUROPA, alt: "Europa League" };
    }
    if (zone === "CONFERENCE_DIRECT" || zone === "CONFERENCE_QUALIFYING") {
      return { url: COMPETITION_BADGES.CONFERENCE, alt: "Conference League" };
    }
  }

  if (group === "CONMEBOL") {
    if (zone === "CONTINENTAL_DIRECT" || zone === "CONTINENTAL_QUALIFYING") {
      return { url: COMPETITION_BADGES.LIBERTADORES, alt: "Copa Libertadores" };
    }
    if (
      zone === "SECONDARY_DIRECT" ||
      zone === "SECONDARY_QUALIFYING" ||
      zone === "CONFERENCE_DIRECT" ||
      zone === "CONFERENCE_QUALIFYING"
    ) {
      return { url: COMPETITION_BADGES.SUDAMERICANA, alt: "Copa Sudamericana" };
    }
  }

  return null;
}
