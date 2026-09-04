import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ACTIVE_LOAN_STATUS = [
  "PROPOSED",
  "COUNTERED",
  "ACCEPTED",
  "COMPLETED",
  "BUY_OPTION_TRIGGERED",
] as const;

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ loans: [] });
  if (!prisma) return NextResponse.json({ loans: [] });

  const url = new URL(request.url);
  const role = url.searchParams.get("role") ?? "buyer";

  const where =
    role === "seller"
      ? { sellerId: userId, status: { in: [...ACTIVE_LOAN_STATUS] } }
      : { buyerId: userId, status: { in: [...ACTIVE_LOAN_STATUS] } };

  const loans = await prisma.loan.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      player: { select: { id: true, name: true, overall: true, position: true, marketValue: true } },
      sellerTeam: { select: { id: true, name: true } },
      buyerTeam: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    loans: loans.map((l) => ({
      id: l.id,
      status: l.status,
      duration: l.duration,
      wageShareBuyerPct: l.wageShareBuyerPct,
      hasBuyOption: l.hasBuyOption,
      buyOptionPrice: l.buyOptionPrice,
      startsAt: l.startsAt,
      endsAt: l.endsAt,
      player: l.player,
      sellerTeam: l.sellerTeam,
      buyerTeam: l.buyerTeam,
      metadata: l.metadata,
    })),
  });
}
