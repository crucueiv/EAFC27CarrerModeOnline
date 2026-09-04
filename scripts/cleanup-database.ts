import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Starting full database cleanup...");

  const tables = [
    "EmailMessage",
    "VerificationToken",
    "Session",
    "Account",
    "LineupBench",
    "LineupSlot",
    "Lineup",
    "RatingSnapshot",
    "MatchStat",
    "MatchEvent",
    "Match",
    "TournamentParticipant",
    "TournamentStageDependency",
    "TournamentStage",
    "Tournament",
    "Season",
    "Roster",
    "Transfer",
    "Player",
    "Manager",
    "Team",
    "League",
    "NationalTeam",
    "Country",
    "CareerGroupMember",
    "CareerGroup",
    "FormationSlot",
    "Formation",
    "User",
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
      console.log(`  ✓ Truncated ${table}`);
    } catch (error) {
      console.error(`  ✗ Failed to truncate ${table}:`, error);
    }
  }

  console.log("✅ Database cleanup complete!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Cleanup failed:", e);
  process.exit(1);
});