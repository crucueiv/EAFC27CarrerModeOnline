import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;
  if (!prisma) {
    return NextResponse.json({ error: "Prisma no disponible" }, { status: 500 });
  }

  const negotiations = await prisma.negotiation.findMany({
    where: {
      status: {
        in: [
          "PENDING_AGREEMENT",
          "AGREED_PENDING_WINDOW",
          "AGREED_ACTIVE",
          "AGREED_CLUB",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      player: { select: { id: true, name: true, overall: true, position: true } },
      buyerTeam: { select: { id: true, name: true } },
      sellerTeam: { select: { id: true, name: true } },
      season: { select: { id: true, name: true, isTransferWindowOpen: true } },
    },
  });

  return NextResponse.json({ negotiations });
}
