import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  finalizePlayerContract,
  finalizeLoanPlayerContract,
} from "@/lib/transfers/processNegotiation";
import { getSimulatedCurrentDate } from "@/lib/calendar/simulatedClock";
import { assertNotOwnPlayer } from "@/lib/transfers/ownership";

type Body = {
  negotiationId?: string;
  contractYears?: number;
  weeklyWage?: number;
  signingBonus?: number;
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    if (!prisma) return NextResponse.json({ error: "no-db" }, { status: 503 });

    const body = (await request.json().catch(() => null)) as Body | null;
    if (!body?.negotiationId) {
      return NextResponse.json({ error: "negotiationId requerido" }, { status: 400 });
    }

    const negotiation = await prisma.negotiation.findUnique({
      where: { id: body.negotiationId },
      include: { player: { select: { id: true, name: true } } },
    });
    if (!negotiation) {
      return NextResponse.json({ error: "Negociación no encontrada" }, { status: 404 });
    }
    if (negotiation.buyerId && negotiation.buyerId !== userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const ownership = await assertNotOwnPlayer({
      playerId: negotiation.playerId,
      userId,
    });
    if (!ownership.ok && negotiation.type === "PERMANENT") {
      return NextResponse.json(
        {
          error: "PLAYER_ALREADY_OWNED",
          message: "Este jugador ya pertenece a tu club.",
        },
        { status: 409 },
      );
    }

    const sim = await getSimulatedCurrentDate({ userId, prismaClient: prisma });
    const simulatedNow = sim.ok ? sim.currentDate : new Date();

    const result =
      negotiation.type === "PERMANENT"
        ? await finalizePlayerContract({
            negotiationId: negotiation.id,
            simulatedNow,
            prismaClient: prisma,
          })
        : await finalizeLoanPlayerContract({
            negotiationId: negotiation.id,
            simulatedNow,
            prismaClient: prisma,
          });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          reason: result.reason,
          message: result.message,
        },
        { status: 400 },
      );
    }

    const normalized = (() => {
      if (negotiation.type === "PERMANENT") {
        const r = result as Extract<typeof result, { ok: true; transferId: string | null }>;
        return { transferId: r.transferId, loanId: r.loanId };
      }
      const r = result as Extract<typeof result, { ok: true; loanId: string }>;
      return { transferId: null, loanId: r.loanId };
    })();

    if (userId && negotiation.player) {
      try {
        await prisma.emailMessage.create({
          data: {
            userId,
            from: "agente@fichajes.es",
            subject: `Contrato firmado: ${negotiation.player.name}`,
            body:
              `Has cerrado el contrato con ${negotiation.player.name}. ` +
              `El jugador pasa a formar parte de tu plantilla y se ha aplicado ` +
              `el cargo salarial correspondiente.`,
            metadata: {
              type: "CONTRACT_SIGNED",
              playerId: negotiation.playerId,
              playerName: negotiation.player.name,
              negotiationId: negotiation.id,
              transferId: normalized.transferId,
              loanId: normalized.loanId,
            },
          },
        });
      } catch (emailErr) {
        console.error("[sign-player-contract] email failed:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      negotiationId: result.negotiationId,
      transferId: normalized.transferId,
      loanId: normalized.loanId,
      effectiveDate: result.effectiveDate.toISOString(),
    });
  } catch (error) {
    console.error("[sign-player-contract] error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
