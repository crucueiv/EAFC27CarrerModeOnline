import { loadLocalEnvironment } from "../src/lib/config/env";
loadLocalEnvironment();
import { PrismaClient } from "@prisma/client";
import { LEAGUE_FORMAT_CATALOG } from "../src/lib/league-formats/catalog";

const prisma = new PrismaClient();

async function main() {
  console.log(`📥 Seeding ${LEAGUE_FORMAT_CATALOG.length} league formats...`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const spec of LEAGUE_FORMAT_CATALOG) {
    if (!spec.eaId) {
      skipped++;
      continue;
    }
    const league = await prisma.league.findUnique({
      where: { eaId: spec.eaId },
      select: { id: true },
    });
    if (!league) {
      skipped++;
      continue;
    }

    const higherLeagueEaId = spec.higherLeagueEaId;
    let higherLeagueId: string | null = null;
    if (higherLeagueEaId) {
      const higher = await prisma.league.findUnique({
        where: { eaId: higherLeagueEaId },
        select: { id: true },
      });
      higherLeagueId = higher?.id ?? null;
    }

    const splitConfig = spec.splitConfig ? JSON.stringify(spec.splitConfig) : null;

    const data = {
      kind: spec.kind,
      totalTeams: spec.totalTeams,
      roundsRegular: spec.roundsRegular,
      hasReturn: spec.hasReturn,
      hasTitlePlayoff: spec.hasTitlePlayoff ?? false,
      titlePlayoffTopN: spec.titlePlayoffTopN ?? null,
      titlePlayoffFormat: spec.titlePlayoffFormat ?? null,
      promotionType: spec.promotion?.type ?? "NONE",
      promotionSlots: spec.promotion?.slots ?? 0,
      promotionPlayoffSlots: spec.promotion?.playoffSlots ?? 0,
      promotionPlayoffTopN: spec.promotion?.playoffTopN ?? null,
      relegationType: spec.relegation?.type ?? "NONE",
      relegationSlots: spec.relegation?.slots ?? 0,
      relegationPlayoffSlots: spec.relegation?.playoffSlots ?? 0,
      relegationPlayoffBottomN: spec.relegation?.playoffBottomN ?? null,
      tournamentCount: spec.tournamentCount ?? 1,
      hasAnnualTable: spec.hasAnnualTable ?? false,
      annualTableWinsCopaLibertadores: spec.annualTableWinsCopaLibertadores ?? false,
      usesReclasiTable: spec.usesReclasiTable ?? false,
      homeAndAwayBonus: spec.homeAndAwayBonus ?? null,
      calendarSpanWeeks: spec.calendarSpanWeeks ?? 38,
      matchweekIntervalDays: spec.matchweekIntervalDays ?? 7,
      splitConfig,
    };

    const existing = await prisma.leagueFormat.findUnique({
      where: { leagueId: league.id },
    });
    if (existing) {
      await prisma.leagueFormat.update({ where: { leagueId: league.id }, data });
      updated++;
    } else {
      await prisma.leagueFormat.create({ data: { leagueId: league.id, ...data } });
      created++;
    }

    await prisma.league.update({
      where: { id: league.id },
      data: {
        formatId: league.id,
        higherLeagueId,
      },
    });
  }

  console.log(`✅ Created ${created} league formats, updated ${updated}, skipped ${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
