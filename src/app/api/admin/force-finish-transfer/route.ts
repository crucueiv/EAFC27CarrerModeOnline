import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function POST(request: Request) {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;
  if (!prisma) {
    return NextResponse.json({ error: "Prisma no disponible" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    transferId?: string;
    action?: "COMPLETE" | "CANCEL";
  };
  const { transferId, action } = body;
  if (!transferId || (action !== "COMPLETE" && action !== "CANCEL")) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
    include: { player: { select: { id: true, name: true } } },
  });
  if (!transfer) {
    return NextResponse.json({ error: "Transfer no encontrado" }, { status: 404 });
  }

  if (action === "CANCEL") {
    await prisma.transfer.update({
      where: { id: transferId },
      data: { status: "CANCELLED", completedAt: new Date() },
    });
    return NextResponse.json({ success: true, transferId, status: "CANCELLED" });
  }

  // COMPLETE: mover roster, ajustar presupuestos.
  await prisma.$transaction(async (tx) => {
    const committedFee = transfer.fee;
    const buyer = await tx.team.findUnique({ where: { id: transfer.buyerTeamId } });
    if (!buyer) throw new Error("Buyer no encontrado");
    if (buyer.budget < committedFee) {
      throw new Error("El comprador no tiene suficiente presupuesto");
    }

    await tx.team.update({
      where: { id: transfer.buyerTeamId },
      data: { budget: { decrement: committedFee } },
    });
    await tx.team.update({
      where: { id: transfer.sellerTeamId },
      data: { budget: { increment: committedFee } },
    });

    const currentRoster = await tx.roster.findFirst({
      where: { playerId: transfer.playerId, isActive: true, teamId: transfer.sellerTeamId },
    });
    if (currentRoster) {
      await tx.roster.update({
        where: { id: currentRoster.id },
        data: { teamId: transfer.buyerTeamId },
      });
    }

    await tx.transfer.update({
      where: { id: transferId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  });

  return NextResponse.json({ success: true, transferId, status: "COMPLETED" });
}
