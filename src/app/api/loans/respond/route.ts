import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  computeLoanNegotiationParams,
  evaluateLoanWageOffer,
  getRandomLoanQuote,
  resolveSellerManagerName,
  type LoanDuration,
} from "@/lib/transfers/loanNegotiationEngine";
import {
  finalizeLoanPlayerContract,
  processNegotiation,
  recordManagerRejectionCooldown,
} from "@/lib/transfers/processNegotiation";
import { getSimulatedCurrentDate } from "@/lib/calendar/simulatedClock";
import { assertNotOwnPlayer } from "@/lib/transfers/ownership";

type Body = {
  loanId: string;
  action: "COUNTER" | "ACCEPT" | "REJECT" | "HANGUP";
  counterDuration?: LoanDuration;
  counterWageShareBuyerPct?: number;
  counterHasBuyOption?: boolean;
  counterBuyOptionPrice?: number | null;
};

type Metadata = {
  currentTension?: number;
  proposedDuration?: LoanDuration;
  proposedWageShareBuyerPct?: number;
  proposedHasBuyOption?: boolean;
  proposedBuyOptionPrice?: number | null;
  acceptedDuration?: LoanDuration | null;
  acceptedWageShareBuyerPct?: number | null;
  acceptedHasBuyOption?: boolean | null;
  acceptedBuyOptionPrice?: number | null;
  totalWageCost?: number;
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
        },
      },
      buyerTeam: true,
      negotiation: true,
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
  let messageCategory:
    | "greeting"
    | "rejectionDuration"
    | "rejectionWage"
    | "rejectionBuyOption"
    | "counterOfferWage"
    | "counterOfferBuyOption"
    | "highTensionWarning"
    | "lowballHangup"
    | "accepted"
    | "maxTensionHangup"
    | "notInterested" = "greeting";

  let counterWageShareBuyerPct: number | null = null;
  let counterBuyOptionPrice: number | null = null;
  let lowballHangup = false;

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
    nextStatus = "ACCEPTED";
    nextMeta.acceptedDuration = meta.proposedDuration ?? null;
    nextMeta.acceptedWageShareBuyerPct = meta.proposedWageShareBuyerPct ?? null;
    nextMeta.acceptedHasBuyOption = meta.proposedHasBuyOption ?? null;
    nextMeta.acceptedBuyOptionPrice = meta.proposedBuyOptionPrice ?? null;
    nextTension = 0;
    messageCategory = "accepted";
  } else if (body.action === "COUNTER") {
    const currentDuration =
      nextMeta.proposedDuration ?? meta.proposedDuration ?? loan.duration;
    const currentWagePct =
      nextMeta.proposedWageShareBuyerPct ??
      meta.proposedWageShareBuyerPct ??
      loan.wageShareBuyerPct;
    const currentHasBuyOption =
      nextMeta.proposedHasBuyOption ??
      meta.proposedHasBuyOption ??
      loan.hasBuyOption;
    const currentBuyOptionPrice =
      nextMeta.proposedBuyOptionPrice ??
      meta.proposedBuyOptionPrice ??
      loan.buyOptionPrice;

    const durationChanged =
      typeof body.counterDuration === "string" &&
      body.counterDuration !== currentDuration;
    const wageChanged =
      typeof body.counterWageShareBuyerPct === "number" &&
      body.counterWageShareBuyerPct !== currentWagePct;
    const buyOptionChanged =
      typeof body.counterHasBuyOption === "boolean" &&
      (body.counterHasBuyOption !== currentHasBuyOption ||
        (body.counterHasBuyOption &&
          typeof body.counterBuyOptionPrice === "number" &&
          body.counterBuyOptionPrice !== currentBuyOptionPrice));

    let phase: "duration" | "wage" | "buyOption" | null = null;
    if (durationChanged) phase = "duration";
    else if (wageChanged) phase = "wage";
    else if (buyOptionChanged) phase = "buyOption";

    if (durationChanged && typeof body.counterDuration === "string") {
      nextMeta.proposedDuration = body.counterDuration;
    }

    const proposedPct =
      typeof body.counterWageShareBuyerPct === "number"
        ? body.counterWageShareBuyerPct
        : currentWagePct;
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

    const evaluation = evaluateLoanWageOffer(proposedPct, params);
    const tooLongDuration =
      nextMeta.proposedDuration === "TWO_YEARS" &&
      (meta.proposedDuration ?? loan.duration) !== "TWO_YEARS";
    const rejectDuration = phase === "duration" && tooLongDuration;

    if (evaluation.shouldHangUp) {
      lowballHangup = true;
      nextStatus = "CANCELLED";
      nextTension = 100;
      messageCategory = "lowballHangup";
    } else if (rejectDuration) {
      nextMeta.proposedDuration = "ONE_YEAR";
      nextTension = clampTension(nextTension + 25);
      nextStatus = "COUNTERED";
      messageCategory = "rejectionDuration";
    } else if (
      phase === "buyOption" &&
      buyOptionChanged &&
      typeof body.counterBuyOptionPrice === "number" &&
      body.counterBuyOptionPrice < params.lowballBuyOptionThreshold
    ) {
      if (typeof body.counterHasBuyOption === "boolean") {
        nextMeta.proposedHasBuyOption = body.counterHasBuyOption;
      }
      if (
        body.counterHasBuyOption &&
        typeof body.counterBuyOptionPrice === "number"
      ) {
        nextMeta.proposedBuyOptionPrice = body.counterBuyOptionPrice;
        counterBuyOptionPrice = Math.max(
          params.lowballBuyOptionThreshold,
          Math.round(
            (body.counterBuyOptionPrice + params.targetBuyOptionPrice) / 2,
          ),
        );
      }
      nextTension = clampTension(nextTension + 20);
      nextStatus = "COUNTERED";
      messageCategory = "rejectionBuyOption";
    } else if (phase === "wage" && !evaluation.autoAccept) {
      if (typeof body.counterWageShareBuyerPct === "number") {
        nextMeta.proposedWageShareBuyerPct = body.counterWageShareBuyerPct;
      }
      counterWageShareBuyerPct = evaluation.counterWageShareBuyerPct;
      if (typeof body.counterHasBuyOption === "boolean") {
        nextMeta.proposedHasBuyOption = body.counterHasBuyOption;
        if (
          body.counterHasBuyOption &&
          typeof body.counterBuyOptionPrice === "number"
        ) {
          nextMeta.proposedBuyOptionPrice = body.counterBuyOptionPrice;
          if (counterBuyOptionPrice === null) {
            counterBuyOptionPrice = Math.max(
              params.lowballBuyOptionThreshold,
              Math.round(
                (body.counterBuyOptionPrice + params.targetBuyOptionPrice) / 2,
              ),
            );
          }
        } else if (!body.counterHasBuyOption) {
          nextMeta.proposedBuyOptionPrice = null;
        }
      }
      nextTension = clampTension(nextTension + evaluation.tensionDelta);
      nextStatus = "COUNTERED";
      messageCategory = "rejectionWage";
    } else if (evaluation.autoAccept) {
      nextStatus = "ACCEPTED";
      nextMeta.acceptedDuration =
        nextMeta.proposedDuration ?? meta.proposedDuration ?? null;
      nextMeta.acceptedWageShareBuyerPct = proposedPct;
      nextMeta.acceptedHasBuyOption =
        nextMeta.proposedHasBuyOption ?? meta.proposedHasBuyOption ?? null;
      nextMeta.acceptedBuyOptionPrice =
        nextMeta.proposedBuyOptionPrice ?? meta.proposedBuyOptionPrice ?? null;
      nextTension = 0;
      messageCategory = "accepted";
      counterWageShareBuyerPct = null;
    } else {
      if (typeof body.counterWageShareBuyerPct === "number") {
        nextMeta.proposedWageShareBuyerPct = body.counterWageShareBuyerPct;
      }
      counterWageShareBuyerPct = evaluation.counterWageShareBuyerPct;

      if (typeof body.counterHasBuyOption === "boolean") {
        nextMeta.proposedHasBuyOption = body.counterHasBuyOption;
        if (
          body.counterHasBuyOption &&
          typeof body.counterBuyOptionPrice === "number"
        ) {
          nextMeta.proposedBuyOptionPrice = body.counterBuyOptionPrice;
          counterBuyOptionPrice = Math.max(
            params.lowballBuyOptionThreshold,
            Math.round(
              (body.counterBuyOptionPrice + params.targetBuyOptionPrice) / 2,
            ),
          );
          messageCategory = "counterOfferBuyOption";
        } else if (!body.counterHasBuyOption) {
          nextMeta.proposedBuyOptionPrice = null;
          messageCategory = "counterOfferWage";
        }
      } else if (phase === null) {
        messageCategory = "counterOfferWage";
      }
      nextTension = clampTension(nextTension + evaluation.tensionDelta);
      nextStatus = "COUNTERED";
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

  // Al aceptar la cesión consolidamos el acuerdo entre clubes. El flujo
  // deja la Negotiation en AGREED_CLUB, el Loan en WAITING_PLAYER_CONTRACT
  // y, una vez que el jugador firme su contrato, finalizeLoanPlayerContract
  // aplicará los efectos de roster/presupuesto.
  let processResult: Awaited<ReturnType<typeof processNegotiation>> | null = null;
  if (body.action === "ACCEPT" && loan.negotiation) {
    const simulatedNow = buyerSimulatedNow;
    const totalWageCost = meta.totalWageCost ?? 0;
    const buyOptionPrice =
      nextMeta.acceptedBuyOptionPrice ??
      meta.proposedBuyOptionPrice ??
      null;
    const hasBuyOption =
      nextMeta.acceptedHasBuyOption ??
      meta.proposedHasBuyOption ??
      loan.hasBuyOption;

    await prisma.negotiation.update({
      where: { id: loan.negotiation.id },
      data: {
        agreedPrice: totalWageCost,
        buyoutOptionPrice:
          hasBuyOption && buyOptionPrice
            ? Math.round(buyOptionPrice)
            : null,
        offeredWage: totalWageCost,
        buyerSalaryPercent:
          nextMeta.acceptedWageShareBuyerPct ??
          meta.proposedWageShareBuyerPct ??
          loan.wageShareBuyerPct,
        sellerSalaryPercent:
          100 -
          (nextMeta.acceptedWageShareBuyerPct ??
            meta.proposedWageShareBuyerPct ??
            loan.wageShareBuyerPct),
        squadRole: loan.squadRoleSnapshot ?? "ROTACION",
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
    status: nextStatus ?? loan.status,
    tension: nextTension,
    message,
    proposed: {
      duration: nextMeta.proposedDuration ?? meta.proposedDuration,
      wageShareBuyerPct:
        nextMeta.proposedWageShareBuyerPct ??
        meta.proposedWageShareBuyerPct,
      hasBuyOption:
        nextMeta.proposedHasBuyOption ?? meta.proposedHasBuyOption,
      buyOptionPrice:
        nextMeta.proposedBuyOptionPrice ?? meta.proposedBuyOptionPrice,
      counterWageShareBuyerPct,
      counterBuyOptionPrice,
    },
    buyerBudget:
      processResult && processResult.ok
        ? processResult.budgetAfter.buyerBudget
        : undefined,
  });
}
