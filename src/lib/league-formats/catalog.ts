export type LeagueFormatKind =
  | "SINGLE_TABLE"
  | "SINGLE_TABLE_PLAYOFF"
  | "SPLIT_GROUPS"
  | "TWO_SHORT_TOURNAMENTS"
  | "CONFERENCE_PLAYOFF";

export type PromotionRelegationType =
  | "DIRECT"
  | "PLAYOFF"
  | "RELEGATION_PLAYOFF"
  | "PLAYOUT"
  | "NONE";

export type SplitBonusKind =
  | "BELGIUM_DIVIDE_POINTS"
  | "KLEAGUE_CUMULATIVE"
  | "AUSTRIA_SPLIT";

export type LeagueFormatSpec = {
  eaId: string;
  kind: LeagueFormatKind;
  totalTeams: number;
  roundsRegular: number;
  hasReturn: boolean;
  hasTitlePlayoff?: boolean;
  titlePlayoffTopN?: number;
  titlePlayoffFormat?: "KNOCKOUT" | "PAGE_MCINTYRE" | "ROUND_ROBIN";
  promotion?: { type: PromotionRelegationType; slots: number; playoffSlots?: number; playoffTopN?: number };
  relegation?: { type: PromotionRelegationType; slots: number; playoffSlots?: number; playoffBottomN?: number };
  tournamentCount?: number;
  hasAnnualTable?: boolean;
  annualTableWinsCopaLibertadores?: boolean;
  usesReclasiTable?: boolean;
  homeAndAwayBonus?: SplitBonusKind;
  higherLeagueEaId?: string;
  calendarSpanWeeks?: number;
  matchweekIntervalDays?: number;
  splitConfig?: {
    upperGroupName: string;
    upperGroupSize: number;
    upperGroupFormat: "ROUND_ROBIN" | "PLAYOFF";
    lowerGroupName: string;
    lowerGroupSize: number;
    lowerGroupFormat: "ROUND_ROBIN" | "RELEGATION_PLAYOFF";
    pointsMultiplier?: number;
    cumulativePoints?: boolean;
  };
};

