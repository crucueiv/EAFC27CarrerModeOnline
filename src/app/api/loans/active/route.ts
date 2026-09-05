import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ACTIVE_LOAN_STATUS = [
  "PROPOSED",
  "COUNTERED",
  "ACCEPTED",
  "AGREED_CLUB",
  "WAITING_PLAYER_CONTRACT",
  "COMPLETED",
  "BUY_OPTION_TRIGGERED",
] as const;

const ACTIVE_NEGOTIATION_STATUS = [
  "PENDING_AGREEMENT",
  "AGREED_PENDING_WINDOW",
  "AGREED_ACTIVE",
  "AGREED_CLUB",
] as const;

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ loans: [], hasActiveForPlayer: false });
  if (!prisma) return NextResponse.json({ loans: [], hasActiveForPlayer: false });

  const url = new URL(request.url);
  const role = url.searchParams.get("role") ?? "buyer";
  const playerId = url.searchParams.get("playerId");

  const baseWhere =
    role === "seller"
      ? { sellerId: userId, status: { in: [...ACTIVE_LOAN_STATUS] } }
      : { buyerId: userId, status: { in: [...ACTIVE_LOAN_STATUS] } };

  const where = playerId ? { ...baseWhere, playerId } : baseWhere;

  const [loans, negotiation] = await Promise.all([
    prisma.loan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        player: { select: { id: true, name: true, overall: true, position: true, marketValue: true } },
        sellerTeam: { select: { id: true, name: true } },
        buyerTeam: { select: { id: true, name: true } },
      },
    }),
    playerId
      ? prisma.negotiation.findFirst({
          where: {
            playerId,
            buyerId: userId,
            type: { not: "PERMANENT" },
            status: { in: [...ACTIVE_NEGOTIATION_STATUS] },
          },
          select: { id: true, status: true },
        })
      : Promise.resolve(null),
  ]);

  const hasActiveForPlayer = playerId ? loans.length > 0 || Boolean(negotiation) : false;
  const playerLoan = loans[0] ?? null;

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
    hasActiveForPlayer,
    playerLoanId: playerLoan?.id ?? null,
    playerLoanStatus: playerLoan?.status ?? null,
    negotiationId: negotiation?.id ?? null,
  });
}
