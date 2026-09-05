import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReleaseClauseEmail } from "@/lib/emails/templates";
import { getOrCreateActiveSeason } from "@/lib/seasons";
import { assertNotOwnPlayer } from "@/lib/transfers/ownership";

type TransferStatus =
  | "PROPOSED"
  | "ACCEPTED"
  | "AGREED_CLUB"
  | "WAITING_PLAYER_CONTRACT"
  | "CONTRACT_NEGOTIATION_PENDING"
  | "CONTRACT_NEGOTIATION_ACTIVE"
  | "CONTRACT_NEGOTIATION_ACCEPTED"
  | "CONTRACT_NEGOTIATION_REJECTED";

const ACTIVE_TRANSFER_STATUS: TransferStatus[] = [
  "PROPOSED",
  "ACCEPTED",
  "AGREED_CLUB",
  "WAITING_PLAYER_CONTRACT",
  "CONTRACT_NEGOTIATION_PENDING",
  "CONTRACT_NEGOTIATION_ACTIVE",
  "CONTRACT_NEGOTIATION_ACCEPTED",
  "CONTRACT_NEGOTIATION_REJECTED",
];

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

    const committedTransferFee = await prisma.transfer.aggregate({
      where: {
        buyerTeamId: userTeam.id,
        status: { in: ACTIVE_TRANSFER_STATUS },
        fee: { gt: 0 }
      },
      _sum: { fee: true }
    }).then((result) => Number(result._sum?.fee ?? 0));

    const committedBudget = Math.max(0, userTeam.budget - committedTransferFee);

    if (releaseClause > committedBudget && !userTeam.name.toLowerCase().includes("demo")) {
      console.warn(`[buyout] insufficient committed budget: ${committedBudget} < ${releaseClause}`);
      return NextResponse.json(
        {
          success: false,
          reason: "INSUFFICIENT_FUNDS",
          budget: userTeam.budget,
          committedBudget,
          message: `Presupuesto comprometido insuficiente (${committedBudget} € < ${releaseClause} €)`
        },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const ownership = await assertNotOwnPlayer({ playerId, userId });
    if (!ownership.ok) {
      return NextResponse.json(
        {
          success: false,
          reason: "PLAYER_ALREADY_OWNED",
          message:
            "No puedes pagar la cláusula de un jugador que ya pertenece a tu club.",
          ownership: ownership.ownership,
        },
        { status: 409 },
      );
    }

    // Obtener o crear la season ACTIVE del CareerGroup del usuario.
    // Esto desbloquea el flujo de traspasos para usuarios nuevos que aún
    // no hayan iniciado una temporada manualmente.
    const activeSeason = await getOrCreateActiveSeason(userId, userTeam.leagueId);
    console.log(`[buyout] activeSeason=${activeSeason.id} (auto-created if was missing)`);

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

    const duplicatePendingTransfer = await prisma.transfer.findFirst({
      where: {
        playerId,
        buyerTeamId: userTeam.id,
        status: { in: ACTIVE_TRANSFER_STATUS }
      },
      select: { id: true, status: true }
    });

    if (duplicatePendingTransfer) {
      return NextResponse.json({
        success: false,
        reason: "TRANSFER_ALREADY_NEGOTIATING",
        message: "Ya existe una negociación activa para este jugador con tu club."
      }, { status: 409 });
    }

    await prisma.transfer.create({
      data: {
        seasonId: activeSeason.id,
        playerId,
        buyerTeamId: userTeam.id,
        sellerTeamId: currentRoster?.teamId ?? userTeam.id,
        fee: isFreeAgentTransfer ? 0 : releaseClause,
        status: "WAITING_PLAYER_CONTRACT",
        completedAt: null
      }
    });
    console.log(`[buyout] transfer record created with status WAITING_PLAYER_CONTRACT`);

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
              playerId,
              playerName: player.name,
              playerOverall: player.overall,
              releaseClause,
              buyingClubName: userTeam.name,
              buyingManagerName: managerName,
              agentName: agent.name,
              agentAgency: agent.agency,
              sellerTeamName: sellerTeam?.name ?? null,
              isFreeAgentTransfer,
              actionUrl: `/transfers?playerId=${playerId}#contract`,
            }
          }
        });
        console.log(`[buyout] email created successfully: id=${email.id}, from=${agent.email}, subject="${subject}"`);
      } catch (emailErr) {
        console.error("[buyout] failed to create email (continuing buyout):", emailErr);
      }
    } else {
      console.warn(`[buyout] skipping email: userId=${userId}, player=${player?.id}`);
    }

    return NextResponse.json({
      success: true,
      requiresContractNegotiation: true,
      remainingBudget: userTeam.budget,
      committedBudget,
      teamName: userTeam.name,
      message: isFreeAgentTransfer
        ? "Se ha abierto la negociación salarial del agente libre sin contactar con ningún club."
        : "Cláusula abonada. Se ha enviado una notificación a tu sección de correos para iniciar la negociación de contrato."
    });
  } catch (error) {
    console.error("[buyout] error processing buyout:", error);
    return NextResponse.json({ error: "Error interno al procesar el pago de la cláusula" }, { status: 500 });
  }
}
