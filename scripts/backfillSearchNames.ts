import { PrismaClient } from "@prisma/client";
import { normalizeSearchText } from "../src/lib/search/normalize";

const prisma = new PrismaClient();

async function main() {
  const [players, teams, leagues, countries] = await Promise.all([
    prisma.player.findMany({ select: { id: true, name: true } }),
    prisma.team.findMany({ select: { id: true, name: true } }),
    prisma.league.findMany({ select: { id: true, name: true } }),
    prisma.country.findMany({ select: { id: true, name: true } })
  ]);
  await prisma.$transaction([
    ...players.map((item) => prisma.player.update({ where: { id: item.id }, data: { normalizedName: normalizeSearchText(item.name) } })),
    ...teams.map((item) => prisma.team.update({ where: { id: item.id }, data: { normalizedName: normalizeSearchText(item.name) } })),
    ...leagues.map((item) => prisma.league.update({ where: { id: item.id }, data: { normalizedName: normalizeSearchText(item.name) } })),
    ...countries.map((item) => prisma.country.update({ where: { id: item.id }, data: { normalizedName: normalizeSearchText(item.name) } }))
  ]);
  console.log(`Normalizados: ${players.length} jugadores, ${teams.length} equipos, ${leagues.length} ligas y ${countries.length} países.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
