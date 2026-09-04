import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;
  if (!prisma) {
    return NextResponse.json({ error: "Prisma no disponible" }, { status: 500 });
  }

  const [activeSeason, allSeasons, teamCount, careerGroupCount, activeTransferCount, unreadEmailCount, leagues] = await Promise.all([
    prisma.season.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { startDate: "desc" },
      include: { careerGroup: true, league: true },
    }),
    prisma.season.findMany({
      orderBy: { startDate: "desc" },
      take: 20,
      include: { careerGroup: true, league: true },
    }),
    prisma.team.count(),
    prisma.careerGroup.count(),
    prisma.transfer.count({
      where: {
        status: { in: ["PROPOSED", "ACCEPTED", "CONTRACT_NEGOTIATION_PENDING", "CONTRACT_NEGOTIATION_ACTIVE"] },
      },
    }),
    prisma.emailMessage.count({ where: { read: false } }),
    prisma.league.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return NextResponse.json({
    activeSeason,
    allSeasons,
    teamCount,
    careerGroupCount,
    activeTransferCount,
    unreadEmailCount,
    leagues,
  });
}
