import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateClubNegotiationEmail } from "@/lib/emails/templates";
import { getOrCreateActiveSeason } from "@/lib/seasons";
import { getSimulatedCurrentDate } from "@/lib/calendar/simulatedClock";
import { processNegotiation } from "@/lib/transfers/processNegotiation";
import {
  pureBuildSummerWindow,
  pureBuildWinterWindow,
  type TransferWindowSnapshot,
} from "@/lib/calendar/transferWindowResolver";
import { assertNotOwnPlayer } from "@/lib/transfers/ownership";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      playerId?: string;
      sellerTeamId?: string;
      agreedPrice?: number;
    };

    const { playerId, sellerTeamId, agreedPrice } = body;
    if (!playerId || !sellerTeamId || agreedPrice === undefined) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: playerId, sellerTeamId, agreedPrice" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(agreedPrice) || agreedPrice < 0) {
      return NextResponse.json(
        { error: "agreedPrice debe ser un número >= 0" },
        { status: 400 },
      );
    }

    const session = await auth();
    const userId = session?.user?.id;

    if (!prisma) {
      return NextResponse.json({
        success: true,
        message: "Transferencia completada (Modo demo)",
      });
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
            "No puedes traspasar a un jugador que ya pertenece a tu club.",
          ownership: ownership.ownership,
        },
        { status: 409 },
      );
    }

    const userTeam = await prisma.team.findFirst({
      where: { managerId: userId },
      select: { id: true, name: true, budget: true, leagueId: true },
    });
    if (!userTeam) {
      return NextResponse.json({ error: "No se encontró tu equipo" }, { status: 404 });
    }

    const sellerTeam = await prisma.team.findUnique({
      where: { id: sellerTeamId },
      select: { id: true, name: true },
    });
    if (!sellerTeam) {
      return NextResponse.json({ error: "Equipo vendedor no encontrado" }, { status: 404 });
    }
    if (sellerTeam.id === userTeam.id) {
      return NextResponse.json({ error: "No puedes fichar a tu propio jugador" }, { status: 400 });
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, name: true, overall: true, position: true },
    });
    if (!player) {
      return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
    }

    const season = await getOrCreateActiveSeason(userId, userTeam.leagueId);
    const sim = await getSimulatedCurrentDate({ userId, prismaClient: prisma });
    const simulatedNow = sim.ok ? sim.currentDate : new Date();

    const month = simulatedNow.getUTCMonth() + 1;
    const day = simulatedNow.getUTCDate();
    let fallbackWindow: TransferWindowSnapshot;
    if (month < 7 || (month === 7 && day < 1)) {
      fallbackWindow = {
        id: `synthetic-summer-${simulatedNow.getUTCFullYear()}`,
        kind: "SUMMER",
        ...pureBuildSummerWindow(simulatedNow.getUTCFullYear()),
        seasonId: season.id,
      };
    } else if (month > 1 || (month === 1 && day > 31)) {
      fallbackWindow = {
        id: `synthetic-summer-${simulatedNow.getUTCFullYear() + 1}`,
        kind: "SUMMER",
        ...pureBuildSummerWindow(simulatedNow.getUTCFullYear() + 1),
        seasonId: season.id,
      };
    } else {
      fallbackWindow = {
        id: `synthetic-winter-${simulatedNow.getUTCFullYear() + 1}`,
        kind: "WINTER",
        ...pureBuildWinterWindow(simulatedNow.getUTCFullYear() + 1),
        seasonId: season.id,
      };
    }

    const negotiation = await prisma.negotiation.create({
      data: {
        playerId,
        buyerTeamId: userTeam.id,
        sellerTeamId: sellerTeam.id,
        buyerId: userId,
        seasonId: season.id,
        type: "PERMANENT",
        status: "PENDING_AGREEMENT",
        agreedPrice,
        offeredWage: 0,
        sellerSalaryPercent: 0,
        buyerSalaryPercent: 100,
        effectiveDate: fallbackWindow.opensAt,
        windowOpensAt: fallbackWindow.opensAt,
        decidedAt: simulatedNow,
      },
    });

    const result = await processNegotiation({
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

    if (result.status === "AGREED_PENDING_WINDOW") {
      try {
        const managerName = session?.user?.username || session?.user?.name || "Manager";
        const { subject, body: emailBody, agent } = generateClubNegotiationEmail({
          managerName,
          clubName: sellerTeam.name,
          playerName: player.name,
          playerOverall: player.overall,
          buyingClubName: userTeam.name,
          buyingManagerName: managerName,
          years: 4,
          salary: 50000,
          signingBonus: 1000000,
        });
        await prisma.emailMessage.create({
          data: {
            userId,
            from: agent.email,
            subject,
            body: emailBody,
            metadata: {
              type: "CLUB_NEGOTIATION_PENDING_WINDOW",
              playerId,
              playerName: player.name,
              playerOverall: player.overall,
              buyingClubName: userTeam.name,
              buyingManagerName: managerName,
              sellerTeamName: sellerTeam.name,
              negotiationId: result.negotiationId,
              transferId: result.transferId,
              effectiveDate: result.effectiveDate.toISOString(),
              actionUrl: `/transfers?playerId=${playerId}#contract`,
            },
          },
        });
      } catch (emailErr) {
        console.error("[transfer-complete] failed to create email:", emailErr);
      }

      return NextResponse.json({
        success: true,
        requiresContractNegotiation: false,
        deferred: true,
        effectiveDate: result.effectiveDate.toISOString(),
        negotiationId: result.negotiationId,
        transferId: result.transferId,
        message: `Acuerdo de traspaso firmado. El cobro se ha ejecutado y la transferencia del jugador se hará efectiva el ${result.effectiveDate.toISOString().slice(0, 10)} al abrirse la próxima ventana.`,
      });
    }

    if (result.status === "CANCELLED_LOSER") {
      return NextResponse.json(
        {
          success: false,
          reason: "LOST_CONFLICT",
          message: "Otro club cerró una oferta mejor por el mismo jugador.",
        },
        { status: 409 },
      );
    }

    if (result.status === "AGREED_CLUB" || result.status === "WAITING_PLAYER_CONTRACT") {
      try {
        const managerName = session?.user?.username || session?.user?.name || "Manager";
        const { subject, body: emailBody, agent } = generateClubNegotiationEmail({
          managerName,
          clubName: sellerTeam.name,
          playerName: player.name,
          playerOverall: player.overall,
          buyingClubName: userTeam.name,
          buyingManagerName: managerName,
          years: 4,
          salary: 50000,
          signingBonus: 1000000,
        });
        await prisma.emailMessage.create({
          data: {
            userId,
            from: agent.email,
            subject,
            body: emailBody,
            metadata: {
              type: "CLUB_NEGOTIATION_AGREED",
              playerId,
              playerName: player.name,
              playerOverall: player.overall,
              buyingClubName: userTeam.name,
              buyingManagerName: managerName,
              sellerTeamName: sellerTeam.name,
              negotiationId: result.negotiationId,
              transferId: result.transferId,
              actionUrl: `/transfers?playerId=${playerId}#contract`,
            },
          },
        });
      } catch (emailErr) {
        console.error("[transfer-complete] failed to create email:", emailErr);
      }

      return NextResponse.json({
        success: true,
        requiresContractNegotiation: true,
        remainingBudget: result.budgetAfter.buyerBudget,
        negotiationId: result.negotiationId,
        transferId: result.transferId,
        message:
          "Acuerdo de traspaso alcanzado. Se ha enviado una notificación a tu sección de correos para iniciar la negociación de contrato con el jugador.",
      });
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      message: `Estado: ${result.status}`,
    });
  } catch (error) {
    console.error("[transfer-complete] error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
