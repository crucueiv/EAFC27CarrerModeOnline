import { loadLocalEnvironment } from "../src/lib/config/env";
loadLocalEnvironment();
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function isDebugEnabled(): boolean {
  const v = process.env.EAFC_DEBUG;
  return v === "1" || v === "all" || v === "cleanup";
}

if (!isDebugEnabled()) {
  console.error("⛔  EAFC_DEBUG no está activo. Exporta EAFC_DEBUG=1 (o 'all' / 'cleanup') antes de ejecutar este script.");
  console.error("    Ejemplo:  EAFC_DEBUG=1 npx tsx scripts/cleanup-league-season-configs.ts");
  process.exit(1);
}

function isAllZero(config: {
  championsSpots: number;
  championsQualifyingSpots: number;
  europaSpots: number;
  conferenceSpots: number;
  libertadoresDirectSpots: number;
  libertadoresQualifyingSpots: number;
  sudamericanaSpots: number;
}): boolean {
  return (
    config.championsSpots === 0 &&
    config.championsQualifyingSpots === 0 &&
    config.europaSpots === 0 &&
    config.conferenceSpots === 0 &&
    config.libertadoresDirectSpots === 0 &&
    config.libertadoresQualifyingSpots === 0 &&
    config.sudamericanaSpots === 0
  );
}

function isMalformed(config: {
  championsSpots: number;
  europaSpots: number;
  conferenceSpots: number;
}): boolean {
  return (
    config.championsSpots > 0 &&
    config.europaSpots === 0 &&
    config.conferenceSpots === 0
  );
}

async function main() {
  const DRY_RUN = process.env.DRY_RUN === "1";
  const FORCE = process.env.FORCE === "1";

  console.log("🧹 Limpiando LeagueSeasonConfig legacy...");
  if (DRY_RUN) console.log("   (DRY-RUN: no se borrará nada)");

  const all = await prisma.leagueSeasonConfig.findMany({
    select: {
      id: true,
      leagueId: true,
      seasonId: true,
      championsSpots: true,
      championsQualifyingSpots: true,
      europaSpots: true,
      conferenceSpots: true,
      libertadoresDirectSpots: true,
      libertadoresQualifyingSpots: true,
      sudamericanaSpots: true,
    },
  });

  const toDelete: typeof all = [];
  const reasons = new Map<string, string>();

  for (const cfg of all) {
    if (isAllZero(cfg)) {
      toDelete.push(cfg);
      reasons.set(cfg.id, "all-zero");
    } else if (isMalformed(cfg)) {
      toDelete.push(cfg);
      reasons.set(cfg.id, "malformed");
    }
  }

  console.log(`📊 Total configs: ${all.length}`);
  console.log(`   A borrar: ${toDelete.length}`);

  if (toDelete.length === 0) {
    console.log("✅ Nada que limpiar.");
    await prisma.$disconnect();
    return;
  }

  if (!DRY_RUN && !FORCE) {
    console.log("");
    console.log("Primeros 5 a borrar:");
    for (const cfg of toDelete.slice(0, 5)) {
      const league = await prisma.league.findUnique({
        where: { id: cfg.leagueId },
        select: { name: true, eaId: true },
      });
      console.log(
        `  - ${cfg.id} (league=${league?.name ?? cfg.leagueId}, season=${cfg.seasonId}) → ${reasons.get(cfg.id)}`,
      );
    }
    console.log("");
    console.log("Para ejecutar la limpieza, usa:");
    console.log("  EAFC_DEBUG=1 npx tsx scripts/cleanup-league-season-configs.ts  (DRY-RUN)");
    console.log("  FORCE=1 EAFC_DEBUG=1 npx tsx scripts/cleanup-league-season-configs.ts  (REAL)");
    await prisma.$disconnect();
    return;
  }

  let deleted = 0;
  for (const cfg of toDelete) {
    try {
      await prisma.leagueSeasonConfig.delete({ where: { id: cfg.id } });
      deleted++;
    } catch (e) {
      console.error(`  ❌ Error borrando ${cfg.id}:`, e);
    }
  }

  console.log("");
  console.log(`✅ Borrados: ${deleted}/${toDelete.length}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Cleanup failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
