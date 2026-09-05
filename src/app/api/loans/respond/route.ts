import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  computeLoanNegotiationParams,
  evaluateLoanWageOffer,
  getRandomLoanQuote,
  type LoanDuration,
} from "@/lib/transfers/loanNegotiationEngine";
import { finalizeLoanPlayerContract, processNegotiation } from "@/lib/transfers/processNegotiation";
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
      sellerTeam: true,
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

  const meta = (loan.metadata as Metadata | null) ?? {};
  const isSeller = userId === loan.sellerId;
  const isBuyer = userId === loan.buyerId;
  if (!isSeller && !isBuyer) {
    return NextResponse.json({ error: "not-participant" }, { status: 403 });
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
    | "maxTensionHangup" = "greeting";

  let counterWageShareBuyerPct: number | null = null;
  let counterBuyOptionPrice: number | null = null;
  let lowballHangup = false;

  if (body.action === "REJECT") {
    nextStatus = "REJECTED";
    messageCategory = "maxTensionHangup";
  } else if (body.action === "HANGUP") {
    nextStatus = "CANCELLED";
    messageCategory = "maxTensionHangup";
    nextTension = 100;
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
    if (typeof body.counterDuration === "string") {
      nextMeta.proposedDuration = body.counterDuration;
      messageCategory = "counterOfferWage";
    }

    const proposedPct =
      typeof body.counterWageShareBuyerPct === "number"
        ? body.counterWageShareBuyerPct
        : (nextMeta.proposedWageShareBuyerPct ??
            meta.proposedWageShareBuyerPct ??
            loan.wageShareBuyerPct);
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

    if (evaluation.shouldHangUp) {
      lowballHangup = true;
      nextStatus = "CANCELLED";
      nextTension = 100;
      messageCategory = "lowballHangup";
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
    const sim = await getSimulatedCurrentDate({ userId, prismaClient: prisma });
    const simulatedNow = sim.ok ? sim.currentDate : new Date();
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
