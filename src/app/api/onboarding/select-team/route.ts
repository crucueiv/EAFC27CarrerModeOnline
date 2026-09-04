import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ensureCareerGroupSeason2627 } from "@/lib/calendar/initializeCareerGroupSeason";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { teamId } = await req.json();
    if (!teamId) {
      return NextResponse.json({ error: "teamId requerido" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { managerProfile: true },
    });

    if (!team) {
      return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const init = await ensureCareerGroupSeason2627(prisma, { teamId });

    const result = await prisma.$transaction(async (tx) => {
      if (team.managerProfile) {
        await tx.manager.update({
          where: { id: team.managerProfile.id },
          data: { teamId: null },
        });
      }

      await tx.manager.upsert({
        where: { teamId },
        update: {
          name: user.username || user.email || "Manager",
          apiSportsId: null,
          avatarUrl: user.avatarUrl || null,
        },
        create: {
          teamId,
          name: user.username || user.email || "Manager",
          apiSportsId: null,
          avatarUrl: user.avatarUrl || null,
        },
      });

      await tx.team.update({
        where: { id: teamId },
        data: { managerId: user.id },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { clubTeamId: teamId },
      });

      await tx.careerGroupMember.upsert({
        where: { userId_careerGroupId: { userId: user.id, careerGroupId: init.careerGroupId } },
        create: { userId: user.id, careerGroupId: init.careerGroupId, role: "PLAYER" },
        update: {},
      });

      return { success: true, teamId, clubTeamId: teamId, teamName: team.name };
    });

    return NextResponse.json({ ...result, seasonId: init.seasonId, careerGroupId: init.careerGroupId });
  } catch (error) {
    console.error("Error selecting team:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
