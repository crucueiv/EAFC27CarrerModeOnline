import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;
  if (!prisma) {
    return NextResponse.json({ error: "Prisma no disponible" }, { status: 500 });
  }

  const transfers = await prisma.transfer.findMany({
    where: {
      status: { in: ["PROPOSED", "ACCEPTED", "CONTRACT_NEGOTIATION_PENDING", "CONTRACT_NEGOTIATION_ACTIVE"] },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      player: { select: { id: true, name: true, overall: true } },
      buyerTeam: { select: { id: true, name: true } },
      sellerTeam: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ transfers });
}
