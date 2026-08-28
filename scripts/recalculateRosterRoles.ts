import { PrismaClient } from "@prisma/client";
import { loadLocalEnvironment } from "../src/lib/config/env";

loadLocalEnvironment();
const prisma = new PrismaClient();

async function main() {
  const [key, important, rotation] = await prisma.$transaction([
    prisma.roster.updateMany({
      where: { isActive: true, player: { overall: { gte: 85 } } },
      data: { role: "CLAVE" }
    }),
    prisma.roster.updateMany({
      where: { isActive: true, player: { overall: { gte: 77, lt: 85 } } },
      data: { role: "IMPORTANTE" }
    }),
    prisma.roster.updateMany({
      where: { isActive: true, player: { overall: { lt: 77 } } },
      data: { role: "ROTACION" }
    })
  ]);
  console.log(JSON.stringify({ clave: key.count, importante: important.count, rotacion: rotation.count }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
