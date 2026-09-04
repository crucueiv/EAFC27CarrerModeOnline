import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getDefaultLineup,
  getEffectiveLineup,
  upsertLineup,
  validateLineupPayload,
} from "@/lib/lineups/lineup-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.clubTeamId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");

  if (matchId) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { homeTeamId: true, awayTeamId: true },
    });
    if (!match) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    }
    if (match.homeTeamId !== session.user.clubTeamId && match.awayTeamId !== session.user.clubTeamId) {
      return NextResponse.json({ error: "No autorizado para este partido" }, { status: 403 });
    }
    const result = await getEffectiveLineup(session.user.clubTeamId, matchId);
    return NextResponse.json(result);
  }

  const lineup = await getDefaultLineup(session.user.clubTeamId);
  return NextResponse.json({ lineup, source: lineup ? "default" : null });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.clubTeamId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const validation = validateLineupPayload(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const data = validation.data;
  if (data.teamId !== session.user.clubTeamId) {
    return NextResponse.json({ error: "No autorizado para ese equipo" }, { status: 403 });
  }

  if (data.matchId) {
    const match = await prisma.match.findUnique({
      where: { id: data.matchId },
      select: { homeTeamId: true, awayTeamId: true, status: true },
    });
    if (!match) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    }
    if (match.homeTeamId !== session.user.clubTeamId && match.awayTeamId !== session.user.clubTeamId) {
      return NextResponse.json({ error: "No autorizado para este partido" }, { status: 403 });
    }
    if (match.status !== "PENDING" && match.status !== "WAITING_PVP") {
      return NextResponse.json({ error: "El partido ya no admite cambios de alineación" }, { status: 400 });
    }
  }

  const allPlayerIds = new Set([...data.slots.map((s) => s.playerId), ...data.bench.map((b) => b.playerId)]);
  const roster = await prisma.roster.findMany({
    where: { teamId: data.teamId, isActive: true, playerId: { in: Array.from(allPlayerIds) } },
    select: { playerId: true },
  });
  const rosterIds = new Set(roster.map((r) => r.playerId));
  for (const id of allPlayerIds) {
    if (!rosterIds.has(id)) {
      return NextResponse.json({ error: `El jugador ${id} no está en la plantilla` }, { status: 400 });
    }
  }

  try {
    const lineup = await upsertLineup(data);
    return NextResponse.json({ lineup });
  } catch (e: unknown) {
    console.error("upsertLineup failed", e);
    const err = e as { message?: string };
    if (err?.message?.includes("formación seleccionada no existe")) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    return NextResponse.json({ error: "Error al guardar la alineación" }, { status: 500 });
  }
}
