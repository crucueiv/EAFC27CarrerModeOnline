import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  computeLoanNegotiationParams,
  evaluateLoanWageOffer,
  evaluateLoanDuration,
  evaluateBuyOptionDecision,
  evaluateBuyOptionPrice,
  getRandomLoanQuote,
  resolveSellerManagerName,
  type LoanDuration,
  type LoanNegotiationPhase,
  type LoanQuoteCategory,
} from "@/lib/transfers/loanNegotiationEngine";
import {
  calculateLoanFinancialBreakdown,
  calculateLoanWeeks,
  computeLoanEndDate,
} from "@/lib/transfers/loanEngine";
import {
  processNegotiation,
  recordManagerRejectionCooldown,
} from "@/lib/transfers/processNegotiation";
import { getSimulatedCurrentDate } from "@/lib/calendar/simulatedClock";
import { assertNotOwnPlayer } from "@/lib/transfers/ownership";
import { releaseBudget } from "@/lib/transfers/budgetCommitment";
import { calculatePlayerValueAndClause } from "@/lib/transfers/pricingEngine";

type Body = {
  loanId: string;
  action: "COUNTER" | "ACCEPT" | "REJECT" | "HANGUP";
  phase?: LoanNegotiationPhase;
  counterDuration?: LoanDuration;
  counterWageShareBuyerPct?: number;
  counterHasBuyOption?: boolean;
  counterBuyOptionPrice?: number | null;
};

type Metadata = {
  currentTension?: number;
  currentPhase?: LoanNegotiationPhase;
  managerCounterDuration?: LoanDuration | null;
  managerPrefersBuyOption?: boolean | null;
  proposedDuration?: LoanDuration;
  proposedWageShareBuyerPct?: number;
  proposedHasBuyOption?: boolean;
  proposedBuyOptionPrice?: number | null;
  acceptedDuration?: LoanDuration | null;
  acceptedWageShareBuyerPct?: number | null;
  acceptedHasBuyOption?: boolean | null;
  acceptedBuyOptionPrice?: number | null;
  totalWageCost?: number;
  weeklyWage?: number;
  buyerWeeklyWageCost?: number;
  ineligible?: boolean;
  ineligibilityReason?: string | null;
};

function clampTension(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function ageOfPlayer(
  birthdate: Date | null | null | undefined,
  fallback: number,
): number {
  if (!birthdate) return fallback;
  const now = new Date();
  let age = now.getUTCFullYear() - birthdate.getUTCFullYear();
  const m = now.getUTCMonth() - birthdate.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birthdate.getUTCDate())) age -= 1;
  return age > 0 ? age : fallback;
}

