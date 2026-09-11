import { PrismaClient } from "@prisma/client";
import { getLeagueCountryInfo, isWomenLeague, isConmebolTournament, isPlayableLeague } from "@/lib/constants/league-country-map";
import { getLeagueFormatSpec } from "@/lib/league-formats/catalog";
import { normalizeSearchText } from "@/lib/search/normalize";
import { fetchTeamApiSportsMap } from "@/lib/catalog/importEaCatalog";
const EASY_SBC_URL = "https://api-fc27.easysbc.io/squad-builder/manager-data";


const prisma = new PrismaClient();

interface EasySBCLeague {
  id: number;
  name: string;
  abbrName: string;
  isWomen: boolean;
}

interface EasySBCClub {
  id: number;
  name: string;
  abbrName: string;
  league: number;
  isWomen: boolean;
  linkedClubIds: number[];
}

async function fetchEasySBCData(): Promise<{ leagues: EasySBCLeague[]; clubs: EasySBCClub[] }> {
  console.log("Fetching leagues & teams from easySBC...");
  const res = await fetch(EASY_SBC_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("easySBC fetch failed: " + res.status);
  const data = await res.json();
  console.log("Found " + (data.leagues ? data.leagues.length : 0) + " leagues, " + (data.clubs ? data.clubs.length : 0) + " clubs");
  return data;
}



function shortName(name: string): string {
  return name.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "").trim().slice(0, 5).toUpperCase() || "TEAM";
}

async function main() {
  console.log("🏆 Importing Leagues & Teams...");
  
  const [data, apiSportsMap] = await Promise.all([
    fetchEasySBCData(),
    fetchTeamApiSportsMap(),
  ]);
  
  let leaguesCreated = 0;
  let teamsCreated = 0;
  let skippedWomen = 0;
  let skippedConmebol = 0;

  const leagues = data.leagues ?? [];
  const clubs = data.clubs ?? [];

  for (const leagueData of leagues) {
    const eaId = String(leagueData.id);
    const name = leagueData.name;

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

    if (["2118","2136","2265","2240","2241"].includes(eaId)) {
      console.log("  ⏭️  Skipping synthetic league: " + name);
      continue;
    }

    const info = getLeagueCountryInfo(eaId);
    const leagueImageUrl = null;
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

    const leagueClubs = clubs.filter(c => c.league === leagueData.id && !c.isWomen);
    for (const club of leagueClubs) {
      const teamEaId = String(club.id);
      const teamApiSportsId = apiSportsMap.get(teamEaId);
      
      await prisma.team.upsert({
        where: { eaId: teamEaId },
        update: {
          name: club.name,
          normalizedName: normalizeSearchText(club.name),
          shortName: shortName(club.name),
          imageUrl: null,
          leagueId: league.id,
          ...(teamApiSportsId ? { apiSportsId: teamApiSportsId } : {}),
        },
        create: {
          eaId: teamEaId,
          name: club.name,
          normalizedName: normalizeSearchText(club.name),
          shortName: shortName(club.name),
          imageUrl: null,
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