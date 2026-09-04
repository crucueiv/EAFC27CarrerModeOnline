import { PrismaClient } from "@prisma/client";
import { FORMATIONS } from "../src/lib/constants/formations";

const prisma = new PrismaClient();

async function main() {
  console.log(`📥 Seeding ${FORMATIONS.length} formations...`);

  for (const formation of FORMATIONS) {
    await prisma.formation.upsert({
      where: { id: formation.id },
      update: {
        name: formation.name,
        category: formation.category,
      },
      create: {
        id: formation.id,
        name: formation.name,
        category: formation.category,
      },
    });

    await prisma.formationSlot.deleteMany({
      where: { formationId: formation.id },
    });

    await prisma.formationSlot.createMany({
      data: formation.slots.map((slot, index) => ({
        formationId: formation.id,
        slotIndex: index,
        position: slot.position,
        label: slot.label,
      })),
    });
  }

  console.log(`✅ Seeded ${FORMATIONS.length} formations with their slots`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
