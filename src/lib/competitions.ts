import { prisma } from "@/lib/prisma";
import { getUefaAllocation } from "@/lib/coefficients/uefa-defaults";
import { getConmebolAllocation } from "@/lib/coefficients/conmebol-defaults";
import { getLeagueFormatSpec, type LeagueFormatSpec } from "@/lib/league-formats/catalog";
import { resolveContinentSpots, type ContinentSpots, clearContinentSpotsCache } from "@/lib/coefficients/resolveContinentSpots";
import { getZoneForRank, type ZoneComputationInput } from "@/lib/competitions/getZoneForRank";
import { getZoneStyle, continentToZoneGroup, type ZoneId } from "@/lib/competitions/zones";
import {
  getAnnualStandings,
  getArgentinaTournaments,
  type AnnualStanding,
} from "@/lib/competitions/argentina-annual";
import {
  evaluateArgentinaContinentQualifiers,
} from "@/lib/competitions/argentina-continents";

export type CompetitionBand = ZoneId;

export type SplitGroup = "UPPER" | "LOWER" | null;

export type AnnualChampionSource = "APERTURA" | "CLAUSURA" | "ANUAL" | null;

export type CompetitionStanding = {
  teamId: string;
  teamName: string;
  shortName: string;
  imageUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  rank: number;
  band: CompetitionBand;
  group: SplitGroup;
  annualChampionSource: AnnualChampionSource;
};

export type CompetitionLeague = {
  id: string;
  name: string;
  country: string;
  continent: string;
  eaId: string | null;
  imageUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  format: LeagueFormatSpec | null;
  spots: ContinentSpots;
  teams: CompetitionStanding[];
  hasRelegationZone: boolean;
  hasMatches: boolean;
  isTopDivision: boolean;
  annualChampionByTeam: Record<string, AnnualChampionSource>;
};

const lowerDivisionKeywords = [
  "hypermotion",
  "championship",
  "league one",
  "league two",
  "serie b",
  "bundesliga 2",
  "liga 2",
  "ligue 2",
  "division",
  "national",
  "plf",
  "primera b",
  "segunda",
  "bkt",
  "superliga",
];

function getLeagueLogoUrl(league: { eaId: string | null; imageUrl: string | null }) {
  if (league.eaId) {
    return `https://assets.easysbc.io/fc26/leagues/${league.eaId}.png`;
  }
  return league.imageUrl;
}

function normalizeLeagueName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function hasLowerDivisionForLeague(
  leagueName: string,
  country: string,
  leagues: Array<{ name: string; country: string }>,
) {
  const lowerName = normalizeLeagueName(leagueName);
  const currentIsLowerTier = lowerDivisionKeywords.some((keyword) => lowerName.includes(keyword));
  if (currentIsLowerTier) return false;

  return leagues.some((other) => {
    if (other.country !== country) return false;
    if (normalizeLeagueName(other.name) === lowerName) return false;
    const lowerOther = normalizeLeagueName(other.name);
    return lowerDivisionKeywords.some((keyword) => lowerOther.includes(keyword));
  });
}

type PointsConfig = {
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
};

type StandingTeam = {
  id: string;
  name: string;
  shortName: string;
  imageUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
};

type LeagueMatchInput = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
};

function isDebugEnabled(): boolean {
  const v = process.env.EAFC_DEBUG;
  return v === "1" || v === "standings" || v === "all";
}

function debugLog(...args: unknown[]) {
  if (isDebugEnabled()) {
    console.log("[EAFC_DEBUG][standings]", ...args);
  }
}

export function isAnnualTableLeague(format: LeagueFormatSpec | null): boolean {
  return !!format?.hasAnnualTable;
}

async function loadAnnualChampions(
  leagueId: string,
  seasonId: string | null | undefined,
): Promise<Record<string, AnnualChampionSource>> {
  if (!prisma || !seasonId) return {};
  const trophies = await prisma.trophy.findMany({
    where: {
      seasonId,
      leagueId,
      kind: { in: ["APERTURA_CHAMPION", "CLAUSURA_CHAMPION", "SEASON_CHAMPION"] },
    },
    select: { teamId: true, kind: true },
  });
  const out: Record<string, AnnualChampionSource> = {};
  for (const t of trophies) {
    if (t.kind === "APERTURA_CHAMPION") out[t.teamId] = "APERTURA";
    else if (t.kind === "CLAUSURA_CHAMPION") out[t.teamId] = "CLAUSURA";
    else if (t.kind === "SEASON_CHAMPION") out[t.teamId] = "ANUAL";
  }
  return out;
}

