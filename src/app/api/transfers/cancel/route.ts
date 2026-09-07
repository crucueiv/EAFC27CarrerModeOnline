import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSimulatedCurrentDate } from "@/lib/calendar/simulatedClock";
import { releaseBudget } from "@/lib/transfers/budgetCommitment";
import { recordPlayerContractRejectionCooldown } from "@/lib/transfers/processNegotiation";

type Body = {
  negotiationId?: string;
  reason?: "BUYER_REJECTED" | "PLAYER_REJECTED" | "EXPIRED" | "ADMIN";
};

/**
 * Cancela una negociación o transferencia en estado intermedio
 * (WAITING_PLAYER_CONTRACT) y devuelve el dinero comprometido al
 * presupuesto líquido del comprador.
 *
 * Casos soportados:
 *  - El comprador decide no seguir con la oferta / cláusula pagada.
 *  - El jugador rechaza la oferta de contrato.
 *  - La oferta expira.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!prisma) {
      return NextResponse.json({ error: "no-db" }, { status: 503 });
    }

    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body?.negotiationId) {
      return NextResponse.json(
        { error: "negotiationId requerido" },
        { status: 400 },
      );
    }

    const sim = await getSimulatedCurrentDate({ userId, prismaClient: prisma });
    const simulatedNow = sim.ok ? sim.currentDate : new Date();

    const negotiation = await prisma.negotiation.findUnique({
      where: { id: body.negotiationId },
      include: { transfer: true, loan: true },
    });
    if (!negotiation) {
      return NextResponse.json(
        { error: "Negociación no encontrada" },
        { status: 404 },
      );
    }

    if (
      negotiation.status !== "AGREED_CLUB" &&
      negotiation.status !== "AGREED_PENDING_WINDOW" &&
      negotiation.status !== "AGREED_ACTIVE"
    ) {
      return NextResponse.json(
        {
          error: "INVALID_STATUS",
          message: `La negociación ya está en estado ${negotiation.status}`,
        },
        { status: 400 },
      );
    }

    if (negotiation.buyerId && negotiation.buyerId !== userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Calculamos el dinero a devolver al comprador:
    //  - Para traspasos permanentes: el fee acordado o el de la Transfer.
    //  - Para préstamos: el totalWageCost + buyOptionPrice (guardados en
    //    metadata).
    const transfer = negotiation.transfer;
    const loan = negotiation.loan;
    let amountToRelease = 0;
    if (transfer && transfer.fee > 0 && transfer.status !== "COMPLETED") {
      amountToRelease = Math.max(amountToRelease, transfer.fee);
    }
    if (loan) {
      const meta = (loan.metadata as Record<string, unknown> | null) ?? {};
      const totalWage = typeof meta.totalWageCost === "number" ? meta.totalWageCost : 0;
      amountToRelease = Math.max(
        amountToRelease,
        Math.max(0, Math.round(totalWage)),
      );
    }
    if (!transfer && !loan && negotiation.agreedPrice > 0) {
      amountToRelease = Math.max(amountToRelease, negotiation.agreedPrice);
    }

    if (amountToRelease > 0) {
      try {
        await releaseBudget(prisma, negotiation.buyerTeamId, amountToRelease);
      } catch (e) {
        console.error("[transfers/cancel] releaseBudget failed:", e);
      }
    }

    // Cancelar el transfer / loan asociado si existe y no está completado
    if (transfer && transfer.status !== "COMPLETED") {
      await prisma.transfer.update({
        where: { id: transfer.id },
        data: { status: "CANCELLED", completedAt: simulatedNow },
      });
    }
    if (loan && loan.status !== "COMPLETED" && loan.status !== "RETURNED") {
      await prisma.loan.update({
        where: { id: loan.id },
        data: { status: "CANCELLED", completedAt: simulatedNow },
      });
    }

    await prisma.negotiation.update({
      where: { id: negotiation.id },
      data: { status: "CANCELLED", decidedAt: simulatedNow },
    });

    if (body.reason === "PLAYER_REJECTED") {
      try {
        await recordPlayerContractRejectionCooldown({
          prisma,
          negotiationId: negotiation.id,
          simulatedNow,
        });
      } catch (e) {
        console.error("[transfers/cancel] cooldown failed:", e);
      }
    }

    return NextResponse.json({
      success: true,
      status: "CANCELLED",
      negotiationId: negotiation.id,
      refundedAmount: amountToRelease,
    });
  } catch (error) {
    console.error("[transfers/cancel] error:", error);
    return NextResponse.json(
      { error: "Error interno al cancelar la transferencia" },
      { status: 500 },
    );
  }
}
