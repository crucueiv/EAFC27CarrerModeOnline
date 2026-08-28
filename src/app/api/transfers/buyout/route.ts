import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      playerId?: string;
      userTeamId?: string;
      releaseClause?: number;
    };

    const { playerId, releaseClause = 0 } = body;
    if (!playerId) {
      return NextResponse.json({ error: "Falta el ID del jugador" }, { status: 400 });
    }

    if (!prisma) {
      // Demo fallback response
      return NextResponse.json({
        success: true,
        immediate: true,
        remainingBudget: Math.max(0, 50_000_000 - releaseClause),
        message: "Cláusula pagada correctamente (Modo demo)"
      });
    }

    let userTeamId = body.userTeamId;
    let userTeam = null;

    if (userTeamId) {
      userTeam = await prisma.team.findUnique({ where: { id: userTeamId } });
    }

    if (!userTeam) {
      // Pick first team or default team managed by active user
      userTeam = await prisma.team.findFirst({
        orderBy: { name: "asc" }
      });
    }

    if (!userTeam) {
      return NextResponse.json({ error: "No se encontró el equipo del usuario" }, { status: 404 });
    }

    if (userTeam.budget < releaseClause) {
      return NextResponse.json(
        {
          success: false,
          reason: "INSUFFICIENT_FUNDS",
          budget: userTeam.budget,
          message: `Presupuesto insuficiente (${userTeam.budget} € < ${releaseClause} €)`
        },
        { status: 400 }
      );
    }

    const activeSeason = await prisma.season.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { startDate: "desc" }
    });

    const isWindowOpen = activeSeason ? activeSeason.isTransferWindowOpen : true;

    // Deduct budget
    const updatedTeam = await prisma.team.update({
      where: { id: userTeam.id },
      data: { budget: { decrement: releaseClause } }
    });

    // Create transfer record pending contract agreement
    if (activeSeason) {
      const currentRoster = await prisma.roster.findFirst({
        where: { playerId },
        select: { teamId: true }
      });

      await prisma.transfer.create({
        data: {
          seasonId: activeSeason.id,
          playerId,
          buyerTeamId: userTeam.id,
          sellerTeamId: currentRoster?.teamId ?? userTeam.id,
          fee: releaseClause,
          status: "ACCEPTED",
          completedAt: null
        }
      });
    }

    return NextResponse.json({
      success: true,
      requiresContractNegotiation: true,
      remainingBudget: updatedTeam.budget,
      teamName: userTeam.name,
      message: "Cláusula abonada. Se ha enviado una notificación a tu sección de correos para iniciar la negociación de contrato."
    });
  } catch (error) {
    console.error("Error processing buyout:", error);
    return NextResponse.json({ error: "Error interno al procesar el pago de la cláusula" }, { status: 500 });
  }
}
