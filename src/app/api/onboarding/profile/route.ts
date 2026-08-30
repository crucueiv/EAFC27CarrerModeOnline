import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { username, avatarUrl } = await req.json();

    if (!username || username.trim().length < 3) {
      return NextResponse.json({ error: "Nombre de usuario muy corto" }, { status: 400 });
    }
    if (username.length > 20) {
      return NextResponse.json({ error: "Nombre de usuario muy largo" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return NextResponse.json({ error: "Caracteres no permitidos" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { username: username.trim() },
    });
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: "Nombre de usuario ya en uso" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        username: username.trim(),
        avatarUrl: avatarUrl || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}