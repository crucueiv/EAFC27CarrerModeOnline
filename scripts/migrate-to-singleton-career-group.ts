import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SINGLETON_NAME = "Carrera Online";
const SINGLETON_INVITE = "singleton-career-group";

async function main() {
  console.log("[migrate-to-singleton] ▶ start");

  const existing = await prisma.careerGroup.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  let singletonId: string;
  if (existing) {
    singletonId = existing.id;
    console.log(`[migrate-to-singleton] singleton already exists: ${existing.name} (${singletonId})`);
  } else {
    const created = await prisma.careerGroup.create({
      data: { name: SINGLETON_NAME, inviteCode: SINGLETON_INVITE },
      select: { id: true },
    });
    singletonId = created.id;
    console.log(`[migrate-to-singleton] ✓ created singleton: ${SINGLETON_NAME} (${singletonId})`);
  }

  const oldGroups = await prisma.careerGroup.findMany({
    where: { id: { not: singletonId } },
    select: { id: true, name: true },
  });

  if (oldGroups.length === 0) {
    console.log("[migrate-to-singleton] nothing to migrate. Done.");
    return;
  }

  console.log(`[migrate-to-singleton] found ${oldGroups.length} legacy group(s) to merge`);

  for (const g of oldGroups) {
    console.log(`[migrate-to-singleton] ▶ migrating group "${g.name}" (${g.id})`);

    const seasons = await prisma.season.updateMany({
      where: { careerGroupId: g.id },
      data: { careerGroupId: singletonId },
    });
    const tournaments = await prisma.tournament.updateMany({
      where: { careerGroupId: g.id },
      data: { careerGroupId: singletonId },
    });
    const calendars = await prisma.teamCalendarState.updateMany({
      where: { careerGroupId: g.id },
      data: { careerGroupId: singletonId },
    });
    const leagues = await prisma.league.updateMany({
      where: { careerGroupId: g.id },
      data: { careerGroupId: singletonId },
    });
    const clocks = await prisma.careerGroupClock.updateMany({
      where: { careerGroupId: g.id },
      data: { careerGroupId: singletonId },
    });

    const oldMembers = await prisma.careerGroupMember.findMany({
      where: { careerGroupId: g.id },
      select: { userId: true, role: true },
    });
    for (const m of oldMembers) {
      await prisma.careerGroupMember.upsert({
        where: { userId_careerGroupId: { userId: m.userId, careerGroupId: singletonId } },
        create: { userId: m.userId, careerGroupId: singletonId, role: m.role },
        update: {},
      });
    }
    await prisma.careerGroupMember.deleteMany({ where: { careerGroupId: g.id } });

    await prisma.careerGroup.delete({ where: { id: g.id } });

    console.log(
      `[migrate-to-singleton] ✓ migrated: seasons=${seasons.count} tournaments=${tournaments.count} calendars=${calendars.count} leagues=${leagues.count} clocks=${clocks.count} members=${oldMembers.length}`,
    );
  }

  const remaining = await prisma.careerGroup.count();
  console.log(`[migrate-to-singleton] done. CareerGroups in DB: ${remaining}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("[migrate-to-singleton] ✗ error:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
