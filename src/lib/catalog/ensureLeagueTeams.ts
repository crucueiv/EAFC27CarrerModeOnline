import type { PrismaClient } from "@prisma/client";
import { fetchEaRatings } from "@/lib/ratings/eaClient";
import { normalizeSearchText } from "@/lib/search/normalize";
import { LEAGUE_TEAM_COUNTS } from "@/lib/constants/leagueTeamCounts";
import { fetchTeamApiSportsMap } from "@/lib/catalog/importEaCatalog";

function shortName(name: string): string {
  return name.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "").trim().slice(0, 5).toUpperCase() || "TEAM";
}

export async function ensureLeagueTeamsComplete(
  leagueId: string,
  database: PrismaClient
): Promise<{ created: number; total: number }> {
  const league = await database.league.findUnique({ where: { id: leagueId } });
  if (!league?.eaId) return { created: 0, total: 0 };

  const expectedCount = LEAGUE_TEAM_COUNTS[league.name] || 20;

  const currentTeams = await database.team.findMany({
    where: { leagueId },
    select: { eaId: true },
  });

  if (currentTeams.length >= expectedCount) {
    return { created: 0, total: currentTeams.length };
  }

  const allPlayers: EaRatingRecord[] = [];
  for (let offset = 0; offset < 10000; offset += 100) {
    const batch = await fetchEaRatings({
      locale: "es",
      limit: 100,
      offset,
      allowEmpty: true,
    });
    if (!batch.length) break;
    allPlayers.push(...batch);
    if (batch.length < 100) break;
  }

  const teamsMap = new Map<string, { eaId: string; name: string; imageUrl: string | undefined }>();
  for (const p of allPlayers) {
    if (
      p.league?.id === league.eaId &&
      p.team?.id &&
      !currentTeams.some((t) => t.eaId === p.team!.id)
    ) {
      teamsMap.set(p.team.id, {
        eaId: p.team.id,
        name: p.team.name,
        imageUrl: p.team.imageUrl ?? undefined,
      });
    }
  }

  const apiSportsMap = await fetchTeamApiSportsMap();

  let created = 0;
  for (const [eaId, teamData] of teamsMap) {
    const apiSportsId = apiSportsMap.get(eaId);
    await database.team.create({
      data: {
        eaId,
        name: teamData.name,
        normalizedName: normalizeSearchText(teamData.name),
        shortName: shortName(teamData.name),
        imageUrl: teamData.imageUrl,
        leagueId,
        ...(apiSportsId ? { apiSportsId } : {}),
      },
    });
    created++;
  }

  const total = await database.team.count({ where: { leagueId } });
  return { created, total };
}

type EaRatingRecord = {
  eaId: number;
  name: string;
  position: string;
  overall: number;
  potential: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  avatarUrl: string;
  marketValue?: number;
  gender: "MALE" | "FEMALE";
  team?: { id: string; name: string; imageUrl: string | null };
  nationality?: { id: string; name: string; imageUrl: string | null };
  league?: { id: string; name: string; imageUrl: string | null };
  externalId: string;
  positionId?: string;
  birthdate?: string;
};
