import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;
  if (!prisma) {
    return NextResponse.json({ error: "Prisma no disponible" }, { status: 500 });
  }

  const loans = await prisma.loan.findMany({
    where: {
      status: {
        in: [
          "PROPOSED",
          "COUNTERED",
          "ACCEPTED",
          "AGREED_CLUB",
          "WAITING_PLAYER_CONTRACT",
          "COMPLETED",
          "BUY_OPTION_TRIGGERED",
          "RETURNED",
        ],
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      player: { select: { id: true, name: true, overall: true, position: true } },
      buyerTeam: { select: { id: true, name: true, budget: true, committedBudget: true } },
      sellerTeam: { select: { id: true, name: true, budget: true, committedBudget: true } },
    },
  });

  return NextResponse.json({ loans });
}
