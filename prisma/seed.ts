import { loadLocalEnvironment } from "../src/lib/config/env";
loadLocalEnvironment();
import { PrismaClient } from "@prisma/client";
import { importEaCatalog } from "../src/lib/catalog/importEaCatalog";

const prisma = new PrismaClient();

async function main() {
  const maxPlayers = Number(process.env.EA_IMPORT_MAX_PLAYERS ?? "1000000");
  const totals = await importEaCatalog(prisma, Number.isFinite(maxPlayers) ? maxPlayers : 1_000_000);
  console.log(JSON.stringify(totals));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
