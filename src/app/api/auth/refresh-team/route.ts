import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const requestedTeamId = typeof body?.clubTeamId === "string" ? body.clubTeamId : null;

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, clubTeamId: true, nationalTeamId: true, avatarUrl: true, username: true, image: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const verifiedTeamId = requestedTeamId && dbUser.clubTeamId === requestedTeamId
      ? requestedTeamId
      : dbUser.clubTeamId;

    return NextResponse.json({
      ok: true,
      clubTeamId: verifiedTeamId,
      nationalTeamId: dbUser.nationalTeamId,
      avatarUrl: dbUser.avatarUrl ?? dbUser.image ?? null,
      username: dbUser.username,
    });
  } catch (error) {
    console.error("refresh-team error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