export function buildStandings(
  teams: StandingTeam[],
  matches: LeagueMatchInput[],
  points: PointsConfig = { pointsWin: 3, pointsDraw: 1, pointsLoss: 0 },
): CompetitionStanding[] {
  const table = new Map<string, CompetitionStanding>();

  for (const team of teams) {
    table.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      shortName: team.shortName,
      imageUrl: team.imageUrl,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      rank: 0,
      band: "MID_TABLE",
      group: null,
      annualChampionSource: null,
    });
  }

  for (const match of matches) {
    if (match.homeScore === null || match.awayScore === null) continue;
    const homeStats = table.get(match.homeTeamId);
    const awayStats = table.get(match.awayTeamId);
    if (!homeStats || !awayStats) continue;

    const homeGoals = Number(match.homeScore ?? 0);
    const awayGoals = Number(match.awayScore ?? 0);

    homeStats.played += 1;
    awayStats.played += 1;
    homeStats.goalsFor += homeGoals;
    homeStats.goalsAgainst += awayGoals;
    awayStats.goalsFor += awayGoals;
    awayStats.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      homeStats.wins += 1;
      homeStats.points += points.pointsWin;
      awayStats.losses += 1;
    } else if (homeGoals < awayGoals) {
      awayStats.wins += 1;
      awayStats.points += points.pointsWin;
      homeStats.losses += 1;
    } else {
      homeStats.draws += 1;
      awayStats.draws += 1;
      homeStats.points += points.pointsDraw;
      awayStats.points += points.pointsDraw;
    }
  }

  const sorted = Array.from(table.values())
    .map((entry) => ({ ...entry, goalDifference: entry.goalsFor - entry.goalsAgainst }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.teamName.localeCompare(b.teamName);
    });

  return sorted.map((entry, index) => {
    const rank = index + 1;
    return { ...entry, rank, band: "MID_TABLE" as CompetitionBand, group: null, annualChampionSource: null };
  });
}

function buildSyntheticFormat(
  format: LeagueFormatSpec | null,
  totalTeams: number,
): LeagueFormatSpec {
  if (format) return format;
  return {
    eaId: "",
    kind: "SINGLE_TABLE",
    totalTeams,
    roundsRegular: 0,
    hasReturn: true,
  };
}

const ARGENTINA_LIBERTADORES_TOTAL = 9;
const ARGENTINA_SUDAMERICANA_TOTAL = 12;

async function getArgentinaChampionTeamIds(
  leagueId: string,
  seasonId: string,
): Promise<{
  apertura: string | null;
  clausura: string | null;
  cupArgentina: string | null;
}> {
  if (!prisma) return { apertura: null, clausura: null, cupArgentina: null };
  const trophies = await prisma.trophy.findMany({
    where: { leagueId, seasonId, kind: { in: ["APERTURA_CHAMPION", "CLAUSURA_CHAMPION", "SEASON_CHAMPION"] } },
    select: { teamId: true, kind: true },
  });
  let apertura: string | null = null;
  let clausura: string | null = null;
  let cupArgentina: string | null = null;
  for (const t of trophies) {
    if (t.kind === "APERTURA_CHAMPION") apertura = t.teamId;
    else if (t.kind === "CLAUSURA_CHAMPION") clausura = t.teamId;
    else if (t.kind === "SEASON_CHAMPION") cupArgentina = t.teamId;
  }
  return { apertura, clausura, cupArgentina };
}

function buildArgentinaBands(
  standings: AnnualStanding[],
  champions: { apertura: string | null; clausura: string | null; cupArgentina: string | null },
): Map<string, ZoneId> {
  const map = new Map<string, ZoneId>();
  const result = evaluateArgentinaContinentQualifiers({
    seasonId: "ARGENTINA-ANUAL",
    leagueId: "ARGENTINA-ANUAL",
    annualStandings: standings,
    aperturaChampionTeamId: champions.apertura,
    clausuraChampionTeamId: champions.clausura,
    cupArgentinaChampionTeamId: champions.cupArgentina,
    previousSudamericanaWinnerIsArgentinian: false,
  });
  for (const q of result.libertadores) {
    map.set(q.teamId, "CONTINENTAL_QUALIFYING");
  }
  for (const q of result.sudamericana) {
    map.set(q.teamId, "SECONDARY_DIRECT");
  }
  return map;
}

function rankPenalty(standings: AnnualStanding[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < standings.length; i++) {
    map.set(standings[i].teamId, i);
  }
  return map;
}

