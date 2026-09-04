import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;
  if (!prisma) return NextResponse.json({ error: "Prisma no disponible" }, { status: 500 });

  const states = await prisma.teamCalendarState.findMany({
    orderBy: [{ careerGroupId: "asc" }, { currentDate: "asc" }],
    include: {
      team: { select: { id: true, name: true, shortName: true } },
      season: { select: { id: true, name: true, status: true, startDate: true, endDate: true } },
    },
    take: 500,
  });

  return NextResponse.json({
    states: states.map((s) => ({
      id: s.id,
      teamId: s.teamId,
      teamName: s.team.name,
      seasonId: s.seasonId,
      seasonName: s.season.name,
      seasonStatus: s.season.status,
      careerGroupId: s.careerGroupId,
      currentDate: s.currentDate.toISOString(),
      maxAllowedDate: s.maxAllowedDate.toISOString(),
      isLocked: s.isLocked,
      lockReason: s.lockReason,
      version: s.version,
      lastAdvanceAt: s.lastAdvanceAt.toISOString(),
    })),
  });
}
