import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { settleCommittedTransfer, releaseBudget } from "@/lib/transfers/budgetCommitment";

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
    const committed = ["AGREED_CLUB", "WAITING_PLAYER_CONTRACT", "CONTRACT_NEGOTIATION_PENDING", "CONTRACT_NEGOTIATION_ACTIVE"].includes(
      transfer.status,
    );
    await prisma.$transaction(async (tx) => {
      if (committed && transfer.fee > 0) {
        await releaseBudget(tx, transfer.buyerTeamId, transfer.fee);
      }
      await tx.transfer.update({
        where: { id: transferId },
        data: { status: "CANCELLED", completedAt: new Date() },
      });
    });
    return NextResponse.json({ success: true, transferId, status: "CANCELLED" });
  }

  // COMPLETE: mover roster, liquidar presupuesto. Si el transfer está en
  // un estado con dinero comprometido (AGREED_CLUB, WAITING_PLAYER_CONTRACT)
  // tenemos que liquidarlo (consumir committedBudget del comprador y
  // pagar al vendedor) en lugar de decrementar el budget líquido.
  const committed = ["AGREED_CLUB", "WAITING_PLAYER_CONTRACT", "CONTRACT_NEGOTIATION_PENDING", "CONTRACT_NEGOTIATION_ACTIVE"].includes(
    transfer.status,
  );
  const committedFee = Math.max(0, Math.round(transfer.fee));

  await prisma.$transaction(async (tx) => {
    if (committed) {
      await settleCommittedTransfer({
        tx,
        buyerTeamId: transfer.buyerTeamId,
        sellerTeamId: transfer.sellerTeamId,
        amount: committedFee,
      });
    } else {
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
    }

    // Mueve el roster activo al comprador. Si por alguna razón el jugador
    // no tiene un roster activo en el vendedor (p.ej. un estado
    // inconsistente tras un fallo anterior) lo creamos en el comprador.
    const currentRoster = await tx.roster.findFirst({
      where: { playerId: transfer.playerId, isActive: true },
    });
    if (currentRoster) {
      await tx.roster.update({
        where: { id: currentRoster.id },
        data: { teamId: transfer.buyerTeamId, isLoaned: false },
      });
    } else {
      await tx.roster.create({
        data: {
          teamId: transfer.buyerTeamId,
          playerId: transfer.playerId,
          seasonId: transfer.seasonId,
          isActive: true,
          isLoaned: false,
          role: "ROTACION",
        },
      });
    }

    await tx.player.update({
      where: { id: transfer.playerId },
      data: { isLoaned: false, loanedToTeamId: null },
    });

    await tx.transfer.update({
      where: { id: transferId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  });

  return NextResponse.json({ success: true, transferId, status: "COMPLETED" });
}
