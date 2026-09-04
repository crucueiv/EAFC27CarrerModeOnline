import { loadLocalEnvironment } from "../src/lib/config/env";
loadLocalEnvironment();
import { PrismaClient } from "@prisma/client";
import { getStandingsForLeague, getCompetitionsData } from "../src/lib/competitions";
import { getLeagueFormatSpec } from "../src/lib/league-formats/catalog";
import { clearContinentSpotsCache } from "../src/lib/coefficients/resolveContinentSpots";

function isDebugEnabled(): boolean {
  const v = process.env.EAFC_DEBUG;
  return v === "1" || v === "standings" || v === "all";
}

if (!isDebugEnabled()) {
  console.error("⛔  EAFC_DEBUG no está activo. Exporta EAFC_DEBUG=1 (o 'standings' / 'all') antes de ejecutar este script.");
  console.error("    Ejemplo:  EAFC_DEBUG=1 npx tsx scripts/debug-standings.ts 13");
  process.exit(1);
}

const prisma = new PrismaClient();
const filterEaId = process.argv[2]?.trim() || null;

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

async function inspectLeague(leagueId: string) {
  clearContinentSpotsCache();
  const data = await getStandingsForLeague(leagueId);
  if (!data) {
    console.log(`  ⚠️  Liga ${leagueId} no encontrada o sin equipos suficientes.`);
    return;
  }
  console.log("");
  console.log(`━━━ ${data.name} ━━━`);
  console.log(`  id         : ${data.id}`);
  console.log(`  eaId       : ${data.eaId ?? "(null)"}`);
  console.log(`  country    : ${data.country}`);
  console.log(`  continent  : ${data.continent}`);
  console.log(`  teams      : ${data.teams.length}`);
  console.log(`  isTopDiv   : ${data.isTopDivision}`);
  console.log(`  hasRelZone : ${data.hasRelegationZone}`);
  console.log(`  hasMatches : ${data.hasMatches}`);
  console.log(`  format     : ${data.format ? `${data.format.kind} (eaId=${data.format.eaId})` : "(null)"}`);
  if (data.format?.splitConfig) {
    const sc = data.format.splitConfig;
    console.log(`  split      : upper="${sc.upperGroupName}"(${sc.upperGroupSize})  lower="${sc.lowerGroupName}"(${sc.lowerGroupSize})`);
  }
  console.log(`  spots      : championsDirect=${data.spots.championsDirect}  championsPlayoff=${data.spots.championsPlayoffSlots}  championsQual=${data.spots.championsQualifying}  europa=${data.spots.europa}  conference=${data.spots.conference}`);
  console.log(`               libertadoresDirect=${data.spots.libertadoresDirect}  libertadoresQual=${data.spots.libertadoresQualifying}  sudamericana=${data.spots.sudamericana}`);
  console.log("");
  console.log(`  ${pad("rank", 5)}${pad("band", 26)}${pad("group", 8)}equipo`);
  console.log(`  ${"-".repeat(75)}`);
  for (const t of data.teams.slice(0, 10)) {
    console.log(`  ${pad(String(t.rank), 5)}${pad(t.band, 26)}${pad(t.group ?? "-", 8)}${t.teamName}`);
  }
  if (data.teams.length > 10) {
    console.log(`  ... (${data.teams.length - 10} más)`);
  }
}

async function main() {
  if (filterEaId) {
    const league = await prisma.league.findFirst({
      where: { OR: [{ eaId: filterEaId }, { id: filterEaId }] },
      select: { id: true, eaId: true, name: true, country: true, continent: true },
    });
    if (!league) {
      console.error(`❌ Liga con eaId/id "${filterEaId}" no encontrada.`);
      process.exit(1);
    }
    await inspectLeague(league.id);
  } else {
    const leagues = await prisma.league.findMany({
      where: { isPlayable: true },
      orderBy: [{ continent: "asc" }, { country: "asc" }, { name: "asc" }],
      include: { _count: { select: { teams: true } } },
    });
    const playable = leagues.filter((l) => l._count.teams >= 10);
    console.log(`📊 Inspeccionando ${playable.length} ligas jugables...`);
    for (const league of playable) {
      await inspectLeague(league.id);
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Debug falló:", e);
  process.exit(1);
});