export const LEAGUE_FORMAT_CATALOG: LeagueFormatSpec[] = [
  {
    eaId: "13",
    kind: "SINGLE_TABLE",
    totalTeams: 20,
    roundsRegular: 38,
    hasReturn: true,
    relegation: { type: "DIRECT", slots: 3 },
  },
  {
    eaId: "14",
    kind: "SINGLE_TABLE",
    totalTeams: 24,
    roundsRegular: 46,
    hasReturn: true,
    promotion: { type: "DIRECT", slots: 1, playoffSlots: 4, playoffTopN: 3 },
    relegation: { type: "DIRECT", slots: 3 },
    higherLeagueEaId: "13",
  },
  {
    eaId: "60",
    kind: "SINGLE_TABLE",
    totalTeams: 24,
    roundsRegular: 46,
    hasReturn: true,
    promotion: { type: "DIRECT", slots: 1, playoffSlots: 4, playoffTopN: 3 },
    relegation: { type: "DIRECT", slots: 4 },
    higherLeagueEaId: "14",
  },
  {
    eaId: "61",
    kind: "SINGLE_TABLE",
    totalTeams: 24,
    roundsRegular: 46,
    hasReturn: true,
    promotion: { type: "DIRECT", slots: 2, playoffSlots: 4, playoffTopN: 4 },
    relegation: { type: "DIRECT", slots: 2 },
    higherLeagueEaId: "60",
  },
  {
    eaId: "53",
    kind: "SINGLE_TABLE",
    totalTeams: 20,
    roundsRegular: 38,
    hasReturn: true,
    relegation: { type: "DIRECT", slots: 3 },
  },
  {
    eaId: "54",
    kind: "SINGLE_TABLE",
    totalTeams: 22,
    roundsRegular: 42,
    hasReturn: true,
    promotion: { type: "DIRECT", slots: 1, playoffSlots: 4, playoffTopN: 3 },
    relegation: { type: "DIRECT", slots: 4 },
    higherLeagueEaId: "53",
  },
  {
    eaId: "31",
    kind: "SINGLE_TABLE",
    totalTeams: 20,
    roundsRegular: 38,
    hasReturn: true,
    relegation: { type: "DIRECT", slots: 3 },
  },
  {
    eaId: "32",
    kind: "SINGLE_TABLE",
    totalTeams: 20,
    roundsRegular: 38,
    hasReturn: true,
    promotion: { type: "DIRECT", slots: 1, playoffSlots: 6, playoffTopN: 3 },
    relegation: { type: "DIRECT", slots: 3 },
    higherLeagueEaId: "31",
  },
  {
    eaId: "19",
    kind: "SINGLE_TABLE",
    totalTeams: 18,
    roundsRegular: 34,
    hasReturn: true,
    relegation: { type: "RELEGATION_PLAYOFF", slots: 2, playoffSlots: 1, playoffBottomN: 16 },
  },
  {
    eaId: "20",
    kind: "SINGLE_TABLE",
    totalTeams: 18,
    roundsRegular: 34,
    hasReturn: true,
    promotion: { type: "DIRECT", slots: 1, playoffSlots: 1, playoffTopN: 3 },
    relegation: { type: "RELEGATION_PLAYOFF", slots: 2, playoffSlots: 1, playoffBottomN: 16 },
    higherLeagueEaId: "19",
  },
  {
    eaId: "2076",
    kind: "SINGLE_TABLE",
    totalTeams: 20,
    roundsRegular: 38,
    hasReturn: true,
    promotion: { type: "DIRECT", slots: 1, playoffSlots: 1, playoffTopN: 3 },
    relegation: { type: "DIRECT", slots: 4 },
    higherLeagueEaId: "20",
  },
  {
    eaId: "16",
    kind: "SINGLE_TABLE",
    totalTeams: 18,
    roundsRegular: 34,
    hasReturn: true,
    relegation: { type: "RELEGATION_PLAYOFF", slots: 2, playoffSlots: 1, playoffBottomN: 16 },
  },
  {
    eaId: "17",
    kind: "SINGLE_TABLE",
    totalTeams: 18,
    roundsRegular: 34,
    hasReturn: true,
    promotion: { type: "DIRECT", slots: 1, playoffSlots: 3, playoffTopN: 3 },
    relegation: { type: "DIRECT", slots: 2 },
    higherLeagueEaId: "16",
  },
  {
    eaId: "10",
    kind: "SINGLE_TABLE",
    totalTeams: 18,
    roundsRegular: 34,
    hasReturn: true,
    relegation: { type: "RELEGATION_PLAYOFF", slots: 2, playoffSlots: 1, playoffBottomN: 16 },
  },
  {
    eaId: "308",
    kind: "SINGLE_TABLE",
    totalTeams: 18,
    roundsRegular: 34,
    hasReturn: true,
    relegation: { type: "RELEGATION_PLAYOFF", slots: 2, playoffSlots: 1, playoffBottomN: 16 },
  },
  {
    eaId: "4",
    kind: "SPLIT_GROUPS",
    totalTeams: 16,
    roundsRegular: 30,
    hasReturn: true,
    hasTitlePlayoff: true,
    relegation: { type: "DIRECT", slots: 1 },
    homeAndAwayBonus: "BELGIUM_DIVIDE_POINTS",
    splitConfig: {
      upperGroupName: "Champions Play-off",
      upperGroupSize: 6,
      upperGroupFormat: "ROUND_ROBIN",
      lowerGroupName: "Relegation Play-off",
      lowerGroupSize: 4,
      lowerGroupFormat: "RELEGATION_PLAYOFF",
      pointsMultiplier: 0.5,
    },
  },
  {
    eaId: "50",
    kind: "SPLIT_GROUPS",
    totalTeams: 12,
    roundsRegular: 33,
    hasReturn: false,
    relegation: { type: "RELEGATION_PLAYOFF", slots: 1, playoffSlots: 1, playoffBottomN: 11 },
    homeAndAwayBonus: "AUSTRIA_SPLIT",
    splitConfig: {
      upperGroupName: "Championship Group",
      upperGroupSize: 6,
      upperGroupFormat: "ROUND_ROBIN",
      lowerGroupName: "Relegation Group",
      lowerGroupSize: 6,
      lowerGroupFormat: "ROUND_ROBIN",
    },
  },
  {
    eaId: "80",
    kind: "SPLIT_GROUPS",
    totalTeams: 12,
    roundsRegular: 22,
    hasReturn: true,
    relegation: { type: "DIRECT", slots: 1 },
    splitConfig: {
      upperGroupName: "Meistergruppe",
      upperGroupSize: 6,
      upperGroupFormat: "ROUND_ROBIN",
      lowerGroupName: "Qualifikationsgruppe",
      lowerGroupSize: 6,
      lowerGroupFormat: "ROUND_ROBIN",
      pointsMultiplier: 0.5,
    },
  },
  {
    eaId: "1",
    kind: "SPLIT_GROUPS",
    totalTeams: 12,
    roundsRegular: 22,
    hasReturn: true,
    relegation: { type: "DIRECT", slots: 2 },
    splitConfig: {
      upperGroupName: "Championship Round",
      upperGroupSize: 6,
      upperGroupFormat: "ROUND_ROBIN",
      lowerGroupName: "Relegation Round",
      lowerGroupSize: 6,
      lowerGroupFormat: "ROUND_ROBIN",
      pointsMultiplier: 0.5,
    },
  },
  {
    eaId: "189",
    kind: "SPLIT_GROUPS",
    totalTeams: 12,
    roundsRegular: 33,
    hasReturn: false,
    relegation: { type: "RELEGATION_PLAYOFF", slots: 1, playoffSlots: 1, playoffBottomN: 11 },
    splitConfig: {
      upperGroupName: "Championship Group",
      upperGroupSize: 6,
      upperGroupFormat: "ROUND_ROBIN",
      lowerGroupName: "Relegation Group",
      lowerGroupSize: 6,
      lowerGroupFormat: "ROUND_ROBIN",
      pointsMultiplier: 0.5,
    },
  },
  {
    eaId: "330",
    kind: "SPLIT_GROUPS",
    totalTeams: 16,
    roundsRegular: 30,
    hasReturn: true,
    relegation: { type: "RELEGATION_PLAYOFF", slots: 2, playoffSlots: 2, playoffBottomN: 13 },
    splitConfig: {
      upperGroupName: "Championship Play-off",
      upperGroupSize: 6,
      upperGroupFormat: "ROUND_ROBIN",
      lowerGroupName: "Play-out",
      lowerGroupSize: 10,
      lowerGroupFormat: "ROUND_ROBIN",
    },
  },
  {
    eaId: "319",
    kind: "SPLIT_GROUPS",
    totalTeams: 16,
    roundsRegular: 30,
    hasReturn: true,
    relegation: { type: "DIRECT", slots: 6 },
    splitConfig: {
      upperGroupName: "Championship Group",
      upperGroupSize: 6,
      upperGroupFormat: "ROUND_ROBIN",
      lowerGroupName: "Relegation Group",
      lowerGroupSize: 6,
      lowerGroupFormat: "ROUND_ROBIN",
    },
  },
  {
    eaId: "65",
    kind: "SINGLE_TABLE",
    totalTeams: 10,
    roundsRegular: 27,
    hasReturn: false,
    relegation: { type: "RELEGATION_PLAYOFF", slots: 1, playoffSlots: 1, playoffBottomN: 9 },
  },
  {
    eaId: "41",
    kind: "SINGLE_TABLE",
    totalTeams: 16,
    roundsRegular: 30,
    hasReturn: true,
    relegation: { type: "RELEGATION_PLAYOFF", slots: 2, playoffSlots: 1, playoffBottomN: 14 },
  },
  {
    eaId: "56",
    kind: "SINGLE_TABLE",
    totalTeams: 16,
    roundsRegular: 30,
    hasReturn: true,
    relegation: { type: "RELEGATION_PLAYOFF", slots: 2, playoffSlots: 1, playoffBottomN: 14 },
  },
  {
    eaId: "68",
    kind: "SINGLE_TABLE",
    totalTeams: 19,
    roundsRegular: 36,
    hasReturn: true,
    relegation: { type: "DIRECT", slots: 4 },
  },
  {
    eaId: "66",
    kind: "SINGLE_TABLE",
    totalTeams: 18,
    roundsRegular: 34,
    hasReturn: true,
    relegation: { type: "DIRECT", slots: 3 },
  },
  {
    eaId: "317",
    kind: "SINGLE_TABLE",
    totalTeams: 10,
    roundsRegular: 36,
    hasReturn: false,
    relegation: { type: "DIRECT", slots: 1 },
  },
  {
    eaId: "322",
    kind: "SPLIT_GROUPS",
    totalTeams: 12,
    roundsRegular: 22,
    hasReturn: true,
    splitConfig: {
      upperGroupName: "Mestaruussarja",
      upperGroupSize: 6,
      upperGroupFormat: "ROUND_ROBIN",
      lowerGroupName: "Haastajasarja",
      lowerGroupSize: 6,
      lowerGroupFormat: "ROUND_ROBIN",
      pointsMultiplier: 0.5,
    },
  },
  {
    eaId: "2211",
    kind: "SINGLE_TABLE",
    totalTeams: 12,
    roundsRegular: 33,
    hasReturn: false,
    relegation: { type: "DIRECT", slots: 2 },
  },
  {
    eaId: "2244",
    kind: "SINGLE_TABLE",
    totalTeams: 10,
    roundsRegular: 36,
    hasReturn: false,
    relegation: { type: "DIRECT", slots: 1 },
  },
  {
    eaId: "63",
    kind: "SPLIT_GROUPS",
    totalTeams: 14,
    roundsRegular: 26,
    hasReturn: true,
    relegation: { type: "DIRECT", slots: 2 },
    splitConfig: {
      upperGroupName: "Play-off Título",
      upperGroupSize: 6,
      upperGroupFormat: "ROUND_ROBIN",
      lowerGroupName: "Play-out Descenso",
      lowerGroupSize: 8,
      lowerGroupFormat: "ROUND_ROBIN",
    },
  },
  {
    eaId: "2210",
    kind: "SPLIT_GROUPS",
    totalTeams: 14,
    roundsRegular: 26,
    hasReturn: true,
    splitConfig: {
      upperGroupName: "Grupo A",
      upperGroupSize: 6,
      upperGroupFormat: "ROUND_ROBIN",
      lowerGroupName: "Grupo B",
      lowerGroupSize: 8,
      lowerGroupFormat: "ROUND_ROBIN",
    },
  },
  {
    eaId: "2274",
    kind: "SPLIT_GROUPS",
    totalTeams: 16,
    roundsRegular: 30,
    hasReturn: true,
    splitConfig: {
      upperGroupName: "Championship Group",
      upperGroupSize: 6,
      upperGroupFormat: "ROUND_ROBIN",
      lowerGroupName: "Relegation Group",
      lowerGroupSize: 10,
      lowerGroupFormat: "ROUND_ROBIN",
    },
  },
  {
    eaId: "2267",
    kind: "SINGLE_TABLE",
    totalTeams: 20,
    roundsRegular: 38,
    hasReturn: true,
    relegation: { type: "DIRECT", slots: 4 },
  },
  {
    eaId: "353",
    kind: "TWO_SHORT_TOURNAMENTS",
    totalTeams: 30,
    roundsRegular: 16,
    hasReturn: false,
    hasTitlePlayoff: true,
    titlePlayoffTopN: 8,
    titlePlayoffFormat: "KNOCKOUT",
    tournamentCount: 2,
    hasAnnualTable: true,
    annualTableWinsCopaLibertadores: true,
  },
  {
    eaId: "2209",
    kind: "TWO_SHORT_TOURNAMENTS",
    totalTeams: 20,
    roundsRegular: 20,
    hasReturn: false,
    hasTitlePlayoff: true,
    titlePlayoffTopN: 8,
    titlePlayoffFormat: "KNOCKOUT",
    tournamentCount: 2,
    usesReclasiTable: true,
    relegation: { type: "DIRECT", slots: 2 },
  },
  {
    eaId: "2249",
    kind: "SINGLE_TABLE",
    totalTeams: 16,
    roundsRegular: 30,
    hasReturn: true,
    relegation: { type: "DIRECT", slots: 2 },
  },
  {
    eaId: "39",
    kind: "CONFERENCE_PLAYOFF",
    totalTeams: 30,
    roundsRegular: 34,
    hasReturn: true,
    hasTitlePlayoff: true,
    titlePlayoffTopN: 9,
    titlePlayoffFormat: "KNOCKOUT",
    calendarSpanWeeks: 34,
    matchweekIntervalDays: 4,
  },
  {
    eaId: "341",
    kind: "TWO_SHORT_TOURNAMENTS",
    totalTeams: 18,
    roundsRegular: 17,
    hasReturn: false,
    hasTitlePlayoff: true,
    titlePlayoffTopN: 8,
    titlePlayoffFormat: "KNOCKOUT",
    tournamentCount: 2,
  },
  {
    eaId: "350",
    kind: "SINGLE_TABLE",
    totalTeams: 18,
    roundsRegular: 34,
    hasReturn: true,
    relegation: { type: "DIRECT", slots: 3 },
  },
  {
    eaId: "83",
    kind: "SPLIT_GROUPS",
    totalTeams: 12,
    roundsRegular: 33,
    hasReturn: false,
    relegation: { type: "RELEGATION_PLAYOFF", slots: 1, playoffSlots: 2, playoffBottomN: 10 },
    homeAndAwayBonus: "KLEAGUE_CUMULATIVE",
    splitConfig: {
      upperGroupName: "Final A",
      upperGroupSize: 6,
      upperGroupFormat: "ROUND_ROBIN",
      lowerGroupName: "Final B",
      lowerGroupSize: 6,
      lowerGroupFormat: "ROUND_ROBIN",
      cumulativePoints: true,
    },
  },
  {
    eaId: "351",
    kind: "SINGLE_TABLE_PLAYOFF",
    totalTeams: 12,
    roundsRegular: 27,
    hasReturn: false,
    hasTitlePlayoff: true,
    titlePlayoffTopN: 6,
    titlePlayoffFormat: "KNOCKOUT",
  },
  {
    eaId: "2271",
    kind: "SINGLE_TABLE",
    totalTeams: 16,
    roundsRegular: 30,
    hasReturn: true,
    relegation: { type: "DIRECT", slots: 3 },
  },
  {
    eaId: "2149",
    kind: "SINGLE_TABLE_PLAYOFF",
    totalTeams: 12,
    roundsRegular: 22,
    hasReturn: true,
    hasTitlePlayoff: true,
    titlePlayoffTopN: 6,
    titlePlayoffFormat: "KNOCKOUT",
  },
  {
    eaId: "2172",
    kind: "SINGLE_TABLE",
    totalTeams: 14,
    roundsRegular: 26,
    hasReturn: true,
    relegation: { type: "DIRECT", slots: 2 },
  },
  {
    eaId: "2012",
    kind: "SINGLE_TABLE",
    totalTeams: 16,
    roundsRegular: 30,
    hasReturn: true,
    relegation: { type: "DIRECT", slots: 2 },
  },
  {
    eaId: "332",
    kind: "SINGLE_TABLE",
    totalTeams: 16,
    roundsRegular: 30,
    hasReturn: true,
    relegation: { type: "RELEGATION_PLAYOFF", slots: 2, playoffSlots: 2, playoffBottomN: 13 },
  },
];

export function getLeagueFormatSpec(eaId: string | null | undefined): LeagueFormatSpec | null {
  if (!eaId) return null;
  return LEAGUE_FORMAT_CATALOG.find((s) => s.eaId === eaId) ?? null;
}
