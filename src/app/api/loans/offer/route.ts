import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clampTension } from "@/lib/transfers/negotiationRules";
import { recordManagerRejectionCooldown } from "@/lib/transfers/processNegotiation";
import { getSimulatedCurrentDate } from "@/lib/calendar/simulatedClock";

type Body = {
  loanId: string;
  outcome: "HANGUP" | "REJECT" | "TENSION_UPDATE";
  tensionDelta?: number;
};

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!prisma) return NextResponse.json({ error: "no-db" }, { status: 503 });

    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body?.loanId || !body?.outcome) {
      return NextResponse.json({ error: "bad-request" }, { status: 400 });
    }

    const loan = await prisma.loan.findUnique({
      where: { id: body.loanId },
      include: { negotiation: { select: { id: true, tension: true } } },
    });
    if (!loan) {
      return NextResponse.json({ error: "loan-not-found" }, { status: 404 });
    }
    if (!loan.negotiation) {
      return NextResponse.json({ error: "no-negotiation" }, { status: 400 });
    }

    const sim = await getSimulatedCurrentDate({ userId, prismaClient: prisma });
    const simulatedNow = sim.ok ? sim.currentDate : new Date();

    if (body.outcome === "HANGUP" || body.outcome === "REJECT") {
      await prisma.negotiation.update({
        where: { id: loan.negotiation.id },
        data: { status: "REJECTED", decidedAt: simulatedNow, tension: 100 },
      });
      await recordManagerRejectionCooldown({
        prisma,
        negotiationId: loan.negotiation.id,
        simulatedNow,
      });
      return NextResponse.json({ success: true, status: "REJECTED" });
    }

    if (body.outcome === "TENSION_UPDATE") {
      const updated = await prisma.negotiation.update({
        where: { id: loan.negotiation.id },
        data: { tension: { increment: clampTension(body.tensionDelta ?? 0) } },
        select: { tension: true },
      });
      return NextResponse.json({ success: true, tension: updated.tension });
    }

    return NextResponse.json({ error: "unknown-outcome" }, { status: 400 });
  } catch (error) {
    console.error("[loans/offer] error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
