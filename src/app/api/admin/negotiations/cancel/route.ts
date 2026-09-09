import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { releaseBudget } from "@/lib/transfers/budgetCommitment";

type Body = {
  negotiationId?: string;
  reason?: string;
};

export async function POST(request: Request) {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;
  if (!prisma) {
    return NextResponse.json({ error: "Prisma no disponible" }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const { negotiationId } = body;
  if (!negotiationId) {
    return NextResponse.json({ error: "negotiationId requerido" }, { status: 400 });
  }

  const negotiation = await prisma.negotiation.findUnique({
    where: { id: negotiationId },
    include: {
      loan: { select: { id: true, fee: true, metadata: true } },
      transfer: { select: { id: true, fee: true } },
    },
  });
  if (!negotiation) {
    return NextResponse.json({ error: "Negociación no encontrada" }, { status: 404 });
  }

  if (
    negotiation.status === "COMPLETED" ||
    negotiation.status === "CANCELLED" ||
    negotiation.status === "REJECTED"
  ) {
    return NextResponse.json(
      { error: `La negociación ya está en estado ${negotiation.status}` },
      { status: 400 },
    );
  }

  const agreedPrice = Math.max(0, Math.round(negotiation.agreedPrice ?? 0));
  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      if (agreedPrice > 0) {
        await releaseBudget(tx, negotiation.buyerTeamId, agreedPrice);
      }
      await tx.negotiation.update({
        where: { id: negotiationId },
        data: { status: "CANCELLED", decidedAt: now },
      });
      if (negotiation.loan) {
        await tx.loan.update({
          where: { id: negotiation.loan.id },
          data: { status: "CANCELLED", completedAt: now },
        });
      }
      if (negotiation.transfer) {
        await tx.transfer.update({
          where: { id: negotiation.transfer.id },
          data: { status: "CANCELLED", completedAt: now },
        });
      }
    });
    return NextResponse.json({ success: true, negotiationId, status: "CANCELLED" });
  } catch (e) {
    console.error("[admin/negotiations/cancel] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error interno" },
      { status: 500 },
    );
  }
}
