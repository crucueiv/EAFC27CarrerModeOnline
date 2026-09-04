import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processSeasonTransition } from "@/lib/calendar/seasonTransitionService";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!prisma) {
    return NextResponse.json({ error: "DB no disponible" }, { status: 503 });
  }
  const season = await prisma.season.findUnique({ where: { id: params.id } });
  if (!season) {
    return NextResponse.json({ error: "Temporada no encontrada" }, { status: 404 });
  }
  const member = await prisma.careerGroupMember.findUnique({
    where: { userId_careerGroupId: { userId: session.user.id, careerGroupId: season.careerGroupId } },
  });
  if (member?.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const result = await processSeasonTransition(prisma, { careerGroupId: season.careerGroupId });
  return NextResponse.json(result);
}
