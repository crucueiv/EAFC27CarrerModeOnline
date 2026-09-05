import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureCalendarState } from "@/lib/calendar/advanceService";
import { getSingletonCareerGroupId } from "@/lib/careerGroup";

export const dynamic = "force-dynamic";

type Body = { teamId: string };

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!prisma) {
    return NextResponse.json({ error: "DB no disponible" }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as Body;
  if (!body.teamId) {
    return NextResponse.json({ error: "teamId requerido" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({
    where: { id: body.teamId },
    include: { league: { select: { id: true, careerGroupId: true } } },
  });
  if (!team) {
    return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
  }
  if (team.managerId) {
    return NextResponse.json({ error: "El equipo ya tiene manager" }, { status: 409 });
  }

  const singletonId = await getSingletonCareerGroupId();
  let careerGroupId = team.league?.careerGroupId;
  if (!careerGroupId) {
    careerGroupId = singletonId;
  }
  if (careerGroupId !== singletonId && team.league) {
    await prisma.league.update({
      where: { id: team.league.id },
      data: { careerGroupId: singletonId },
    });
    careerGroupId = singletonId;
  }

  const openWindow = await prisma.transferWindow.findFirst({
    where: {
      season: { careerGroupId, status: "ACTIVE" },
      status: "OPEN",
      opensOnboarding: true,
    },
    orderBy: { opensAt: "asc" },
    select: { id: true, opensAt: true, closesAt: true, kind: true },
  });
  if (!openWindow) {
    return NextResponse.json(
      { error: "No hay ventana de mercado abierta" },
      { status: 409 },
    );
  }

  const season = await prisma.season.findFirst({
    where: { careerGroupId, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
    select: { id: true, startDate: true },
  });
  if (!season) {
    return NextResponse.json({ error: "Sin temporada activa" }, { status: 409 });
  }

  await prisma.team.update({
    where: { id: team.id },
    data: { managerId: session.user.id },
  });

  await ensureCalendarState(prisma, {
    teamId: team.id,
    seasonId: season.id,
    careerGroupId,
    initialDate: season.startDate,
  });

  return NextResponse.json({ ok: true, teamId: team.id, transferWindow: openWindow });
}
