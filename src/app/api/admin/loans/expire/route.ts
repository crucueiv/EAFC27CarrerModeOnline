import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activateLoan, expireLoan } from "@/lib/transfers/loanActivation";

export async function POST() {
  if (!prisma) return NextResponse.json({ error: "no-db" }, { status: 503 });

  const now = new Date();

  const toActivate = await prisma.loan.findMany({
    where: { status: "ACCEPTED", startsAt: { lte: now } },
    select: { id: true },
  });
  let activated = 0;
  for (const l of toActivate) {
    const r = await activateLoan(l.id);
    if (r.ok) activated++;
  }

  const toExpire = await prisma.loan.findMany({
    where: { status: "COMPLETED", endsAt: { lte: now }, hasBuyOption: false },
    select: { id: true },
  });
  let expired = 0;
  for (const l of toExpire) {
    const r = await expireLoan(l.id);
    if (r.ok) expired++;
  }

  const toPrompt = await prisma.loan.findMany({
    where: { status: "COMPLETED", endsAt: { lte: now }, hasBuyOption: true },
    select: { id: true },
  });

  return NextResponse.json({
    activated,
    expired,
    buyOptionPending: toPrompt.length,
  });
}
