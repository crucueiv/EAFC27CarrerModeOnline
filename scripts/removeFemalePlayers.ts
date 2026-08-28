import { PrismaClient } from "@prisma/client";
import { loadLocalEnvironment } from "../src/lib/config/env";
import { fetchEaRatings } from "../src/lib/ratings/eaClient";

loadLocalEnvironment();
const prisma = new PrismaClient();

async function main() {
  const femaleEaIds = new Set<number>();
  const maxPages = Math.max(1, Number(process.env.EA_FEMALE_CLEANUP_MAX_PAGES ?? "10000"));
  for (let page = 0; page < maxPages; page += 1) {
    const records = await fetchEaRatings({ locale: "es", limit: 100, offset: page * 100, allowEmpty: true });
    records.filter((record) => record.gender === "FEMALE").forEach((record) => femaleEaIds.add(record.eaId));
    if (records.length < 100) break;
  }
  const result = await prisma.$transaction(async (transaction) => {
    const female = await transaction.player.findMany({
      where: { OR: [{ gender: "FEMALE" }, { eaId: { in: [...femaleEaIds] } }] },
      select: { id: true }
    });
    const ids = female.map((player) => player.id);
    if (!ids.length) return { players: 0, rosters: 0, transfers: 0, stats: 0, events: 0, snapshots: 0 };
    const [rosters, transfers, stats, events, snapshots] = await Promise.all([
      transaction.roster.deleteMany({ where: { playerId: { in: ids } } }),
      transaction.transfer.deleteMany({ where: { playerId: { in: ids } } }),
      transaction.matchStat.deleteMany({ where: { playerId: { in: ids } } }),
      transaction.matchEvent.deleteMany({ where: { playerId: { in: ids } } }),
      transaction.ratingSnapshot.deleteMany({ where: { playerId: { in: ids } } })
    ]);
    await transaction.match.updateMany({ where: { mvpPlayerId: { in: ids } }, data: { mvpPlayerId: null } });
    await transaction.player.deleteMany({ where: { id: { in: ids } } });
    return { players: ids.length, rosters: rosters.count, transfers: transfers.count, stats: stats.count, events: events.count, snapshots: snapshots.count };
  });
  console.log(JSON.stringify(result));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
