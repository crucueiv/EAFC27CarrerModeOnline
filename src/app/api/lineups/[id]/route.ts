import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteLineup } from "@/lib/lineups/lineup-service";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id || !session.user.clubTeamId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const lineup = await prisma.lineup.findUnique({
    where: { id: params.id },
    select: { teamId: true, matchId: true, isDefault: true },
  });
  if (!lineup) {
    return NextResponse.json({ error: "Alineación no encontrada" }, { status: 404 });
  }
  if (lineup.teamId !== session.user.clubTeamId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (lineup.matchId) {
    return NextResponse.json({ error: "Las alineaciones de partido no se pueden borrar" }, { status: 400 });
  }
  if (lineup.isDefault) {
    return NextResponse.json({ error: "No puedes borrar la alineación titular" }, { status: 400 });
  }

  await deleteLineup(params.id);
  return NextResponse.json({ ok: true });
}
