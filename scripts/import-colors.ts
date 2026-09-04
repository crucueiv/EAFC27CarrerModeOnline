import { loadLocalEnvironment } from "../src/lib/config/env";
loadLocalEnvironment();
import { PrismaClient } from "@prisma/client";
import { normalizeSearchText } from "../src/lib/search/normalize";

const prisma = new PrismaClient();

const TEAMS_URL =
  "https://res.cloudinary.com/oiugg8m6/raw/upload/v1788235419/p4hurburxr5xx8z7gczh.json";

interface ColorRecord {
  id?: string;
  eaId?: string;
  name: string;
  leagueId?: string | null;
  leagueName?: string | null;
  primaryColor: string;
  secondaryColor: string;
}

function isDebugEnabled(): boolean {
  const v = process.env.EAFC_DEBUG;
  return v === "1" || v === "all" || v === "colors";
}

const DRY_RUN = process.env.DRY_RUN === "1";
const VERBOSE = process.env.VERBOSE === "1";

function normalizeHex(value: string, fallback: string): string {
  if (!value || typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("#")) return fallback;
  if (trimmed.length === 4) {
    return `#${trimmed
      .slice(1)
      .split("")
      .map((c) => c + c)
      .join("")}`.toLowerCase();
  }
  if (trimmed.length === 7) return trimmed.toLowerCase();
  return fallback;
}

function pickMostCommon(map: Map<string, { color: string; count: number }>, fallback: string): string {
  let best = fallback;
  let bestCount = 0;
  for (const { color, count } of map.values()) {
    if (count > bestCount) {
      best = color;
      bestCount = count;
    }
  }
  return best;
}

