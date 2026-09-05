import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSimulatedCurrentDate } from "@/lib/calendar/simulatedClock";
import {
  recordManagerRejectionCooldown,
} from "@/lib/transfers/processNegotiation";
import { clampTension } from "@/lib/transfers/negotiationRules";

type Body = {
  negotiationId: string;
  outcome: "HANGUP_LOWBALL" | "HANGUP_TENSION" | "TENSION_UPDATE";
  tensionDelta?: number;
};

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!prisma) return NextResponse.json({ error: "no-db" }, { status: 503 });

    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body?.negotiationId || !body?.outcome) {
      return NextResponse.json({ error: "bad-request" }, { status: 400 });
    }

    const negotiation = await prisma.negotiation.findUnique({
      where: { id: body.negotiationId },
      select: {
        id: true,
        buyerId: true,
        buyerTeamId: true,
        sellerTeamId: true,
        playerId: true,
        canal: true,
      },
    });
    if (!negotiation) {
      return NextResponse.json({ error: "Negociación no encontrada" }, { status: 404 });
    }
    if (negotiation.canal !== "AI_CALL") {
      return NextResponse.json({ error: "wrong-canal" }, { status: 400 });
    }
    if (negotiation.buyerId && negotiation.buyerId !== userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const sim = await getSimulatedCurrentDate({ userId, prismaClient: prisma });
    const simulatedNow = sim.ok ? sim.currentDate : new Date();

    if (body.outcome === "HANGUP_LOWBALL" || body.outcome === "HANGUP_TENSION") {
      await prisma.negotiation.update({
        where: { id: negotiation.id },
        data: { status: "REJECTED", decidedAt: simulatedNow, tension: 100 },
      });
      await recordManagerRejectionCooldown({
        prisma,
        negotiationId: negotiation.id,
        simulatedNow,
      });
      return NextResponse.json({ success: true, status: "REJECTED" });
    }

    if (body.outcome === "TENSION_UPDATE") {
      const updated = await prisma.negotiation.update({
        where: { id: negotiation.id },
        data: { tension: { increment: clampTension(body.tensionDelta ?? 0) } },
        select: { tension: true },
      });
      return NextResponse.json({ success: true, tension: updated.tension });
    }

    return NextResponse.json({ error: "unknown-outcome" }, { status: 400 });
  } catch (error) {
    console.error("[transfers/offer] error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
