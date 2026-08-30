import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateClubNegotiationEmail } from "@/lib/emails/templates";

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
        { status: 400 }
      );
    }

    const session = await auth();
    const userId = session?.user?.id;
    console.log(`[transfer-complete] start, playerId=${playerId}, sellerTeamId=${sellerTeamId}, agreedPrice=${agreedPrice}, userId=${userId}`);

    if (!prisma) {
      console.warn("[transfer-complete] prisma not available, returning demo response");
      return NextResponse.json({
        success: true,
        message: "Transferencia completada (Modo demo)"
      });
    }

    const userTeam = await prisma.team.findFirst({ where: { managerId: userId! } });
    if (!userTeam) {
      console.error("[transfer-complete] no user team found");
      return NextResponse.json({ error: "No se encontró tu equipo" }, { status: 404 });
    }
    console.log(`[transfer-complete] userTeam=${userTeam.name} (${userTeam.id}), budget=${userTeam.budget}`);

    if (userTeam.budget < agreedPrice) {
      console.warn(`[transfer-complete] insufficient funds: ${userTeam.budget} < ${agreedPrice}`);
      return NextResponse.json(
        { success: false, reason: "INSUFFICIENT_FUNDS", budget: userTeam.budget },
        { status: 400 }
      );
    }

    const sellerTeam = await prisma.team.findUnique({ where: { id: sellerTeamId }, select: { id: true, name: true } });
    if (!sellerTeam) {
      return NextResponse.json({ error: "Equipo vendedor no encontrado" }, { status: 404 });
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, name: true, overall: true }
    });
    if (!player) {
      return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
    }

    const activeSeason = await prisma.season.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { startDate: "desc" }
    });

    await prisma.$transaction(async (tx) => {
      await tx.team.update({
        where: { id: userTeam.id },
        data: { budget: { decrement: agreedPrice } }
      });

      await tx.team.update({
        where: { id: sellerTeamId },
        data: { budget: { increment: agreedPrice } }
      });

      const currentRoster = await tx.roster.findFirst({
        where: { playerId, isActive: true, teamId: sellerTeamId }
      });
      if (currentRoster) {
        await tx.roster.update({
          where: { id: currentRoster.id },
          data: { teamId: userTeam.id }
        });
      }

      if (activeSeason) {
        await tx.transfer.create({
          data: {
            seasonId: activeSeason.id,
            playerId,
            buyerTeamId: userTeam.id,
            sellerTeamId,
            fee: agreedPrice,
            status: "ACCEPTED",
            completedAt: new Date()
          }
        });
      }
    });

    console.log(`[transfer-complete] transfer completed: ${player.name} -> ${userTeam.name} for ${agreedPrice}`);

    if (userId) {
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
          signingBonus: 1000000
        });

        const email = await prisma.emailMessage.create({
          data: {
            userId,
            from: agent.email,
            subject,
            body: emailBody,
            metadata: {
              type: "CLUB_NEGOTIATION",
              playerName: player.name,
              playerOverall: player.overall,
              buyingClubName: userTeam.name,
              buyingManagerName: managerName,
              sellerTeamName: sellerTeam.name
            }
          }
        });
        console.log(`[transfer-complete] email created: id=${email.id}, from=${agent.email}`);
      } catch (emailErr) {
        console.error("[transfer-complete] failed to create email:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      remainingBudget: userTeam.budget - agreedPrice,
      message: "Traspaso completado. Se ha enviado una notificación a tu sección de correos."
    });
  } catch (error) {
    console.error("[transfer-complete] error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
