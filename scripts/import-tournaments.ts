import { PrismaClient } from "@prisma/client";
import { normalizeSearchText } from "@/lib/search/normalize";
import { fetchTeamApiSportsMap } from "@/lib/catalog/importEaCatalog";

const prisma = new PrismaClient();

const EA_RATINGS_URL = "https://www.ea.com/_next/data/tSbhYVpPV7yhfzpVbM5JY/es/games/ea-sports-fc/ratings.json";

interface EATeamGroup {
  id: string;
  label: string;
  teams: Array<{ id: number; label: string; imageUrl: string; isPopular: boolean }>;
}

async function fetchEATeamGroups(): Promise<EATeamGroup[]> {
  const response = await fetch(EA_RATINGS_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Failed to fetch EA ratings: ${response.status}`);
  const data = await response.json();
  return data.pageProps?.auxData?.defaultLocaleFilters?.teamGroups ?? [];
}

function shortName(name: string): string {
  return name.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "").trim().slice(0, 5).toUpperCase() || "TEAM";
}

const CONMEBOL_TOURNAMENTS = {
  "1003": { name: "CONMEBOL Libertadores", type: "CONTINENTAL_CUP" },
  "1014": { name: "CONMEBOL Sudamericana", type: "CONTINENTAL_CUP" },
} as const;

async function main() {
  console.log("🏆 Importing CONMEBOL Tournaments & Teams...");
  
  const [teamGroups, apiSportsMap] = await Promise.all([
    fetchEATeamGroups(),
    fetchTeamApiSportsMap(),
  ]);
  const conmebolGroups = teamGroups.filter(g => g.id in CONMEBOL_TOURNAMENTS);
  
  // Step 1: Collect ALL unique CONMEBOL teams (deduplicate by EA ID)
  const allConmebolTeams = new Map<string, { eaId: string; name: string; imageUrl: string }>();
  
  for (const group of conmebolGroups) {
    for (const team of group.teams) {
      const teamEaId = String(team.id);
      if (!allConmebolTeams.has(teamEaId)) {
        allConmebolTeams.set(teamEaId, {
          eaId: teamEaId,
          name: team.label,
          imageUrl: team.imageUrl,
        });
      }
    }
  }

  console.log(`  Found ${allConmebolTeams.size} unique CONMEBOL teams`);

  // Step 2: Create unique teams (leagueId: null, not playable)
  let teamsCreated = 0;
  for (const [eaId, teamData] of allConmebolTeams) {
    const teamApiSportsId = apiSportsMap.get(eaId);
    await prisma.team.upsert({
      where: { eaId },
      update: {
        name: teamData.name,
        normalizedName: normalizeSearchText(teamData.name),
        shortName: shortName(teamData.name),
        imageUrl: teamData.imageUrl,
        leagueId: null, // No league for CONMEBOL teams
        ...(teamApiSportsId ? { apiSportsId: teamApiSportsId } : {}),
      },
      create: {
        eaId: teamData.eaId,
        name: teamData.name,
        normalizedName: normalizeSearchText(teamData.name),
        shortName: shortName(teamData.name),
        imageUrl: teamData.imageUrl,
        leagueId: null, // No league for CONMEBOL teams
        ...(teamApiSportsId ? { apiSportsId: teamApiSportsId } : {}),
      },
    });
    teamsCreated++;
  }

  console.log(`  ✅ Created ${teamsCreated} unique CONMEBOL teams`);

  // Step 3: Create tournaments and link teams
  let tournamentsCreated = 0;
  let participantsCreated = 0;

  for (const group of conmebolGroups) {
    const tourneyInfo = CONMEBOL_TOURNAMENTS[group.id as keyof typeof CONMEBOL_TOURNAMENTS];
    if (!tourneyInfo) continue;

    const tournament = await prisma.tournament.upsert({
      where: { id: `conmebol-${group.id}` },
      update: { name: tourneyInfo.name },
      create: { id: `conmebol-${group.id}`, name: tourneyInfo.name, seasonId: null },
    });
    tournamentsCreated++;

    for (const team of group.teams) {
      const teamEaId = String(team.id);
      const dbTeam = await prisma.team.findUnique({ where: { eaId: teamEaId } });
      if (!dbTeam) {
        console.log(`  ⚠️ Team not found: ${team.label} (EA ID: ${teamEaId})`);
        continue;
      }

      await prisma.tournamentParticipant.upsert({
        where: { tournamentId_teamId: { tournamentId: tournament.id, teamId: dbTeam.id } },
        update: {},
        create: { tournamentId: tournament.id, teamId: dbTeam.id },
      });
      participantsCreated++;
    }
    
    console.log(`  ✓ Tournament: ${tourneyInfo.name} (${group.teams.length} teams)`);
  }

  console.log(`✅ Created ${tournamentsCreated} Tournaments`);
  console.log(`✅ Created ${participantsCreated} Tournament Participants`);
  console.log(`✅ Created ${teamsCreated} unique CONMEBOL teams (leagueId: null)`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Import failed:", e);
  process.exit(1);
});