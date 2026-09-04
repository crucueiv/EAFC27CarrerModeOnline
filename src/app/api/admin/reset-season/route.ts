import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getOrCreateActiveSeason } from "@/lib/seasons";

export async function POST() {
  const { session, response: authError } = await requireAdmin();
  if (authError) return authError;
  if (!prisma) {
    return NextResponse.json({ error: "Prisma no disponible" }, { status: 500 });
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  // 1. Cerrar la season ACTIVE actual (si existe).
  const currentActive = await prisma.season.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });

  if (currentActive) {
    await prisma.season.update({
      where: { id: currentActive.id },
      data: { status: "COMPLETED", endDate: new Date() },
    });
  }

  // 2. Crear una nueva season. Vinculada a la liga del admin si tiene club.
  const adminTeam = await prisma.team.findFirst({
    where: { managerId: session.user.id },
    select: { leagueId: true },
  });

  const previousCount = await prisma.season.count({
    where: { careerGroupId: currentActive?.careerGroupId },
  });
  const newName = `Temporada ${previousCount + 1}`;

  const newSeason = await getOrCreateActiveSeason(
    session.user.id,
    adminTeam?.leagueId ?? currentActive?.leagueId ?? null
  );

  // Renombrar la nueva season al número correcto.
  if (newSeason.name !== newName) {
    await prisma.season.update({
      where: { id: newSeason.id },
      data: { name: newName },
    });
  }

  return NextResponse.json({
    success: true,
    closedSeasonId: currentActive?.id ?? null,
    newSeasonId: newSeason.id,
    newSeasonName: newName,
  });
}
