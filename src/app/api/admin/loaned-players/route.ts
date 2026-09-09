import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;
  if (!prisma) {
    return NextResponse.json({ error: "Prisma no disponible" }, { status: 500 });
  }

  const players = await prisma.player.findMany({
    where: { isLoaned: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      loanedToTeam: { select: { id: true, name: true, imageUrl: true, shortName: true } },
      loans: {
        where: {
          status: { in: ["AGREED_CLUB", "WAITING_PLAYER_CONTRACT", "COMPLETED", "BUY_OPTION_TRIGGERED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sellerTeam: { select: { id: true, name: true, shortName: true, imageUrl: true } },
          season: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({
    players: players.map((p) => {
      const loan = p.loans[0] ?? null;
      return {
        id: p.id,
        name: p.name,
        overall: p.overall,
        position: p.position,
        loanedToTeam: p.loanedToTeam,
        loan: loan
          ? {
              id: loan.id,
              status: loan.status,
              startsAt: loan.startsAt,
              endsAt: loan.endsAt,
              duration: loan.duration,
              wageShareBuyerPct: loan.wageShareBuyerPct,
              hasBuyOption: loan.hasBuyOption,
              buyOptionPrice: loan.buyOptionPrice,
              sellerTeam: loan.sellerTeam,
              season: loan.season,
            }
          : null,
      };
    }),
  });
}
