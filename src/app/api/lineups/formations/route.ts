import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FORMATIONS } from "@/lib/constants/formations";

export const dynamic = "force-dynamic";

export async function GET() {
  const stored = await prisma.formation.findMany({
    include: { slots: { orderBy: { slotIndex: "asc" } } },
  });

  const map = new Map(stored.map((f) => [f.id, f]));
  const merged = FORMATIONS.map((f) => {
    const fromDb = map.get(f.id);
    return {
      id: f.id,
      name: f.name,
      category: f.category,
      slots: fromDb
        ? fromDb.slots.map((s) => ({ slotIndex: s.slotIndex, position: s.position, label: s.label }))
        : f.slots.map((s, i) => ({ slotIndex: i, position: s.position, label: s.label })),
    };
  });

  return NextResponse.json({ formations: merged });
}
