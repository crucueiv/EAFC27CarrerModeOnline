import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { closeSeason } from "@/lib/competitions/season-closure";

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

  const season = await prisma.season.findUnique({ where: { id: params.id } });
  if (!season) {
    return NextResponse.json({ error: "Temporada no encontrada" }, { status: 404 });
  }

  const isAdmin = await ensureAdminOfCareerGroup(session.user.id, season.careerGroupId);
  if (!isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const result = await closeSeason({
      seasonId: season.id,
      careerGroupId: season.careerGroupId,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("closeSeason failed", e);
    return NextResponse.json({ error: "Error al cerrar la temporada" }, { status: 500 });
  }
}
