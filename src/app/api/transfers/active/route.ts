import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ACTIVE_TRANSFER_STATUS = [
  "PROPOSED",
  "ACCEPTED",
  "AGREED_CLUB",
  "WAITING_PLAYER_CONTRACT",
  "CONTRACT_NEGOTIATION_PENDING",
  "CONTRACT_NEGOTIATION_ACTIVE",
  "CONTRACT_NEGOTIATION_ACCEPTED",
  "CONTRACT_NEGOTIATION_REJECTED",
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
  if (!userId) {
    return NextResponse.json({ active: false });
  }
  if (!prisma) {
    return NextResponse.json({ active: false });
  }

  const url = new URL(request.url);
  const playerId = url.searchParams.get("playerId");
  if (!playerId) {
    return NextResponse.json({ active: false });
  }

  const userTeam = await prisma.team.findFirst({
    where: { managerId: userId },
    select: { id: true },
  });
  if (!userTeam) {
    return NextResponse.json({ active: false });
  }

  const [existing, negotiation] = await Promise.all([
    prisma.transfer.findFirst({
      where: {
        playerId,
        buyerTeamId: userTeam.id,
        status: { in: [...ACTIVE_TRANSFER_STATUS] },
      },
      select: { id: true, status: true, negotiationId: true },
    }),
    prisma.negotiation.findFirst({
      where: {
        playerId,
        buyerTeamId: userTeam.id,
        status: { in: [...ACTIVE_NEGOTIATION_STATUS] },
      },
      select: { id: true, status: true },
    }),
  ]);

  const isActive = Boolean(existing) || Boolean(negotiation);
  const status = existing?.status ?? negotiation?.status ?? null;

  return NextResponse.json({
    active: isActive,
    status,
    transferId: existing?.id ?? null,
    negotiationId: existing?.negotiationId ?? negotiation?.id ?? null,
  });
}
