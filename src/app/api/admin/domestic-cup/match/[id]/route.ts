import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyCpuVsCpuResult } from "@/lib/matches/match-modes";

export const dynamic = "force-dynamic";

async function ensureAdminOfCareerGroup(userId: string, careerGroupId: string): Promise<boolean> {
  if (!prisma) return false;
  const member = await prisma.careerGroupMember.findUnique({
    where: { userId_careerGroupId: { userId, careerGroupId } },
  });
  return member?.role === "ADMIN";
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: { tournament: { select: { careerGroupId: true, domesticCupId: true } } },
  });
  if (!match) {
    return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }
  if (!match.tournament?.domesticCupId) {
    return NextResponse.json({ error: "No es un partido de copa" }, { status: 400 });
  }

  const isAdmin = await ensureAdminOfCareerGroup(
    session.user.id,
    match.tournament.careerGroupId ?? "",
  );
  if (!isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = (await req.json()) as {
    homeScore: number;
    awayScore: number;
    wentToExtraTime?: boolean;
    wentToPenalties?: boolean;
  };

  if (typeof body.homeScore !== "number" || typeof body.awayScore !== "number") {
    return NextResponse.json({ error: "homeScore y awayScore requeridos" }, { status: 400 });
  }

  await applyCpuVsCpuResult({
    matchId: match.id,
    homeScore: body.homeScore,
    awayScore: body.awayScore,
    wentToExtraTime: body.wentToExtraTime,
    wentToPenalties: body.wentToPenalties,
  });

  return NextResponse.json({ ok: true });
}
