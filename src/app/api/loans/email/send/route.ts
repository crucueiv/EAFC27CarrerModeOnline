import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSimulatedCurrentDate } from "@/lib/calendar/simulatedClock";
import { sendNegotiationEmail } from "@/lib/transfers/negotiationEmail";

type Body = {
  negotiationId: string;
  receiverUserId: string;
  oferta: { dinero: number; jugadoresOfrecidos: string[] };
  parentEmailId?: string;
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!prisma) return NextResponse.json({ error: "no-db" }, { status: 503 });

    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body?.negotiationId || !body?.receiverUserId || !body?.oferta) {
      return NextResponse.json({ error: "bad-request" }, { status: 400 });
    }

    const negotiation = await prisma.negotiation.findUnique({
      where: { id: body.negotiationId },
      select: { id: true, canal: true, buyerId: true, sellerId: true },
    });
    if (!negotiation) {
      return NextResponse.json({ error: "Negociación no encontrada" }, { status: 404 });
    }
    if (negotiation.canal !== "HUMAN_EMAIL") {
      return NextResponse.json({ error: "wrong-canal" }, { status: 400 });
    }
    if (
      negotiation.buyerId !== userId &&
      negotiation.sellerId !== userId
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const sim = await getSimulatedCurrentDate({ userId, prismaClient: prisma });
    const simulatedSentAt = sim.ok ? sim.currentDate : new Date();

    const result = await sendNegotiationEmail({
      negotiationId: body.negotiationId,
      senderUserId: userId,
      receiverUserId: body.receiverUserId,
      oferta: body.oferta,
      simulatedSentAt,
      parentEmailId: body.parentEmailId,
      prismaClient: prisma,
      kind: "LOAN",
    });

    return NextResponse.json({ success: true, ...result, expiresAt: result.expiresAt.toISOString() });
  } catch (error) {
    console.error("[loans/email/send] error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
