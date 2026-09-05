import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSimulatedCurrentDate } from "@/lib/calendar/simulatedClock";
import { respondToNegotiationEmail } from "@/lib/transfers/negotiationEmail";

type Body = {
  emailId: string;
  response: "ACCEPT" | "DENY" | "COUNTER";
  counterOferta?: { dinero: number; jugadoresOfrecidos: string[] };
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!prisma) return NextResponse.json({ error: "no-db" }, { status: 503 });

    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body?.emailId || !body?.response) {
      return NextResponse.json({ error: "bad-request" }, { status: 400 });
    }

    const email = await prisma.negotiationEmail.findUnique({
      where: { id: body.emailId },
      select: { id: true, receiverUserId: true, state: true },
    });
    if (!email) {
      return NextResponse.json({ error: "email-not-found" }, { status: 404 });
    }
    if (email.receiverUserId !== userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const sim = await getSimulatedCurrentDate({ userId, prismaClient: prisma });
    const simulatedNow = sim.ok ? sim.currentDate : new Date();

    const result = await respondToNegotiationEmail({
      emailId: body.emailId,
      response: body.response,
      counterOferta: body.counterOferta,
      simulatedNow,
      prismaClient: prisma,
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, reason: result.reason }, { status: 400 });
    }
    return NextResponse.json({ success: true, nextStatus: result.nextStatus });
  } catch (error) {
    console.error("[loans/email/respond] error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
