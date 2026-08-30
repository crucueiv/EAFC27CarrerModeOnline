import { loadLocalEnvironment } from "../src/lib/config/env";
loadLocalEnvironment();
import { execSync } from "child_process";

async function runScript(name: string, script: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🚀 Running: ${name}`);
  console.log(`${"=".repeat(60)}`);
  try {
    execSync(`npx tsx ${script}`, { stdio: "inherit", cwd: process.cwd() });
    console.log(`\n✅ ${name} completed successfully`);
  } catch (error) {
    console.error(`\n❌ ${name} failed:`, error);
    process.exit(1);
  }
}

async function main() {
  console.log("🌱 Starting FC 27 Database Migration");
  console.log("This will RESET the entire database and import fresh data from EA & easysbc.io");

  await runScript("Database Cleanup", "scripts/cleanup-database.ts");
  await runScript("Import Countries & NationalTeams", "scripts/import-countries.ts");
  await runScript("Import Leagues & Teams", "scripts/import-leagues-teams.ts");
  await runScript("Import CONMEBOL Tournaments", "scripts/import-tournaments.ts");
  await runScript("Import Players", "scripts/import-players.ts");

  console.log("\n" + "=".repeat(60));
  console.log("🎉 MIGRATION COMPLETE!");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});