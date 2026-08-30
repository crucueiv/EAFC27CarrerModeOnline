import { PrismaClient } from "@prisma/client";
import { translatePosition, translatePositions } from "@/lib/constants/position-translation";
import { mapAttributesToStats, fetchAllPlayersForLeague } from "@/lib/ratings/easysbcClient";
import { getPlayableLeagueIds } from "@/lib/constants/league-country-map";
import { normalizeSearchText } from "@/lib/search/normalize";

const prisma = new PrismaClient();

function shortName(name: string): string {
  return name.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "").trim().slice(0, 5).toUpperCase() || "TEAM";
}

const FREE_AGENTS_EA_ID = "FREE_AGENTS";
const FREE_AGENTS_TEAM_NAME = "Agentes Libres";
const FREE_AGENTS_LOGO = "https://www.fifacm.com/content/media/imgs/fifa21/teams/256/l111592.png";

const CONMEBOL_LEAGUE_IDS = ["1003", "1014"]; // Libertadores, Sudamericana

async function ensureFreeAgentsTeam() {
  return prisma.team.upsert({
    where: { eaId: FREE_AGENTS_EA_ID },
    update: { name: FREE_AGENTS_TEAM_NAME, imageUrl: FREE_AGENTS_LOGO, shortName: "AGENT" },
    create: { eaId: FREE_AGENTS_EA_ID, name: FREE_AGENTS_TEAM_NAME, imageUrl: FREE_AGENTS_LOGO, shortName: "AGENT", leagueId: null },
  });
}

async function main() {
  console.log("👥 Importing Players from easysbc.io...");
  
  const freeAgentsTeam = await ensureFreeAgentsTeam();
  console.log(`  ✓ Free Agents team ready: ${freeAgentsTeam.name} (${freeAgentsTeam.id})`);
  
  const playableLeagueIds = getPlayableLeagueIds();
  // Add CONMEBOL league IDs for player fetching (teams have leagueId: null in DB)
  const allLeagueIds = [...playableLeagueIds, ...CONMEBOL_LEAGUE_IDS];
  console.log(`  Found ${playableLeagueIds.length} playable leagues + ${CONMEBOL_LEAGUE_IDS.length} CONMEBOL leagues`);

  let totalPlayersCreated = 0;
  let totalFreeAgents = 0;
  let totalErrors = 0;

  for (const leagueId of allLeagueIds) {
    try {
      console.log(`\n📥 Fetching players for league ${leagueId}...`);
      const players = await fetchAllPlayersForLeague(leagueId);
      console.log(`  Found ${players.length} players`);

      let leagueCreated = 0;
      for (const player of players) {
        try {
          let team = await prisma.team.findUnique({ where: { eaId: String(player.clubId) } });
          
          if (!team) {
            console.log(`    ⚠️ Team not found for clubId ${player.clubId}, assigning to Free Agents: ${player.name}`);
            team = freeAgentsTeam;
            totalFreeAgents++;
          }

          const country = await prisma.country.findUnique({ where: { eaId: String(player.countryId) } });
          if (!country) {
            console.log(`    ⚠️ Country not found for countryId ${player.countryId}, skipping player ${player.name}`);
            continue;
          }

          // For CONMEBOL leagues, the team exists but leagueId is null in our DB
          // We still need to find the league for reference, but team is already linked
          const league = await prisma.league.findUnique({ where: { eaId: String(player.leagueId) } });
          if (!league && !CONMEBOL_LEAGUE_IDS.includes(leagueId)) {
            console.log(`    ⚠️ League not found for leagueId ${player.leagueId}, skipping player ${player.name}`);
            continue;
          }

          const stats = mapAttributesToStats(player.attributes);
          const preferredPos = translatePosition(player.preferredPosition);
          const altPositions = translatePositions(player.positions.filter(p => p !== player.preferredPosition));
          const possiblePositions = translatePositions(player.possiblePositions.filter(p => p !== player.preferredPosition));

          const createdPlayer = await prisma.player.upsert({
            where: { eaId: player.resourceId },
            update: {
              name: player.name,
              normalizedName: normalizeSearchText(player.name),
              avatarUrl: player.playerUrl,
              position: preferredPos,
              eaPositionId: player.preferredPosition,
              overall: player.rating,
              potential: Math.min(99, player.rating + 5),
              pace: stats.pace,
              shooting: stats.shooting,
              passing: stats.passing,
              dribbling: stats.dribbling,
              defending: stats.defending,
              physical: stats.physical,
              marketValue: team.eaId === FREE_AGENTS_EA_ID ? 0 : player.price,
              nationalityId: country.id,
              skillMoves: player.skillMoves,
              weakFoot: player.weakFoot,
              preferredFoot: player.preferredFoot === "Right" ? "RIGHT" : "LEFT",
            },
            create: {
              eaId: player.resourceId,
              externalId: String(player.resourceId),
              name: player.name,
              normalizedName: normalizeSearchText(player.name),
              avatarUrl: player.playerUrl,
              position: preferredPos,
              eaPositionId: player.preferredPosition,
              overall: player.rating,
              potential: Math.min(99, player.rating + 5),
              pace: stats.pace,
              shooting: stats.shooting,
              passing: stats.passing,
              dribbling: stats.dribbling,
              defending: stats.defending,
              physical: stats.physical,
              marketValue: team.eaId === FREE_AGENTS_EA_ID ? 0 : player.price,
              nationalityId: country.id,
              skillMoves: player.skillMoves,
              weakFoot: player.weakFoot,
              preferredFoot: player.preferredFoot === "Right" ? "RIGHT" : "LEFT",
              gender: "MALE",
              internationalReputation: player.rating >= 90 ? 5 : player.rating >= 85 ? 4 : player.rating >= 80 ? 3 : player.rating >= 70 ? 2 : 1,
            },
          });

          const existingRoster = await prisma.roster.findFirst({
            where: { teamId: team.id, playerId: createdPlayer.id, seasonId: null },
          });
          if (existingRoster) {
            await prisma.roster.update({
              where: { id: existingRoster.id },
              data: { isActive: true, role: createdPlayer.overall >= 85 ? "CLAVE" : createdPlayer.overall >= 77 ? "IMPORTANTE" : "ROTACION" },
            });
          } else {
            await prisma.roster.create({
              data: { teamId: team.id, playerId: createdPlayer.id, seasonId: null, isActive: true, role: createdPlayer.overall >= 85 ? "CLAVE" : createdPlayer.overall >= 77 ? "IMPORTANTE" : "ROTACION" },
            });
          }

          leagueCreated++;
          totalPlayersCreated++;
        } catch (playerError) {
          console.error(`    ❌ Error importing player ${player.name}:`, playerError);
          totalErrors++;
        }
      }
      console.log(`  ✅ Imported ${leagueCreated} players for league ${leagueId}`);
    } catch (leagueError) {
      console.error(`  ❌ Error fetching league ${leagueId}:`, leagueError);
      totalErrors++;
    }
  }

  console.log(`\n✅ Total players imported: ${totalPlayersCreated}`);
  console.log(`🆓 Free agents assigned: ${totalFreeAgents}`);
  console.log(`❌ Total errors: ${totalErrors}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Import failed:", e);
  process.exit(1);
});