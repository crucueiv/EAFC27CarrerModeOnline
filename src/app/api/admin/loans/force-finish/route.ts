import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { withSerializableTransaction } from "@/lib/calendar/calendarDb";
import { activateLoanInTransaction } from "@/lib/transfers/loanActivationService";
import { releaseBudget } from "@/lib/transfers/budgetCommitment";

type Body = {
  loanId?: string;
  action?: "ACTIVATE" | "CANCEL" | "RETURN";
};

export async function POST(request: Request) {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;
  if (!prisma) {
    return NextResponse.json({ error: "Prisma no disponible" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const { loanId, action } = body;
  if (!loanId || !action || !["ACTIVATE", "CANCEL", "RETURN"].includes(action)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      player: { select: { id: true, name: true } },
      buyerTeam: { select: { id: true, name: true, budget: true, committedBudget: true } },
      sellerTeam: { select: { id: true, name: true, budget: true, committedBudget: true } },
    },
  });
  if (!loan) {
    return NextResponse.json({ error: "Cesión no encontrada" }, { status: 404 });
  }

  const simulatedNow = new Date();

  try {
    if (action === "ACTIVATE") {
      // Activa el préstamo. Solo funciona si está en un estado que permita
      // activación (PROPOSED, COUNTERED, ACCEPTED, AGREED_CLUB o
      // WAITING_PLAYER_CONTRACT). activateLoanInTransaction valida el
      // estado internamente y devuelve { ok: false, reason } si no.
      const result = await withSerializableTransaction(
        prisma,
        async (tx) => {
          return activateLoanInTransaction(tx, {
            loanId,
            simulatedNow,
          });
        },
      );
      if (!result.ok) {
        return NextResponse.json(
          { error: `No se pudo activar la cesión: ${result.reason}` },
          { status: 400 },
        );
      }
      return NextResponse.json({ success: true, loanId, status: "COMPLETED" });
    }

    if (action === "CANCEL") {
      // Cancela la cesión y libera el presupuesto comprometido si lo hay.
      await prisma.$transaction(async (tx) => {
        const meta = (loan.metadata as Record<string, unknown> | null) ?? {};
        const reserved =
          typeof meta.totalWageCost === "number" && Number.isFinite(meta.totalWageCost)
            ? Math.max(0, Math.round(meta.totalWageCost))
            : Math.max(0, Math.round(loan.fee));
        if (
          reserved > 0 &&
          (loan.status === "AGREED_CLUB" ||
            loan.status === "WAITING_PLAYER_CONTRACT" ||
            loan.status === "ACCEPTED" ||
            loan.status === "COUNTERED" ||
            loan.status === "PROPOSED")
        ) {
          await releaseBudget(tx, loan.buyerTeamId, reserved);
        }
        await tx.loan.update({
          where: { id: loanId },
          data: { status: "CANCELLED", completedAt: simulatedNow },
        });
        if (loan.negotiationId) {
          await tx.negotiation.update({
            where: { id: loan.negotiationId },
            data: { status: "CANCELLED", decidedAt: simulatedNow },
          });
        }
      });
      return NextResponse.json({ success: true, loanId, status: "CANCELLED" });
    }

    if (action === "RETURN") {
      // Devuelve al jugador al vendedor. Mueve el roster, libera el
      // committedBudget y desmarca el flag de préstamo.
      const result = await prisma.$transaction(async (tx) => {
        const activeRoster = await tx.roster.findFirst({
          where: { playerId: loan.playerId, isActive: true },
          select: { id: true },
        });
        if (activeRoster) {
          await tx.roster.update({
            where: { id: activeRoster.id },
            data: { teamId: loan.sellerTeamId, isLoaned: false },
          });
        } else {
          await tx.roster.create({
            data: {
              teamId: loan.sellerTeamId,
              playerId: loan.playerId,
              seasonId: loan.seasonId,
              isActive: true,
              isLoaned: false,
              role: "ROTACION",
            },
          });
        }
        await tx.player.update({
          where: { id: loan.playerId },
          data: { isLoaned: false, loanedToTeamId: null },
        });
        const meta = (loan.metadata as Record<string, unknown> | null) ?? {};
        const reserved =
          typeof meta.totalWageCost === "number" && Number.isFinite(meta.totalWageCost)
            ? Math.max(0, Math.round(meta.totalWageCost))
            : 0;
        if (reserved > 0) {
          await releaseBudget(tx, loan.buyerTeamId, reserved);
        }
        await tx.loan.update({
          where: { id: loanId },
          data: { status: "RETURNED", completedAt: simulatedNow },
        });
        if (loan.negotiationId) {
          await tx.negotiation.update({
            where: { id: loan.negotiationId },
            data: { status: "COMPLETED", decidedAt: simulatedNow, effectiveDate: simulatedNow },
          });
        }
        return { ok: true };
      });
      if (!result.ok) {
        return NextResponse.json({ error: "No se pudo devolver al jugador" }, { status: 400 });
      }
      return NextResponse.json({ success: true, loanId, status: "RETURNED" });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (e) {
    console.error("[admin/loans/force-finish] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error interno" },
      { status: 500 },
    );
  }
}
