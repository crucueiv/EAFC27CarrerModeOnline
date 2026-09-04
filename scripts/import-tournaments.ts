import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import { normalizeSearchText } from "../src/lib/search/normalize";
import { fetchTeamApiSportsMap } from "../src/lib/catalog/importEaCatalog";
import { fetchEARatingsPayload } from "../src/lib/ea/ratings-client";
import type { FirstSeasonParticipant } from "../src/lib/constants/FirstSeasonCompetitionsParticipants/types";

const prisma = new PrismaClient();

interface EATeamGroup {
  id: string;
  label: string;
  teams: Array<{ id: number; label: string; imageUrl: string; isPopular: boolean }>;
}

async function fetchEATeamGroups(): Promise<EATeamGroup[]> {
  const data = await fetchEARatingsPayload<{
    pageProps?: { auxData?: { defaultLocaleFilters?: { teamGroups?: EATeamGroup[] } } };
  }>();
  return data.pageProps?.auxData?.defaultLocaleFilters?.teamGroups ?? [];
}

function shortName(name: string): string {
  return name.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "").trim().slice(0, 5).toUpperCase() || "TEAM";
}

const CONMEBOL_TOURNAMENTS = {
  "1003": { id: "conmebol-1003", name: "CONMEBOL Libertadores" },
  "1014": { id: "conmebol-1014", name: "CONMEBOL Sudamericana" },
} as const;

const UEFA_TOURNAMENTS = [
  { id: "uefa-champions-league-2627", name: "UEFA Champions League" },
  { id: "uefa-europa-league-2627", name: "UEFA Europa League" },
  { id: "uefa-conference-league-2627", name: "UEFA Conference League" },
] as const;

const FIRST_SEASON_FILES = [
  { fileName: "ChampionsLeague_Participants_2026-27.json", defaultId: "uefa-champions-league-2627", name: "UEFA Champions League" },
  { fileName: "EuropaLeague_Participants_2026-27.json", defaultId: "uefa-europa-league-2627", name: "UEFA Europa League" },
  { fileName: "ConferenceLeague_Participants_2026-27.json", defaultId: "uefa-conference-league-2627", name: "UEFA Conference League" },
  { fileName: "Libertadores_Participants_2027.json", defaultId: "conmebol-1003", name: "CONMEBOL Libertadores" },
  { fileName: "Sudamericana_Participants_2027.json", defaultId: "conmebol-1014", name: "CONMEBOL Sudamericana" },
] as const;

async function main() {
  console.log("🏆 Importing Tournaments & First Season Participants...");

  // Step 1: Create/Upsert UEFA & CONMEBOL Tournaments
  for (const uefa of UEFA_TOURNAMENTS) {
    await prisma.tournament.upsert({
      where: { id: uefa.id },
      update: { name: uefa.name },
      create: { id: uefa.id, name: uefa.name, seasonId: null },
    });
    console.log(`  ✓ Tournament created/updated: ${uefa.name} (id: ${uefa.id})`);
  }

  for (const key of Object.keys(CONMEBOL_TOURNAMENTS)) {
    const info = CONMEBOL_TOURNAMENTS[key as keyof typeof CONMEBOL_TOURNAMENTS];
    await prisma.tournament.upsert({
      where: { id: info.id },
      update: { name: info.name },
      create: { id: info.id, name: info.name, seasonId: null },
    });
    console.log(`  ✓ Tournament created/updated: ${info.name} (id: ${info.id})`);
  }

  // Step 2: Fetch CONMEBOL Teams from EA catalog if needed
  try {
    const [teamGroups, apiSportsMap] = await Promise.all([
      fetchEATeamGroups(),
      fetchTeamApiSportsMap(),
    ]);
    const conmebolGroups = teamGroups.filter((g) => g.id in CONMEBOL_TOURNAMENTS);

    for (const group of conmebolGroups) {
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
            ...(teamApiSportsId ? { apiSportsId: teamApiSportsId } : {}),
          },
          create: {
            eaId: teamEaId,
            name: team.label,
            normalizedName: normalizeSearchText(team.label),
            shortName: shortName(team.label),
            imageUrl: team.imageUrl,
            leagueId: null,
            ...(teamApiSportsId ? { apiSportsId: teamApiSportsId } : {}),
          },
        });
      }
    }
  } catch (err) {
    console.warn("  ⚠️ Could not fetch extra CONMEBOL EA team groups payload:", err);
  }

  // Step 3: Seed Participants from FirstSeasonCompetitionsParticipants JSON files
  const dirPath = path.join(process.cwd(), "src", "lib", "constants", "FirstSeasonCompetitionsParticipants");
  let totalParticipantsSeeded = 0;

  for (const item of FIRST_SEASON_FILES) {
    const filePath = path.join(dirPath, item.fileName);
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const participants = JSON.parse(raw) as FirstSeasonParticipant[];

      for (const p of participants) {
        const tournamentId = p.tournamentId || item.defaultId;

        // Ensure tournament exists
        await prisma.tournament.upsert({
          where: { id: tournamentId },
          update: { name: item.name },
          create: { id: tournamentId, name: item.name, seasonId: null },
        });

        // Resolve Team by teamEaId or normalizedName
        let dbTeam = await prisma.team.findUnique({
          where: { eaId: p.teamEaId },
        });
        if (!dbTeam) {
          dbTeam = await prisma.team.findFirst({
            where: { normalizedName: normalizeSearchText(p.teamName) },
          });
        }

        if (!dbTeam) {
          console.warn(`  ⚠️ Participant team not found in DB: ${p.teamName} (teamEaId: ${p.teamEaId})`);
          continue;
        }

        await prisma.tournamentParticipant.upsert({
          where: {
            tournamentId_teamId: {
              tournamentId,
              teamId: dbTeam.id,
            },
          },
          update: {},
          create: {
            tournamentId,
            teamId: dbTeam.id,
          },
        });
        totalParticipantsSeeded++;
      }
      console.log(`  ✅ Seeded ${participants.length} participants from ${item.fileName}`);
    } catch (err) {
      console.error(`  ❌ Error processing file ${item.fileName}:`, err);
    }
  }

  console.log(`\n🎉 Tournament and Participant Import Complete! Total participants: ${totalParticipantsSeeded}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Import failed:", e);
  process.exit(1);
});