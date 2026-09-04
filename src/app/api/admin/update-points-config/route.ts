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
    pointsWin?: number;
    pointsDraw?: number;
    pointsLoss?: number;
  };

  const pointsWin = body.pointsWin;
  const pointsDraw = body.pointsDraw;
  const pointsLoss = body.pointsLoss;

  if (
    typeof pointsWin !== "number" || !Number.isFinite(pointsWin) ||
    typeof pointsDraw !== "number" || !Number.isFinite(pointsDraw) ||
    typeof pointsLoss !== "number" || !Number.isFinite(pointsLoss)
  ) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const activeSeason = await prisma.season.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });

  if (!activeSeason) {
    return NextResponse.json({ error: "No hay temporada activa" }, { status: 404 });
  }

  await prisma.season.update({
    where: { id: activeSeason.id },
    data: {
      pointsWin: Math.max(0, Math.floor(pointsWin)),
      pointsDraw: Math.max(0, Math.floor(pointsDraw)),
      pointsLoss: Math.max(0, Math.floor(pointsLoss)),
    },
  });

  return NextResponse.json({ success: true, seasonId: activeSeason.id });
}