function applyArgentinaZones(
  standings: CompetitionStanding[],
  annualStandings: AnnualStanding[] | null,
  champions: { apertura: string | null; clausura: string | null; cupArgentina: string | null },
  isTopDivision: boolean,
  hasRelegationZone: boolean,
  continent: string,
  annualChampionByTeam: Record<string, AnnualChampionSource>,
): CompetitionStanding[] {
  if (!annualStandings) {
    return applyZones(
      standings,
      { eaId: "353", kind: "SINGLE_TABLE", totalTeams: standings.length, roundsRegular: 0, hasReturn: false },
      {
        championsDirect: 0,
        championsQualifying: 0,
        championsPlayoffSlots: 0,
        europa: 0,
        conference: 0,
        libertadoresDirect: 0,
        libertadoresQualifying: ARGENTINA_LIBERTADORES_TOTAL,
        sudamericana: ARGENTINA_SUDAMERICANA_TOTAL,
        extraFromSudamericanaWinner: false,
        usesReclasiTable: false,
      } as ContinentSpots,
      isTopDivision,
      hasRelegationZone,
      continent,
      annualChampionByTeam,
    );
  }

  const customBands = buildArgentinaBands(annualStandings, champions);
  const sorted = [...standings].sort((a, b) => a.rank - b.rank);
  const annualOrder = new Map<string, number>();
  for (let i = 0; i < annualStandings.length; i++) {
    annualOrder.set(annualStandings[i].teamId, i);
  }

  return sorted.map((s) => {
    const band = customBands.get(s.teamId) ?? "MID_TABLE";
    return {
      ...s,
      band,
      group: null,
      annualChampionSource: annualChampionByTeam[s.teamId] ?? null,
    };
  });
}

function applyZones(
  standings: CompetitionStanding[],
  format: LeagueFormatSpec | null,
  spots: ContinentSpots,
  isTopDivision: boolean,
  hasRelegationZone: boolean,
  continent: string,
  annualChampionByTeam: Record<string, AnnualChampionSource>,
): CompetitionStanding[] {
  const effectiveFormat = buildSyntheticFormat(format, standings.length);
  const splitUpperSize = effectiveFormat.splitConfig?.upperGroupSize ?? null;
  return standings.map((s) => {
    const input: ZoneComputationInput = {
      rank: s.rank,
      totalTeams: standings.length,
      format: effectiveFormat,
      spots,
      isTopDivision,
      hasRelegationZone,
      continent,
    };
    const group: SplitGroup =
      splitUpperSize !== null ? (s.rank <= splitUpperSize ? "UPPER" : "LOWER") : null;
    return {
      ...s,
      band: getZoneForRank(input),
      group,
      annualChampionSource: annualChampionByTeam[s.teamId] ?? null,
    };
  });
}

async function getActiveSeason(userId?: string): Promise<{ id: string } | null> {
  if (!prisma) return null;
  if (userId) {
    const membership = await prisma.careerGroupMember.findFirst({
      where: { userId },
      select: { careerGroupId: true },
    });
    if (membership?.careerGroupId) {
      const season = await prisma.season.findFirst({
        where: { status: "ACTIVE", careerGroupId: membership.careerGroupId },
        orderBy: { startDate: "desc" },
        select: { id: true },
      });
      if (season) return season;
    }
  }
  return prisma.season.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { startDate: "desc" },
    select: { id: true },
  });
}

async function getActiveSeasonPoints(): Promise<PointsConfig> {
  if (!prisma) return { pointsWin: 3, pointsDraw: 1, pointsLoss: 0 };
  const activeSeason = await prisma.season.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { startDate: "desc" },
    select: { pointsWin: true, pointsDraw: true, pointsLoss: true },
  });
  return {
    pointsWin: activeSeason?.pointsWin ?? 3,
    pointsDraw: activeSeason?.pointsDraw ?? 1,
    pointsLoss: activeSeason?.pointsLoss ?? 0,
  };
}

async function isLeagueTopDivision(
  leagueId: string,
  eaId: string | null,
  country: string,
): Promise<boolean> {
  if (!prisma) return true;
  const leagueObj = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { higherLeagueId: true, name: true },
  });
  if (leagueObj?.higherLeagueId) return false;

  const lowerName = leagueObj?.name ? normalizeLeagueName(leagueObj.name) : "";
  const isLowerKeyword = lowerDivisionKeywords.some((kw) => lowerName.includes(kw));
  if (isLowerKeyword) return false;

  return true;
}

