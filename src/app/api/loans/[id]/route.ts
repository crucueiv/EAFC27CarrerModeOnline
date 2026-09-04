import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "no-db" }, { status: 503 });

  const { id } = await params;
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      player: { select: { id: true, name: true, overall: true, position: true, marketValue: true } },
      sellerTeam: { select: { id: true, name: true } },
      buyerTeam: { select: { id: true, name: true } },
      season: { select: { id: true, name: true } },
    },
  });
  if (!loan) return NextResponse.json({ error: "not-found" }, { status: 404 });
  if (loan.buyerId !== userId && loan.sellerId !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json(loan);
}
