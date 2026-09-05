import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSimulatedCurrentDate } from "@/lib/calendar/simulatedClock";
import { deliverPendingEmailsForRecipient } from "@/lib/transfers/negotiationEmail";

export async function POST() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!prisma) return NextResponse.json({ error: "no-db" }, { status: 503 });

    const sim = await getSimulatedCurrentDate({ userId, prismaClient: prisma });
    const recipientCurrentDate = sim.ok ? sim.currentDate : new Date();

    const result = await deliverPendingEmailsForRecipient({
      receiverUserId: userId,
      recipientCurrentDate,
      prismaClient: prisma,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[loans/email/deliver] error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