async function fetchColors(url: string): Promise<ColorRecord[]> {
  console.log(`📥 Fetching ${url} ...`);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Failed to fetch colors: ${res.status}`);
  const data = (await res.json()) as ColorRecord[];
  console.log(`  Found ${data.length} records`);
  return data;
}

async function findTeam(record: ColorRecord): Promise<{ id: string; reason: string } | null> {
  if (record.eaId) {
    const t = await prisma.team.findUnique({
      where: { eaId: record.eaId },
      select: { id: true, name: true, league: { select: { name: true } } },
    });
    if (t) return { id: t.id, reason: `eaId=${record.eaId}` };
  }

  const normName = normalizeSearchText(record.name);
  if (record.leagueName) {
    const normLeague = normalizeSearchText(record.leagueName);
    const t = await prisma.team.findFirst({
      where: {
        normalizedName: normName,
        league: { name: { equals: record.leagueName } },
      },
      select: { id: true, name: true },
    });
    if (t) return { id: t.id, reason: `name+leagueName exact (${normLeague})` };

    const t2 = await prisma.team.findFirst({
      where: {
        normalizedName: normName,
        league: { normalizedName: normLeague },
      },
      select: { id: true, name: true },
    });
    if (t2) return { id: t2.id, reason: `name+leagueName normalized` };
  }

  const fallback = await prisma.team.findFirst({
    where: { normalizedName: normName },
    select: { id: true, name: true, league: { select: { name: true } } },
  });
  if (fallback) return { id: fallback.id, reason: `name only (league=${fallback.league?.name ?? "—"})` };

  return null;
}

async function findLeague(record: ColorRecord): Promise<{ id: string; reason: string } | null> {
  if (!record.leagueName) return null;
  const normLeague = normalizeSearchText(record.leagueName);

  const exact = await prisma.league.findFirst({
    where: { name: record.leagueName },
    select: { id: true, name: true, country: true },
  });
  if (exact) return { id: exact.id, reason: "name exact" };

  const norm = await prisma.league.findFirst({
    where: { normalizedName: normLeague },
    select: { id: true, name: true, country: true },
  });
  if (norm) return { id: norm.id, reason: "name normalized" };

  return null;
}

async function main() {
  if (DRY_RUN) {
    console.log("🧪  Modo DRY-RUN activado. No se escribirá en la BD.");
  }

  const records = await fetchColors(TEAMS_URL);

  let teamsUpdated = 0;
  let teamsNotFound = 0;
  let teamsCollision = 0;
  const samples: Array<{ record: ColorRecord; reason: string; status: "ok" | "skipped" | "missing" }> = [];

  const leaguePrimaryMap = new Map<string, { color: string; count: number }>();
  const leagueSecondaryMap = new Map<string, { color: string; count: number }>();

  let processed = 0;
  for (const record of records) {
    processed++;
    if (processed % 100 === 0) {
      console.log(`  ... ${processed}/${records.length}`);
    }
    const primary = normalizeHex(record.primaryColor, "#2563eb");
    const secondary = normalizeHex(record.secondaryColor, "#f8fafc");

    const teamMatch = await findTeam(record);
    if (!teamMatch) {
      teamsNotFound++;
      if (samples.length < 10) {
        samples.push({ record, reason: "no match", status: "missing" });
      }
      continue;
    }

    if (teamMatch.reason.startsWith("name only")) {
      teamsCollision++;
      if (samples.length < 10) {
        samples.push({ record, reason: teamMatch.reason, status: "skipped" });
      }
      continue;
    }

    if (!DRY_RUN) {
      await prisma.team.update({
        where: { id: teamMatch.id },
        data: { primaryColor: primary, secondaryColor: secondary },
      });
      if (VERBOSE) {
        console.log(`  ✓ ${record.name} (${record.leagueName ?? "—"}) → ${primary} / ${secondary}`);
      }
    }
    teamsUpdated++;

    let leagueKey: string | null = null;
    if (!DRY_RUN) {
      const league = record.leagueName ? await findLeague(record) : null;
      if (league) leagueKey = league.id;
    } else {
      const league = record.leagueName ? await findLeague(record) : null;
      leagueKey = league?.id ?? null;
    }

    if (leagueKey) {
      const prevPrimary = leaguePrimaryMap.get(leagueKey);
      if (!prevPrimary || prevPrimary.color === primary) {
        leaguePrimaryMap.set(leagueKey, {
          color: primary,
          count: (prevPrimary?.count ?? 0) + 1,
        });
      }
      const prevSecondary = leagueSecondaryMap.get(leagueKey);
      if (!prevSecondary || prevSecondary.color === secondary) {
        leagueSecondaryMap.set(leagueKey, {
          color: secondary,
          count: (prevSecondary?.count ?? 0) + 1,
        });
      }
    }
  }

  let leaguesUpdated = 0;
  let leaguesSkipped = 0;
  for (const [leagueId, { color: primary }] of leaguePrimaryMap) {
    const secondaryEntry = leagueSecondaryMap.get(leagueId);
    const secondary = secondaryEntry?.color ?? "#111827";

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { id: true },
    });
    if (!league) {
      leaguesSkipped++;
      continue;
    }

    if (!DRY_RUN) {
      await prisma.league.update({
        where: { id: leagueId },
        data: {
          primaryColor: normalizeHex(primary, "#dc2626"),
          secondaryColor: normalizeHex(secondary, "#111827"),
        },
      });
      if (VERBOSE) {
        console.log(`  ✓ League ${leagueId}: primary=${primary} secondary=${secondary}`);
      }
    }
    leaguesUpdated++;
  }

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📊 Resumen ${DRY_RUN ? "(DRY-RUN)" : ""}`);
  console.log(`  Teams updated           : ${teamsUpdated}`);
  console.log(`  Teams skipped (coll.)   : ${teamsCollision}  (matched by name only, league disambiguation needed)`);
  console.log(`  Teams not found         : ${teamsNotFound}`);
  console.log(`  Leagues updated         : ${leaguesUpdated}`);
  console.log(`  Leagues skipped (no row): ${leaguesSkipped}`);
  console.log("");

  if (samples.length > 0) {
    console.log("🔎 Muestras (primeras 10):");
    for (const s of samples) {
      console.log(
        `  [${s.status.padEnd(8)}] "${s.record.name}" (league=${s.record.leagueName ?? "—"})  → ${s.reason}`,
      );
    }
  }

  if (DRY_RUN) {
    console.log("");
    console.log("ℹ️  Ejecuta sin DRY_RUN para aplicar los cambios:");
    console.log("    npx tsx scripts/import-colors.ts");
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Import failed:", e);
  process.exit(1);
});
