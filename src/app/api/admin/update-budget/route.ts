import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function POST(request: Request) {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;
  if (!prisma) {
    return NextResponse.json({ error: "Prisma no disponible" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    teamId?: string;
    budget?: number;
  };
  const { teamId, budget } = body;
  if (!teamId || typeof budget !== "number" || !Number.isFinite(budget) || budget < 0) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
  }

  await prisma.team.update({
    where: { id: teamId },
    data: { budget: Math.floor(budget) },
  });

  return NextResponse.json({ success: true, teamId, budget: Math.floor(budget) });
}