function transferTypeForDuration(
  duration: LoanDuration,
): "LOAN_SHORT_TERM" | "LOAN_1_YEAR" | "LOAN_2_YEARS" {
  if (duration === "SHORT_TERM") return "LOAN_SHORT_TERM";
  if (duration === "TWO_YEARS") return "LOAN_2_YEARS";
  return "LOAN_1_YEAR";
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "no-db" }, { status: 503 });

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || !body.loanId || !body.action) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const loan = await prisma.loan.findUnique({
    where: { id: body.loanId },
    include: {
      player: true,
      sellerTeam: {
        include: {
          manager: { select: { name: true, image: true } },
          managerProfile: { select: { name: true, avatarUrl: true } },
          league: { select: { id: true } },
        },
      },
      buyerTeam: true,
      negotiation: true,
      season: { select: { endDate: true } },
    },
  });
  if (!loan) return NextResponse.json({ error: "loan-not-found" }, { status: 404 });

  if (
    loan.status === "ACCEPTED" ||
    loan.status === "REJECTED" ||
    loan.status === "CANCELLED"
  ) {
    return NextResponse.json({ error: "loan-finalized" }, { status: 400 });
  }

  const sellerManagerName = resolveSellerManagerName(loan.sellerTeam);

  const meta = (loan.metadata as Metadata | null) ?? {};
  const isSeller = userId === loan.sellerId;
  const isBuyer = userId === loan.buyerId;
  if (!isSeller && !isBuyer) {
    return NextResponse.json({ error: "not-participant" }, { status: 403 });
  }

  const simEarly = await getSimulatedCurrentDate({ userId, prismaClient: prisma });
  const buyerSimulatedNow = simEarly.ok ? simEarly.currentDate : new Date();

  if (meta.ineligible === true) {
    const message = getRandomLoanQuote("notInterested", {
      player: loan.player.name,
      seller: loan.sellerTeam.name,
      manager: sellerManagerName ?? undefined,
    });
    if (loan.negotiation) {
      try {
        await prisma.negotiation.update({
          where: { id: loan.negotiation.id },
          data: { status: "REJECTED", decidedAt: buyerSimulatedNow, tension: 100 },
        });
        await recordManagerRejectionCooldown({
          prisma,
          negotiationId: loan.negotiation.id,
          simulatedNow: buyerSimulatedNow,
        });
      } catch (e) {
        console.error("[loans/respond] ineligible cooldown failed:", e);
      }
    }
    await prisma.loan.update({
      where: { id: loan.id },
      data: {
        status: "REJECTED",
        metadata: {
          ...meta,
          currentTension: 100,
        },
      },
    });
    return NextResponse.json({
      status: "REJECTED",
      tension: 100,
      message,
      proposed: {
        duration: loan.duration,
        wageShareBuyerPct: loan.wageShareBuyerPct,
        hasBuyOption: loan.hasBuyOption,
        buyOptionPrice: loan.buyOptionPrice,
        counterWageShareBuyerPct: null,
        counterBuyOptionPrice: null,
      },
    });
  }

  let nextStatus:
    | "PROPOSED"
    | "COUNTERED"
    | "ACCEPTED"
    | "REJECTED"
    | "COMPLETED"
    | "CANCELLED"
    | "EXPIRED"
    | "BUY_OPTION_TRIGGERED"
    | "RETURNED"
    | null = null;
  let nextTension = clampTension(meta.currentTension ?? 20);
  const nextMeta: Metadata = { ...meta };
  let messageCategory: LoanQuoteCategory = "greeting";

  let counterWageShareBuyerPct: number | null = null;
  let counterBuyOptionPrice: number | null = null;
  let lowballHangup = false;
  let autoAcceptedViaCounter = false;

  if (body.action === "REJECT") {
    nextStatus = "REJECTED";
    messageCategory = "maxTensionHangup";
    if (loan.negotiation) {
      try {
        await prisma.negotiation.update({
          where: { id: loan.negotiation.id },
          data: { status: "REJECTED", decidedAt: buyerSimulatedNow, tension: 100 },
        });
        await recordManagerRejectionCooldown({
          prisma,
          negotiationId: loan.negotiation.id,
          simulatedNow: buyerSimulatedNow,
        });
      } catch (e) {
        console.error("[loans/respond] REJECT cooldown failed:", e);
      }
    }
  } else if (body.action === "HANGUP") {
    nextStatus = "CANCELLED";
    messageCategory = "maxTensionHangup";
    nextTension = 100;
    if (loan.negotiation) {
      try {
        await prisma.negotiation.update({
          where: { id: loan.negotiation.id },
          data: { status: "REJECTED", decidedAt: buyerSimulatedNow, tension: 100 },
        });
        await recordManagerRejectionCooldown({
          prisma,
          negotiationId: loan.negotiation.id,
          simulatedNow: buyerSimulatedNow,
        });
      } catch (e) {
        console.error("[loans/respond] HANGUP cooldown failed:", e);
      }
    }
  } else if (body.action === "ACCEPT") {
    if (!loan.negotiation) {
      return NextResponse.json(
        { error: "missing-negotiation", reason: "Esta cesión no tiene una negociación asociada." },
        { status: 400 },
      );
    }
    const ownership = await assertNotOwnPlayer({
      playerId: loan.playerId,
      userId,
    });
    if (!ownership.ok) {
      return NextResponse.json(
        {
          error: "PLAYER_ALREADY_OWNED",
          reason: "No puedes aceptar una cesión por un jugador que ya pertenece a tu club.",
          ownership: ownership.ownership,
        },
        { status: 409 },
      );
    }

    const currentPhase: LoanNegotiationPhase = body.phase ?? meta.currentPhase ?? "DURATION";

    switch (currentPhase) {
      case "DURATION": {
        const acceptedDuration =
          meta.managerCounterDuration ??
          body.counterDuration ??
          nextMeta.proposedDuration ??
          meta.proposedDuration ??
          loan.duration;
        nextMeta.acceptedDuration = acceptedDuration;
        nextMeta.proposedDuration = acceptedDuration;
        nextMeta.currentPhase = "BUY_OPTION";
        nextMeta.managerCounterDuration = null;
        nextStatus = "COUNTERED";
        messageCategory = "durationAccepted";
        break;
      }
      case "BUY_OPTION": {
        const managerPref =
          typeof meta.managerPrefersBuyOption === "boolean"
            ? meta.managerPrefersBuyOption
            : typeof body.counterHasBuyOption === "boolean"
              ? body.counterHasBuyOption
              : (meta.proposedHasBuyOption ?? false);
        nextMeta.acceptedHasBuyOption = managerPref;
        nextMeta.proposedHasBuyOption = managerPref;
        nextMeta.currentPhase = "WAGE";
        nextMeta.managerPrefersBuyOption = null;
        nextStatus = "COUNTERED";
        messageCategory = managerPref ? "buyOptionYesAccepted" : "buyOptionNoAccepted";
        break;
      }
      case "WAGE": {
        const acceptedWage =
          typeof body.counterWageShareBuyerPct === "number"
            ? body.counterWageShareBuyerPct
            : typeof meta.proposedWageShareBuyerPct === "number"
              ? meta.proposedWageShareBuyerPct
              : 50;
        nextMeta.acceptedWageShareBuyerPct = acceptedWage;
        nextMeta.proposedWageShareBuyerPct = acceptedWage;

        const hasBuyOption =
          nextMeta.acceptedHasBuyOption ??
          meta.acceptedHasBuyOption ??
          meta.proposedHasBuyOption ??
          false;

        if (hasBuyOption) {
          nextMeta.currentPhase = "BUY_OPTION_PRICE";
          nextStatus = "COUNTERED";
          messageCategory = "wageAcceptedContinue";
        } else {
          autoAcceptedViaCounter = true;
          nextMeta.acceptedDuration =
            nextMeta.proposedDuration ?? meta.proposedDuration ?? loan.duration;
          nextMeta.acceptedHasBuyOption = false;
          nextMeta.acceptedBuyOptionPrice = null;
          nextTension = 0;
          messageCategory = "accepted";
        }
        break;
      }
      case "BUY_OPTION_PRICE": {
        const acceptedPrice =
          typeof body.counterBuyOptionPrice === "number"
            ? body.counterBuyOptionPrice
            : (meta.proposedBuyOptionPrice ?? 0);
        nextMeta.acceptedBuyOptionPrice = acceptedPrice;
        nextMeta.proposedBuyOptionPrice = acceptedPrice;

        autoAcceptedViaCounter = true;
        nextMeta.acceptedDuration =
          nextMeta.proposedDuration ?? meta.proposedDuration ?? loan.duration;
        nextMeta.acceptedWageShareBuyerPct =
          nextMeta.proposedWageShareBuyerPct ??
          meta.proposedWageShareBuyerPct ??
          loan.wageShareBuyerPct;
        nextMeta.acceptedHasBuyOption = true;
        nextTension = 0;
        messageCategory = "accepted";
        break;
      }
    }
  } else if (body.action === "COUNTER") {
    const currentPhase: LoanNegotiationPhase = body.phase ?? meta.currentPhase ?? "DURATION";
    const params = computeLoanNegotiationParams({
      playerOverall: loan.player.overall,
      playerPotential: loan.player.potential,
      playerAge: ageOfPlayer(loan.player.birthdate, 25),
      playerWeeklyWage: 0,
      playerMarketValue: loan.player.marketValue,
      sellerTeamBudget: loan.sellerTeam.budget,
      buyerTeamBudget: loan.buyerTeam.budget,
      isShortTerm:
        (nextMeta.proposedDuration ??
          meta.proposedDuration ??
          loan.duration) === "SHORT_TERM",
      hasBuyOption:
        nextMeta.proposedHasBuyOption ??
        meta.proposedHasBuyOption ??
        loan.hasBuyOption,
    });

    switch (currentPhase) {
      case "DURATION": {
        const proposed =
          body.counterDuration ??
          nextMeta.proposedDuration ??
          meta.proposedDuration ??
          loan.duration;
        nextMeta.proposedDuration = proposed;
        const result = evaluateLoanDuration(
          proposed,
          loan.player.overall,
          loan.squadRoleSnapshot,
        );

        if (result.accepted) {
          nextMeta.acceptedDuration = proposed;
          nextMeta.currentPhase = "BUY_OPTION";
          nextMeta.managerCounterDuration = null;
          nextTension = clampTension(nextTension + result.tensionDelta);
          nextStatus = "COUNTERED";
          messageCategory = "durationAccepted";
        } else {
          nextMeta.managerCounterDuration = result.counterDuration ?? "ONE_YEAR";
          nextTension = clampTension(nextTension + result.tensionDelta);
          nextStatus = "COUNTERED";
          messageCategory = "rejectionDuration";
        }
        break;
      }

      case "BUY_OPTION": {
        const proposed =
          typeof body.counterHasBuyOption === "boolean"
            ? body.counterHasBuyOption
            : (nextMeta.proposedHasBuyOption ?? meta.proposedHasBuyOption ?? false);
        nextMeta.proposedHasBuyOption = proposed;
        const result = evaluateBuyOptionDecision(
          proposed,
          loan.player.overall,
          loan.player.potential,
          ageOfPlayer(loan.player.birthdate, 25),
          loan.squadRoleSnapshot,
        );

        if (result.accepted) {
          nextMeta.acceptedHasBuyOption = proposed;
          nextMeta.currentPhase = "WAGE";
          nextMeta.managerPrefersBuyOption = null;
          nextTension = clampTension(nextTension + result.tensionDelta);
          nextStatus = "COUNTERED";
          messageCategory = proposed ? "buyOptionYesAccepted" : "buyOptionNoAccepted";
        } else {
          nextMeta.managerPrefersBuyOption = result.managerPreference;
          nextTension = clampTension(nextTension + result.tensionDelta);
          nextStatus = "COUNTERED";
          messageCategory = "buyOptionDecisionRejected";
        }
        break;
      }

      case "WAGE": {
        const proposedPct =
          typeof body.counterWageShareBuyerPct === "number"
            ? body.counterWageShareBuyerPct
            : (nextMeta.proposedWageShareBuyerPct ?? meta.proposedWageShareBuyerPct ?? 50);
        nextMeta.proposedWageShareBuyerPct = proposedPct;
        const evaluation = evaluateLoanWageOffer(proposedPct, params);

        if (evaluation.shouldHangUp) {
          lowballHangup = true;
          nextStatus = "CANCELLED";
          nextTension = 100;
          messageCategory = "lowballHangup";
        } else if (evaluation.autoAccept) {
          nextMeta.acceptedWageShareBuyerPct = proposedPct;
          const hasBuyOption =
            nextMeta.acceptedHasBuyOption ??
            meta.acceptedHasBuyOption ??
            nextMeta.proposedHasBuyOption ??
            meta.proposedHasBuyOption ??
            false;

          if (hasBuyOption) {
            nextMeta.currentPhase = "BUY_OPTION_PRICE";
            nextTension = clampTension(nextTension - 5);
            nextStatus = "COUNTERED";
            messageCategory = "wageAcceptedContinue";
          } else {
            autoAcceptedViaCounter = true;
            nextMeta.acceptedDuration =
              nextMeta.proposedDuration ?? meta.proposedDuration ?? loan.duration;
            nextMeta.acceptedHasBuyOption = false;
            nextMeta.acceptedBuyOptionPrice = null;
            nextTension = 0;
            messageCategory = "accepted";
            counterWageShareBuyerPct = null;
          }
        } else {
          counterWageShareBuyerPct = evaluation.counterWageShareBuyerPct;
          nextTension = clampTension(nextTension + evaluation.tensionDelta);
          nextStatus = "COUNTERED";
          messageCategory = nextTension >= 90 ? "highTensionWarning" : "counterOfferWage";
        }
        break;
      }

      case "BUY_OPTION_PRICE": {
        const proposedPrice =
          typeof body.counterBuyOptionPrice === "number"
            ? body.counterBuyOptionPrice
            : (nextMeta.proposedBuyOptionPrice ?? meta.proposedBuyOptionPrice ?? 0);
        nextMeta.proposedBuyOptionPrice = proposedPrice;
        const priceResult = evaluateBuyOptionPrice(proposedPrice, params);

        if (priceResult.isLowball) {
          lowballHangup = true;
          nextStatus = "CANCELLED";
          nextTension = 100;
          messageCategory = "lowballHangup";
        } else if (priceResult.accepted) {
          autoAcceptedViaCounter = true;
          nextMeta.acceptedDuration =
            nextMeta.proposedDuration ?? meta.proposedDuration ?? loan.duration;
          nextMeta.acceptedWageShareBuyerPct =
            nextMeta.proposedWageShareBuyerPct ??
            meta.proposedWageShareBuyerPct ??
            loan.wageShareBuyerPct;
          nextMeta.acceptedHasBuyOption = true;
          nextMeta.acceptedBuyOptionPrice = proposedPrice;
          nextTension = 0;
          messageCategory = "accepted";
        } else {
          counterBuyOptionPrice = priceResult.counterPrice ?? null;
          nextTension = clampTension(nextTension + priceResult.tensionDelta);
          nextStatus = "COUNTERED";
          messageCategory = nextTension >= 90 ? "highTensionWarning" : "counterOfferBuyOption";
        }
        break;
      }
    }

    if (nextTension >= 100 && !lowballHangup && !autoAcceptedViaCounter) {
      nextStatus = "CANCELLED";
      messageCategory = "maxTensionHangup";
    }

    if ((lowballHangup || nextStatus === "CANCELLED") && loan.negotiation) {
      try {
        await prisma.negotiation.update({
          where: { id: loan.negotiation.id },
          data: { status: "REJECTED", decidedAt: buyerSimulatedNow, tension: 100 },
        });
        await recordManagerRejectionCooldown({
          prisma,
          negotiationId: loan.negotiation.id,
          simulatedNow: buyerSimulatedNow,
        });
      } catch (e) {
        console.error("[loans/respond] counter hangup cooldown failed:", e);
      }
    }
  }

  if (nextTension >= 90 && body.action === "COUNTER" && !lowballHangup) {
    messageCategory = "highTensionWarning";
  }

  if (nextStatus) {
    await prisma.loan.update({
      where: { id: loan.id },
      data: {
        status: nextStatus,
        metadata: { ...nextMeta, currentTension: nextTension },
      },
    });
  } else {
    await prisma.loan.update({
      where: { id: loan.id },
      data: { metadata: { ...nextMeta, currentTension: nextTension } },
    });
  }

  // Devolución de presupuesto comprometido: si la negociación queda en
  // estado REJECTED / CANCELLED / EXPIRED y previamente el comprador tenía
  // dinero comprometido (totalWageCost + buyOptionPrice), se devuelve a
  // su presupuesto líquido y se reduce committedBudget.
  const finalStatus = nextStatus ?? loan.status;
  const isCancelling =
    finalStatus === "REJECTED" ||
    finalStatus === "CANCELLED" ||
    finalStatus === "EXPIRED";
  const hasCommittedLoanCost =
    loan.status === "AGREED_CLUB" ||
    loan.status === "WAITING_PLAYER_CONTRACT";
  if (isCancelling && hasCommittedLoanCost) {
    const reserved = meta.totalWageCost ?? 0;
    const totalToRelease = Math.max(0, Math.round(reserved));
    if (totalToRelease > 0) {
      try {
        await releaseBudget(prisma, loan.buyerTeamId, totalToRelease);
      } catch (e) {
        console.error("[loans/respond] releaseBudget failed:", e);
      }
    }
  }

  // Al aceptar la cesión consolidamos el acuerdo entre clubes. El flujo
  // activa el préstamo inmediatamente si la ventana está abierta; si no,
  // deja la activación programada para la apertura de la siguiente ventana.
  let processResult: Awaited<ReturnType<typeof processNegotiation>> | null = null;
  const isAccepting = body.action === "ACCEPT" || autoAcceptedViaCounter;
  if (isAccepting && loan.negotiation) {
    const simulatedNow = buyerSimulatedNow;
    const acceptedDuration =
      nextMeta.acceptedDuration ??
      nextMeta.proposedDuration ??
      meta.proposedDuration ??
      loan.duration;
    const acceptedWageShareBuyerPct =
      nextMeta.acceptedWageShareBuyerPct ??
      nextMeta.proposedWageShareBuyerPct ??
      meta.proposedWageShareBuyerPct ??
      loan.wageShareBuyerPct;
    // El weeklyWage se intenta recuperar primero desde la metadata (siempre
    // se guarda al proponer la cesión). Si por algún motivo falta, lo
    // recalculamos a partir del pricingEngine con los datos actuales del
    // jugador para que la cesión siempre tenga un coste salarial coherente
    // con las condiciones aceptadas.
    let weeklyWage =
      typeof meta.weeklyWage === "number" && Number.isFinite(meta.weeklyWage)
        ? Math.max(0, Math.round(meta.weeklyWage))
        : 0;
    if (weeklyWage === 0) {
      try {
        const playerRatings = await prisma.matchStat.findMany({
          where: { playerId: loan.playerId },
          select: { rating: true },
          orderBy: { match: { scheduledAt: "desc" } },
          take: 10,
        });
        const role =
          loan.squadRoleSnapshot === "CLAVE"
            ? "Crucial"
            : loan.squadRoleSnapshot === "IMPORTANTE"
              ? "Important"
              : "Rotation";
        const financial = calculatePlayerValueAndClause({
          overall: loan.player.overall,
          potential: loan.player.potential,
          birthdate: loan.player.birthdate,
          position: loan.player.position,
          internationalReputation: loan.player.internationalReputation,
          pace: loan.player.pace,
          shooting: loan.player.shooting,
          passing: loan.player.passing,
          dribbling: loan.player.dribbling,
          defending: loan.player.defending,
          physical: loan.player.physical,
          role,
          leagueFactor: loan.sellerTeam.league ? 1.2 : 1,
          matchRatings: playerRatings.map((r) => r.rating),
        });
        weeklyWage = Math.max(0, Math.round(financial.weeklyWage));
      } catch (e) {
        console.error("[loans/respond] weeklyWage fallback failed:", e);
      }
    }
    // La cesión empieza cuando se acepta, no cuando se propuso. Usamos
    // simulatedNow como startsAt para que endsAt, weeks y el coste salarial
    // reflejen las condiciones reales en el momento de la aceptación.
    const startsAt = simulatedNow;
    const endsAt = computeLoanEndDate({
      startsAt,
      duration: acceptedDuration as "SHORT_TERM" | "ONE_YEAR" | "TWO_YEARS",
      seasonEndDate: loan.season.endDate,
    });
    const weeks = calculateLoanWeeks(startsAt, endsAt);
    const totalWageCost = calculateLoanFinancialBreakdown({
      weeklyWage,
      wageShareBuyerPct: acceptedWageShareBuyerPct,
      weeks,
      buyOptionPrice: 0,
    }).totalWageCost;
    const buyOptionPrice =
      nextMeta.acceptedBuyOptionPrice ??
      meta.proposedBuyOptionPrice ??
      null;
    const hasBuyOption =
      nextMeta.acceptedHasBuyOption ??
      meta.proposedHasBuyOption ??
      loan.hasBuyOption;

    // El dinero total a reservar del comprador es el coste salarial total
    // acordado más la opción de compra (si la hay). La opción de compra
    // se paga únicamente al ejecutar la opción (loanEngine), no ahora, así
    // que solo añadimos al agreedPrice el coste salarial.
    await prisma.negotiation.update({
      where: { id: loan.negotiation.id },
      data: {
        agreedPrice: totalWageCost,
        buyoutOptionPrice:
          hasBuyOption && buyOptionPrice
            ? Math.round(buyOptionPrice)
            : null,
        offeredWage: totalWageCost,
        buyerSalaryPercent: acceptedWageShareBuyerPct,
        sellerSalaryPercent:
          100 - acceptedWageShareBuyerPct,
        squadRole: loan.squadRoleSnapshot ?? "ROTACION",
        type: transferTypeForDuration(acceptedDuration as LoanDuration),
      },
    });

    // Persistimos los valores aceptados (duración, %, opción de compra)
    // y la tensión a 0 en la metadata del Loan ANTES de delegar en
    // processNegotiation. Así, si la transacción de processNegotiation
    // falla, el Loan conserva las condiciones acordadas y puede
    // reintentarse la activación manualmente desde el panel admin.
    await prisma.loan.update({
      where: { id: loan.id },
      data: {
        metadata: {
          ...nextMeta,
          currentTension: 0,
          weeklyWage,
          totalWageCost,
        },
      },
    });

    processResult = await processNegotiation({
      negotiationId: loan.negotiation.id,
      simulatedNow,
      prismaClient: prisma,
    });

    if (!processResult.ok) {
      return NextResponse.json(
        {
          error: processResult.reason ?? "negotiation-failed",
          reason:
            processResult.message ?? "No se pudo consolidar la cesión.",
        },
        { status: 400 },
      );
    }
  }

  const message = getRandomLoanQuote(messageCategory, {
    player: loan.player.name,
    seller: loan.sellerTeam.name,
    manager: sellerManagerName ?? undefined,
    duration: nextMeta.proposedDuration ?? meta.proposedDuration,
    wageShareBuyerPct:
      nextMeta.proposedWageShareBuyerPct ??
      meta.proposedWageShareBuyerPct,
    counterWageShareBuyerPct: counterWageShareBuyerPct ?? undefined,
    buyOptionPrice:
      nextMeta.proposedBuyOptionPrice ??
      meta.proposedBuyOptionPrice ??
      undefined,
    counterBuyOptionPrice: counterBuyOptionPrice ?? undefined,
  });

  return NextResponse.json({
    status:
      processResult?.ok && processResult.loanId
        ? processResult.status
        : nextStatus ?? loan.status,
    loanId: processResult?.ok ? processResult.loanId : loan.id,
    activated:
      processResult?.ok &&
      processResult.loanId !== null &&
      processResult.status === "COMPLETED",
    tension: nextTension,
    message,
    currentPhase: nextMeta.currentPhase ?? meta.currentPhase ?? "DURATION",
    proposed: {
      duration: nextMeta.proposedDuration ?? meta.proposedDuration,
      wageShareBuyerPct:
        nextMeta.proposedWageShareBuyerPct ??
        meta.proposedWageShareBuyerPct,
      hasBuyOption:
        nextMeta.proposedHasBuyOption ?? meta.proposedHasBuyOption,
      buyOptionPrice:
        nextMeta.proposedBuyOptionPrice ?? meta.proposedBuyOptionPrice,
      counterDuration: nextMeta.managerCounterDuration ?? meta.managerCounterDuration ?? null,
      counterWageShareBuyerPct,
      counterBuyOptionPrice,
      managerPrefersBuyOption:
        typeof nextMeta.managerPrefersBuyOption === "boolean"
          ? nextMeta.managerPrefersBuyOption
          : typeof meta.managerPrefersBuyOption === "boolean"
            ? meta.managerPrefersBuyOption
            : null,
    },
    buyerBudget:
      processResult && processResult.ok
        ? processResult.budgetAfter.buyerBudget
        : undefined,
  });
}
