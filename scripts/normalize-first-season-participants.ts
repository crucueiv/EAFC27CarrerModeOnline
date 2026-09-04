import { loadLocalEnvironment } from "../src/lib/config/env";
loadLocalEnvironment();
import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import type { FirstSeasonParticipant } from "../src/lib/constants/FirstSeasonCompetitionsParticipants/types";

const prisma = new PrismaClient();

const FILES = [
  "ChampionsLeague_Participants_2026-27.json",
  "EuropaLeague_Participants_2026-27.json",
  "ConferenceLeague_Participants_2026-27.json",
  "Libertadores_Participants_2027.json",
  "Sudamericana_Participants_2027.json",
] as const;

const DIR = path.join(
  process.cwd(),
  "src",
  "lib",
  "constants",
  "FirstSeasonCompetitionsParticipants",
);

type LegacyEntry = {
  id?: string;
  tournamentId: string;
  teamId?: string;
  seed?: unknown;
  groupName?: unknown;
  zone?: unknown;
};

type NewEntry = {
  tournamentId: string;
  teamEaId: string;
  teamName: string;
};

type AnyEntry = LegacyEntry & Partial<NewEntry>;

function isAlreadyInNewFormat(entry: AnyEntry): entry is AnyEntry & NewEntry {
  return (
    typeof (entry as NewEntry).teamEaId === "string" &&
    (entry as NewEntry).teamEaId !== null &&
    (entry as NewEntry).teamEaId.length > 0
  );
}

async function loadFile(fileName: string): Promise<AnyEntry[]> {
  const raw = await fs.readFile(path.join(DIR, fileName), "utf-8");
  return JSON.parse(raw) as AnyEntry[];
}

async function saveFile(fileName: string, entries: FirstSeasonParticipant[]) {
  await fs.writeFile(
    path.join(DIR, fileName),
    JSON.stringify(entries, null, 2) + "\n",
    "utf-8",
  );
}

async function processFile(fileName: string) {
  const entries = await loadFile(fileName);
  const out: FirstSeasonParticipant[] = [];
  const missing: Array<{ index: number; tournamentId: string; reason: string }> = [];
  const updated: number[] = [];
  const kept: number[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    if (isAlreadyInNewFormat(entry)) {
      const team = await prisma.team.findUnique({
        where: { eaId: entry.teamEaId },
        select: { name: true, eaId: true },
      });
      if (!team || !team.eaId) {
        missing.push({
          index: i,
          tournamentId: entry.tournamentId,
          reason: `teamEaId=${entry.teamEaId} no encontrado en BD`,
        });
        continue;
      }
      const desired: FirstSeasonParticipant = {
        tournamentId: entry.tournamentId,
        teamEaId: team.eaId,
        teamName: team.name,
      };
      const same =
        desired.teamEaId === entry.teamEaId &&
        desired.teamName === entry.teamName;
      if (same) {
        kept.push(i);
        out.push(desired);
      } else {
        updated.push(i);
        out.push(desired);
      }
      continue;
    }

    if (!entry.teamId) {
      missing.push({
        index: i,
        tournamentId: entry.tournamentId,
        reason: "entry sin teamId ni teamEaId",
      });
      continue;
    }

    const team = await prisma.team.findUnique({
      where: { id: entry.teamId },
      select: { eaId: true, name: true },
    });
    if (!team || !team.eaId) {
      missing.push({
        index: i,
        tournamentId: entry.tournamentId,
        reason: `teamId=${entry.teamId} no encontrado en BD o sin eaId`,
      });
      continue;
    }

    out.push({
      tournamentId: entry.tournamentId,
      teamEaId: team.eaId,
      teamName: team.name,
    });
  }

  await saveFile(fileName, out);

  return { kept, updated, missing, total: entries.length, written: out.length };
}

async function main() {
  console.log("🔄 Normalizando FirstSeasonCompetitionsParticipants...");
  console.log(`   Dir: ${DIR}\n`);

  let grandTotal = 0;
  let grandUpdated = 0;
  let grandKept = 0;
  let grandMissing = 0;
  let grandWritten = 0;

  for (const fileName of FILES) {
    const result = await processFile(fileName);
    grandTotal += result.total;
    grandUpdated += result.updated.length;
    grandKept += result.kept.length;
    grandMissing += result.missing.length;
    grandWritten += result.written;

    console.log(
      `  📄 ${fileName}: ${result.total} entries (kept=${result.kept.length}, updated=${result.updated.length}, missing=${result.missing.length}, written=${result.written})`,
    );
    for (const m of result.missing) {
      console.log(
        `     ⚠️  [#${m.index}] ${m.tournamentId} → ${m.reason}`,
      );
    }
  }

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📊 Total: ${grandTotal} entries`);
  console.log(`   Mantenidos sin cambios : ${grandKept}`);
  console.log(`   Actualizados          : ${grandUpdated}`);
  console.log(`   Faltan datos en BD    : ${grandMissing}`);
  console.log(`   Escritos en archivo   : ${grandWritten}`);
  console.log("");

  if (grandMissing > 0) {
    console.log("⚠️  Hay entries sin resolver. Revisa los avisos arriba.");
  } else {
    console.log("✅ Todos los entries resueltos correctamente.");
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Normalize failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