export async function getStandingsForLeague(
  leagueId: string,
  userId?: string,
): Promise<CompetitionLeague | null> {
  if (!prisma) return null;
  clearContinentSpotsCache();
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { _count: { select: { teams: true } } },
  });
  if (!league) return null;
  if (league._count.teams < 2) return null;

  const season = await getActiveSeason(userId);
  const points = await getActiveSeasonPoints();
  const [teamList, matches] = await Promise.all([
    prisma.team.findMany({
      where: { leagueId },
      select: { id: true, name: true, shortName: true, imageUrl: true, primaryColor: true, secondaryColor: true },
      orderBy: { name: "asc" },
    }),
    prisma.match.findMany({
      where: {
        OR: [{ homeTeam: { leagueId } }, { awayTeam: { leagueId } }],
        status: { in: ["COMPLETED", "SIMULATED"] },
      },
      select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
    }),
  ]);

  const allLeagues = await prisma.league.findMany({
    select: { name: true, country: true },
  });
  const hasRelegationZone = hasLowerDivisionForLeague(league.name, league.country, allLeagues);
  const isTopDivision = await isLeagueTopDivision(league.id, league.eaId, league.country);
  const format = getLeagueFormatSpec(league.eaId);
  const defaultUefa = getUefaAllocation(league.country);
  const defaultConmebol = getConmebolAllocation(league.country);

  const spots = season
    ? await resolveContinentSpots(
        { id: league.id, country: league.country },
        { id: season.id },
        format ?? {
          eaId: league.eaId ?? "",
          kind: "SINGLE_TABLE",
          totalTeams: teamList.length,
          roundsRegular: 0,
          hasReturn: true,
        },
      )
    : ({
        championsDirect: defaultUefa?.championsDirect ?? 0,
        championsQualifying: defaultUefa?.championsQualifying ?? 0,
        championsPlayoffSlots: defaultUefa?.championsPlayoffSlots ?? 0,
        europa: defaultUefa?.europa ?? 0,
        conference: defaultUefa?.conference ?? 0,
        libertadoresDirect: defaultConmebol?.libertadoresDirect ?? 0,
        libertadoresQualifying: defaultConmebol?.libertadoresQualifying ?? 0,
        sudamericana: defaultConmebol?.sudamericana ?? 0,
        extraFromSudamericanaWinner: defaultConmebol?.extraFromSudamericanaWinner ?? false,
        usesReclasiTable: format?.usesReclasiTable ?? false,
      } as ContinentSpots);

  const annualChampionByTeam = await loadAnnualChampions(league.id, season?.id);

  let standings: CompetitionStanding[];
  if (league.eaId === "353" && prisma) {
    const tournaments = await getArgentinaTournaments(season?.id ?? "", league.id);
    const annualStandings =
      tournaments.aperturaTournamentId && tournaments.clausuraTournamentId
        ? await getAnnualStandings(
            season?.id ?? "",
            league.id,
            tournaments.aperturaTournamentId,
            tournaments.clausuraTournamentId,
          )
        : null;
    const champions = await getArgentinaChampionTeamIds(league.id, season?.id ?? "");
    standings = applyArgentinaZones(
      buildStandings(teamList, matches, points),
      annualStandings,
      champions,
      isTopDivision,
      hasRelegationZone,
      league.continent,
      annualChampionByTeam,
    );
  } else {
    standings = applyZones(
      buildStandings(teamList, matches, points),
      format,
      spots,
      isTopDivision,
      hasRelegationZone,
      league.continent,
      annualChampionByTeam,
    );
  }

  debugLog({
    leagueId: league.id,
    eaId: league.eaId,
    name: league.name,
    country: league.country,
    continent: league.continent,
    seasonId: season?.id ?? null,
    isTopDivision,
    hasRelegationZone,
    formatEaId: format?.eaId ?? null,
    formatKind: format?.kind ?? null,
    splitConfig: format?.splitConfig ?? null,
    hasAnnualTable: format?.hasAnnualTable ?? false,
    spots,
    annualChampions: annualChampionByTeam,
    sample: standings.slice(0, 5).map((s) => ({
      rank: s.rank,
      name: s.teamName,
      band: s.band,
      group: s.group,
      annualChampionSource: s.annualChampionSource,
    })),
  });

  return {
    id: league.id,
    name: league.name,
    country: league.country,
    continent: league.continent,
    eaId: league.eaId,
    imageUrl: getLeagueLogoUrl(league),
    primaryColor: league.primaryColor,
    secondaryColor: league.secondaryColor,
    format,
    spots,
    teams: standings,
    hasRelegationZone,
    hasMatches: matches.length > 0,
    isTopDivision,
    annualChampionByTeam,
  };
}

