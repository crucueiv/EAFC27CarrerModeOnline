import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { advanceUserToDate } from "@/lib/calendar/advanceService";

export async function POST(req: Request) {
  const { session, response: authError } = await requireAdmin();
  if (authError) return authError;
  if (!prisma) return NextResponse.json({ error: "Prisma no disponible" }, { status: 500 });

  try {
    const { teamId, targetDate } = await req.json();
    if (!teamId || !targetDate) {
      return NextResponse.json({ error: "teamId y targetDate requeridos" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, managerId: true, league: { select: { careerGroupId: true } } },
    });
    if (!team) return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
    if (!team.managerId) return NextResponse.json({ error: "Equipo sin manager" }, { status: 400 });
    if (!team.league?.careerGroupId) return NextResponse.json({ error: "Equipo sin careerGroup" }, { status: 400 });

    const result = await advanceUserToDate(prisma, {
      userId: team.managerId,
      careerGroupId: team.league.careerGroupId,
      targetDate: new Date(targetDate),
    });

    return NextResponse.json({ ...result, by: session?.user?.email ?? "admin" });
  } catch (error) {
    console.error("admin/calendar/advance error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
