import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;
  if (!prisma) return NextResponse.json({ error: "Prisma no disponible" }, { status: 500 });

  const activeSeason = await prisma.season.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, isTransferWindowOpen: true },
  });

  if (!activeSeason) {
    return NextResponse.json({ season: null, windows: [] });
  }

  const windows = await prisma.transferWindow.findMany({
    where: { seasonId: activeSeason.id },
    orderBy: { opensAt: "asc" },
  });

  return NextResponse.json({
    season: {
      id: activeSeason.id,
      name: activeSeason.name,
      isTransferWindowOpen: activeSeason.isTransferWindowOpen,
    },
    windows: windows.map((w) => ({
      id: w.id,
      kind: w.kind,
      status: w.status,
      opensAt: w.opensAt.toISOString(),
      closesAt: w.closesAt.toISOString(),
      openedAt: w.openedAt?.toISOString() ?? null,
      closedAt: w.closedAt?.toISOString() ?? null,
    })),
  });
}

export async function PATCH(req: Request) {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;
  if (!prisma) return NextResponse.json({ error: "Prisma no disponible" }, { status: 500 });

  try {
    const body = await req.json();
    const { windowId, status, seasonId, isTransferWindowOpen } = body as {
      windowId?: string;
      status?: "SCHEDULED" | "OPEN" | "CLOSED";
      seasonId?: string;
      isTransferWindowOpen?: boolean;
    };

    if (windowId && status) {
      const now = new Date();
      const data: Record<string, unknown> = { status };
      if (status === "OPEN") data.openedAt = now;
      if (status === "CLOSED") data.closedAt = now;
      await prisma.transferWindow.update({ where: { id: windowId }, data });
      return NextResponse.json({ ok: true, kind: "window" });
    }

    if (seasonId && typeof isTransferWindowOpen === "boolean") {
      await prisma.season.update({ where: { id: seasonId }, data: { isTransferWindowOpen } });
      return NextResponse.json({ ok: true, kind: "season" });
    }

    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  } catch (error) {
    console.error("admin/windows error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
