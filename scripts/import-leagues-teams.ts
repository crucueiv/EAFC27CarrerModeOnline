import { PrismaClient } from "@prisma/client";
import { getLeagueCountryInfo, isWomenLeague, isConmebolTournament, isPlayableLeague } from "@/lib/constants/league-country-map";
import { getLeagueFormatSpec } from "@/lib/league-formats/catalog";
import { normalizeSearchText } from "@/lib/search/normalize";
import { fetchTeamApiSportsMap } from "@/lib/catalog/importEaCatalog";
import { fetchEARatingsPayload } from "@/lib/ea/ratings-client";

const prisma = new PrismaClient();

interface EATeamGroup {
  id: string;
  label: string;
  teams: Array<{ id: number; label: string; imageUrl: string; isPopular: boolean }>;
  isPopular: boolean;
  region?: { id: string; label: string };
  gender?: { id: number; label: string };
}

async function fetchEATeamGroups(): Promise<EATeamGroup[]> {
  console.log("📥 Fetching EA team groups (leagues + teams)...");
  const data = await fetchEARatingsPayload<{
    pageProps?: { auxData?: { defaultLocaleFilters?: { teamGroups?: EATeamGroup[] } } };
  }>();
  const teamGroups = data.pageProps?.auxData?.defaultLocaleFilters?.teamGroups ?? [];
  console.log(`  Found ${teamGroups.length} team groups`);
  return teamGroups;
}

function shortName(name: string): string {
  return name.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "").trim().slice(0, 5).toUpperCase() || "TEAM";
}

async function main() {
  console.log("🏆 Importing Leagues & Teams...");
  
  const [teamGroups, apiSportsMap] = await Promise.all([
    fetchEATeamGroups(),
    fetchTeamApiSportsMap(),
  ]);
  
  let leaguesCreated = 0;
  let teamsCreated = 0;
  let skippedWomen = 0;
  let skippedConmebol = 0;

  for (const group of teamGroups) {
    const eaId = group.id;
    const name = group.label;

    if (isWomenLeague(eaId)) {
      console.log(`  ⏭️  Skipping women's league: ${name}`);
      skippedWomen++;
      continue;
    }

    if (isConmebolTournament(eaId)) {
      console.log(`  ⏭️  Skipping CONMEBOL tournament (teams imported separately): ${name}`);
      skippedConmebol++;
      continue;
    }

    const info = getLeagueCountryInfo(eaId);
    const representativeTeam = group.teams.find(t => t.isPopular) || group.teams[0];
    const leagueImageUrl = representativeTeam?.imageUrl ?? null;
    const format = getLeagueFormatSpec(eaId);

    const league = await prisma.league.upsert({
      where: { eaId },
      update: {
        name,
        normalizedName: normalizeSearchText(name),
        country: info.country,
        continent: info.continent,
        imageUrl: leagueImageUrl,
      },
      create: {
        eaId,
        name,
        normalizedName: normalizeSearchText(name),
        country: info.country,
        continent: info.continent,
        imageUrl: leagueImageUrl,
      },
    });
    leaguesCreated++;

    const isSelectable = isPlayableLeague(eaId);
    const rulesTag = format
      ? ` [kind=${format.kind} teams=${format.totalTeams} rounds=${format.roundsRegular}]`
      : "";
    console.log(`  ✓ League: ${name} (${info.country}) ${isSelectable ? "🎮" : "📋"}${rulesTag}`);

    for (const team of group.teams) {
      const teamEaId = String(team.id);
      const teamApiSportsId = apiSportsMap.get(teamEaId);
      
      await prisma.team.upsert({
        where: { eaId: teamEaId },
        update: {
          name: team.label,
          normalizedName: normalizeSearchText(team.label),
          shortName: shortName(team.label),
          imageUrl: team.imageUrl,
          leagueId: league.id,
          ...(teamApiSportsId ? { apiSportsId: teamApiSportsId } : {}),
        },
        create: {
          eaId: teamEaId,
          name: team.label,
          normalizedName: normalizeSearchText(team.label),
          shortName: shortName(team.label),
          imageUrl: team.imageUrl,
          leagueId: league.id,
          ...(teamApiSportsId ? { apiSportsId: teamApiSportsId } : {}),
        },
      });
      teamsCreated++;
    }
  }

  console.log(`✅ Created ${leaguesCreated} Leagues`);
  console.log(`✅ Created ${teamsCreated} Teams`);
  console.log(`⏭️  Skipped ${skippedWomen} women's leagues`);
  console.log(`⏭️  Skipped ${skippedConmebol} CONMEBOL tournaments (teams imported separately)`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Import failed:", e);
  process.exit(1);
});