export async function getCompetitionsData(userId?: string): Promise<CompetitionLeague[]> {
  if (!prisma) return [];
  clearContinentSpotsCache();

  const points = await getActiveSeasonPoints();
  const season = await getActiveSeason(userId);
  const leagues = await prisma.league.findMany({
    include: { _count: { select: { teams: true } } },
    orderBy: [{ continent: "asc" }, { name: "asc" }],
  });

  const playableLeagues = leagues.filter((league) => league._count.teams >= 10);

  const lowerExistsByEaIdCache = new Map<string, boolean>();
  async function isTopDivisionCached(eaId: string | null, country: string): Promise<boolean> {
    if (!eaId) return true;
    if (lowerExistsByEaIdCache.has(eaId)) {
      return lowerExistsByEaIdCache.get(eaId)!;
    }
    const lowerExists = await prisma!.league.findFirst({
      where: {
        country,
        isPlayable: true,
        eaId: { not: null },
        higherLeague: { is: { eaId } },
      },
      select: { id: true },
    });
    lowerExistsByEaIdCache.set(eaId, !!lowerExists);
    return !!lowerExists;
  }

  return Promise.all(
    playableLeagues.map(async (league) => {
      const [teamList, matches] = await Promise.all([
        prisma!.team.findMany({
          where: { leagueId: league.id },
          select: { id: true, name: true, shortName: true, imageUrl: true, primaryColor: true, secondaryColor: true },
          orderBy: { name: "asc" },
        }),
        prisma!.match.findMany({
          where: {
            OR: [{ homeTeam: { leagueId: league.id } }, { awayTeam: { leagueId: league.id } }],
            status: { in: ["COMPLETED", "SIMULATED"] },
          },
          select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
        }),
      ]);

      const hasRelegationZone = hasLowerDivisionForLeague(
        league.name,
        league.country,
        playableLeagues.map(({ name, country }) => ({ name, country })),
      );
      const isTopDivision = await isTopDivisionCached(league.eaId, league.country);
      const format = getLeagueFormatSpec(league.eaId);
      const spots = season
        ? await resolveContinentSpots(
            { id: league.id, country: league.country },
            { id: season.id },
            format ?? {
              eaId: league.eaId ?? "",
              kind: "SINGLE_TABLE",
              totalTeams: teamList.length,
              roundsRegular: 0,
              hasReturn: true,
            },
          )
        : ({
            championsDirect: 0,
            championsQualifying: 0,
            championsPlayoffSlots: 0,
            europa: 0,
            conference: 0,
            libertadoresDirect: 0,
            libertadoresQualifying: 0,
            sudamericana: 0,
            extraFromSudamericanaWinner: false,
            usesReclasiTable: false,
          } as ContinentSpots);

      const annualChampionByTeam = await loadAnnualChampions(league.id, season?.id);

      let standings: CompetitionStanding[];
      if (league.eaId === "353" && season) {
        const tournaments = await getArgentinaTournaments(season.id, league.id);
        const annualStandings =
          tournaments.aperturaTournamentId && tournaments.clausuraTournamentId
            ? await getAnnualStandings(
                season.id,
                league.id,
                tournaments.aperturaTournamentId,
                tournaments.clausuraTournamentId,
              )
            : null;
        const champions = await getArgentinaChampionTeamIds(league.id, season.id);
        standings = applyArgentinaZones(
          buildStandings(teamList, matches, points),
          annualStandings,
          champions,
          isTopDivision,
          hasRelegationZone,
          league.continent,
          annualChampionByTeam,
        );
      } else {
        standings = applyZones(
          buildStandings(teamList, matches, points),
          format,
          spots,
          isTopDivision,
          hasRelegationZone,
          league.continent,
          annualChampionByTeam,
        );
      }

      return {
        id: league.id,
        name: league.name,
        country: league.country,
        continent: league.continent,
        eaId: league.eaId,
        imageUrl: getLeagueLogoUrl(league),
        primaryColor: league.primaryColor,
        secondaryColor: league.secondaryColor,
        format,
        spots,
        teams: standings,
        hasRelegationZone,
        hasMatches: matches.length > 0,
        isTopDivision,
        annualChampionByTeam,
      };
    }),
  );
}

export function getLeagueBandClasses(band: CompetitionBand, continent?: string | null) {
  const style = getZoneStyle(band, continent);
  return {
    row: style.tailwind.rowBg,
    pill: style.tailwind.pill,
    accent: style.tailwind.accent,
    label: style.label,
  };
}
