import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReleaseClauseEmail } from "@/lib/emails/templates";

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

    const session = await auth();
    const userId = session?.user?.id;
    console.log(`[buyout] start, playerId=${playerId}, releaseClause=${releaseClause}, userId=${userId}, username=${session?.user?.username}`);

    if (!prisma) {
      console.warn("[buyout] prisma not available, returning demo response");
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
      if (userId) {
        userTeam = await prisma.team.findFirst({ where: { managerId: userId } });
      }
      if (!userTeam) {
        userTeam = await prisma.team.findFirst({
          orderBy: { name: "asc" }
        });
      }
    }

    if (!userTeam) {
      console.error("[buyout] no user team found");
      return NextResponse.json({ error: "No se encontró el equipo del usuario" }, { status: 404 });
    }
    console.log(`[buyout] userTeam=${userTeam.name} (${userTeam.id}), budget=${userTeam.budget}`);

    if (userTeam.budget < releaseClause) {
      console.warn(`[buyout] insufficient funds: ${userTeam.budget} < ${releaseClause}`);
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
    console.log(`[buyout] activeSeason=${activeSeason?.id ?? "none"}, transferWindowOpen=${activeSeason?.isTransferWindowOpen}`);

    const updatedTeam = await prisma.team.update({
      where: { id: userTeam.id },
      data: { budget: { decrement: releaseClause } }
    });
    console.log(`[buyout] budget decremented, remaining=${updatedTeam.budget}`);

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, name: true, overall: true }
    });
    if (!player) {
      console.error(`[buyout] player not found: ${playerId}`);
      return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
    }
    console.log(`[buyout] player found: ${player.name} (OVR ${player.overall})`);

    const currentRoster = await prisma.roster.findFirst({
      where: { playerId, isActive: true },
      select: { teamId: true, team: { select: { eaId: true, name: true } } }
    });
    const sellerTeam = currentRoster
      ? await prisma.team.findUnique({ where: { id: currentRoster.teamId }, select: { id: true, name: true, eaId: true } })
      : null;
    const isFreeAgentTransfer = !sellerTeam || sellerTeam.eaId === "FREE_AGENTS";
    console.log(`[buyout] sellerTeam=${sellerTeam?.name ?? "none"} (eaId=${sellerTeam?.eaId ?? "none"}), isFreeAgentTransfer=${isFreeAgentTransfer}`);

    if (activeSeason) {
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
      console.log(`[buyout] transfer record created`);
    } else {
      console.warn(`[buyout] no active season, transfer record not created`);
    }

    if (userId && player) {
      try {
        const managerName = session?.user?.username || session?.user?.name || "Manager";
        const { subject, body: emailBody, agent } = generateReleaseClauseEmail({
          managerName,
          clubName: userTeam.name,
          playerName: player.name,
          playerOverall: player.overall,
          releaseClause,
          buyingClubName: userTeam.name,
          buyingManagerName: managerName,
          years: 4,
          salary: 50000,
          signingBonus: 1000000
        });

        const email = await prisma.emailMessage.create({
          data: {
            userId,
            from: agent.email,
            subject,
            body: emailBody,
            metadata: {
              type: "RELEASE_CLAUSE",
              playerName: player.name,
              playerOverall: player.overall,
              releaseClause,
              buyingClubName: userTeam.name,
              buyingManagerName: managerName,
              agentName: agent.name,
              agentAgency: agent.agency,
              sellerTeamName: sellerTeam?.name ?? null,
              isFreeAgentTransfer
            }
          }
        });
        console.log(`[buyout] ✅ email created successfully: id=${email.id}, from=${agent.email}, subject="${subject}"`);
      } catch (emailErr) {
        console.error("[buyout] ❌ failed to create email (continuing buyout):", emailErr);
      }
    } else {
      console.warn(`[buyout] ⚠️ skipping email: userId=${userId}, player=${player?.id}`);
    }

    return NextResponse.json({
      success: true,
      requiresContractNegotiation: true,
      remainingBudget: updatedTeam.budget,
      teamName: userTeam.name,
      message: "Cláusula abonada. Se ha enviado una notificación a tu sección de correos para iniciar la negociación de contrato."
    });
  } catch (error) {
    console.error("[buyout] ❌ error processing buyout:", error);
    return NextResponse.json({ error: "Error interno al procesar el pago de la cláusula" }, { status: 500 });
  }
}
