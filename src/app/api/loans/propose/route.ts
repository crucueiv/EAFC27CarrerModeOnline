import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canPlayerBeLoanedOut } from "@/lib/transfers/loanEligibility";
import {
  calculateLoanFinancialBreakdown,
  calculateLoanWeeks,
  computeLoanEndDate,
  findActiveLoanForBuyer,
  type LoanType,
} from "@/lib/transfers/loanEngine";
import { getRandomLoanQuote, formatEuro, resolveSellerManagerName } from "@/lib/transfers/loanNegotiationEngine";
import type { LoanDuration } from "@/lib/transfers/loanNegotiationEngine";
import { getSimulatedCurrentDate } from "@/lib/calendar/simulatedClock";
import { resolveActiveWindow, type TransferWindowSnapshot } from "@/lib/calendar/transferWindowResolver";
import {
  pureBuildSummerWindow,
  pureBuildWinterWindow,
} from "@/lib/calendar/transferWindowResolver";
import { getOrCreateActiveSeason } from "@/lib/seasons";
import { assertNotOwnPlayer, isHumanManagedTeam } from "@/lib/transfers/ownership";
import { sendNegotiationEmail } from "@/lib/transfers/negotiationEmail";
import { calculatePlayerValueAndClause } from "@/lib/transfers/pricingEngine";

type Body = {
  playerId: string;
  duration: LoanDuration;
  wageShareBuyerPct: number;
  hasBuyOption: boolean;
  buyOptionPrice?: number | null;
};

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "no-db" }, { status: 503 });

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || !body.playerId || !body.duration) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const ownership = await assertNotOwnPlayer({ playerId: body.playerId, userId });
  if (!ownership.ok) {
    return NextResponse.json(
      {
        error: "PLAYER_ALREADY_OWNED",
        reason:
          "No puedes proponer una cesión por un jugador que ya pertenece a tu club.",
        ownership: ownership.ownership,
      },
      { status: 409 },
    );
  }

  const userTeam = await prisma.team.findFirst({
    where: { managerId: userId },
    select: { id: true, name: true, budget: true, leagueId: true },
  });
  if (!userTeam) return NextResponse.json({ error: "no-team" }, { status: 400 });

  const season = await getOrCreateActiveSeason(userId, userTeam.leagueId);
  const seasonEndDate = await prisma.season.findUnique({
    where: { id: season.id },
    select: { endDate: true },
  });
  const sim = await getSimulatedCurrentDate({ userId, prismaClient: prisma });
  const simulatedNow = sim.ok ? sim.currentDate : new Date();

  const roster = await prisma.roster.findFirst({
    where: { playerId: body.playerId, isActive: true },
    include: {
      team: {
        include: {
          manager: { select: { name: true, image: true } },
          managerProfile: { select: { name: true, avatarUrl: true } },
          league: { select: { id: true } },
        },
      },
      player: {
        include: {
          matchStats: {
            select: { rating: true },
          },
        },
      },
    },
  });
  if (!roster) return NextResponse.json({ error: "no-roster" }, { status: 400 });
  const sellerTeam = roster.team;
  if (sellerTeam.id === userTeam.id) {
    return NextResponse.json({ error: "self-loan" }, { status: 400 });
  }

  const existingLoan = await findActiveLoanForBuyer({
    playerId: body.playerId,
    buyerTeamId: userTeam.id,
    prismaClient: prisma,
  });
  if (existingLoan) {
    return NextResponse.json(
      {
        error: "loan-already-active",
        status: existingLoan.status,
        loanId: existingLoan.id,
        reason: "Ya tienes una cesión activa para este jugador.",
      },
      { status: 409 },
    );
  }

  const eligibility = await canPlayerBeLoanedOut(body.playerId, sellerTeam.id);
  const sellerManagerName = resolveSellerManagerName(sellerTeam);

  if (!eligibility.eligible) {
    const windowOpensAt = simulatedNow;
    const isHumanRejected = isHumanManagedTeam(sellerTeam);
    const negotiation = await prisma.negotiation.create({
      data: {
        playerId: body.playerId,
        buyerTeamId: userTeam.id,
        sellerTeamId: sellerTeam.id,
        buyerId: userId,
        sellerId: isHumanRejected ? sellerTeam.managerId : null,
        seasonId: season.id,
        type: "LOAN_SHORT_TERM",
        status: "REJECTED",
        canal: isHumanRejected ? "HUMAN_EMAIL" : "AI_CALL",
        agreedPrice: 0,
        buyoutOptionPrice: null,
        sellerSalaryPercent: 100,
        buyerSalaryPercent: 0,
        offeredWage: 0,
        effectiveDate: windowOpensAt,
        windowOpensAt,
        decidedAt: windowOpensAt,
        tension: 100,
      },
    });

    const loan = await prisma.loan.create({
      data: {
        seasonId: season.id,
        playerId: body.playerId,
        sellerTeamId: sellerTeam.id,
        buyerTeamId: userTeam.id,
        buyerId: userId,
        duration: body.duration,
        wageShareBuyerPct: body.wageShareBuyerPct,
        hasBuyOption: body.hasBuyOption,
        buyOptionPrice: body.hasBuyOption ? body.buyOptionPrice ?? null : null,
        startsAt: windowOpensAt,
        endsAt: windowOpensAt,
        status: "REJECTED",
        metadata: {
          negotiationId: negotiation.id,
          currentTension: 100,
          ineligible: true,
          ineligibilityReason: eligibility.reason ?? null,
          proposedDuration: body.duration,
          proposedWageShareBuyerPct: body.wageShareBuyerPct,
          proposedHasBuyOption: body.hasBuyOption,
          proposedBuyOptionPrice: body.hasBuyOption ? body.buyOptionPrice ?? null : null,
          acceptedDuration: null,
          acceptedWageShareBuyerPct: null,
          acceptedHasBuyOption: null,
          acceptedBuyOptionPrice: null,
        },
        negotiationId: negotiation.id,
      },
    });

    const message = getRandomLoanQuote("notInterested", {
      player: roster.player.name,
      seller: sellerTeam.name,
      manager: sellerManagerName ?? undefined,
    });

    return NextResponse.json({
      loanId: loan.id,
      negotiationId: negotiation.id,
      canal: isHumanRejected ? "HUMAN_EMAIL" : "AI_CALL",
      ineligible: true,
      ineligibilityReason: eligibility.reason ?? null,
      greeting: message,
      schedule: {
        startsAt: windowOpensAt,
        endsAt: windowOpensAt,
        weeks: 0,
        seasonEndAt: seasonEndDate?.endDate ?? null,
      },
      totalWageCost: 0,
      weeklyWage: 0,
      buyerWeeklyWageCost: 0,
      wageShareBuyerPct: body.wageShareBuyerPct,
      formatted: {
        wageShareBuyerPct: body.wageShareBuyerPct,
        weeklyWage: formatEuro(0),
        buyerWeeklyWage: formatEuro(0),
        totalWageCost: formatEuro(0),
        buyOptionPrice: body.buyOptionPrice ? formatEuro(body.buyOptionPrice) : null,
      },
    });
  }

  if (body.wageShareBuyerPct < 20 || body.wageShareBuyerPct > 80) {
    return NextResponse.json({ error: "wage-out-of-range" }, { status: 400 });
  }
  if (body.hasBuyOption && (!body.buyOptionPrice || body.buyOptionPrice <= 0)) {
    return NextResponse.json({ error: "buy-option-price-required" }, { status: 400 });
  }

  const windowState = await resolveActiveWindow({
    seasonId: season.id,
    simulatedNow,
    prismaClient: prisma,
  });
  if (windowState.kind === "NO_WINDOWS") {
    return NextResponse.json({ error: "transfer-window-closed" }, { status: 400 });
  }

  const typeMap: Record<LoanDuration, "LOAN_SHORT_TERM" | "LOAN_1_YEAR" | "LOAN_2_YEARS"> = {
    SHORT_TERM: "LOAN_SHORT_TERM",
    ONE_YEAR: "LOAN_1_YEAR",
    TWO_YEARS: "LOAN_2_YEARS",
  };
  const transferType = typeMap[body.duration];

  const startsAt = simulatedNow;
  const endsAt = computeLoanEndDate({
    startsAt,
    duration: body.duration as LoanType,
    seasonEndDate: seasonEndDate?.endDate ?? null,
  });
  const weeks = Math.max(1, Math.ceil((endsAt.getTime() - startsAt.getTime()) / (7 * 24 * 60 * 60 * 1000)));

  const financial = calculatePlayerValueAndClause({
    overall: roster.player.overall,
    potential: roster.player.potential,
    birthdate: roster.player.birthdate,
    position: roster.player.position,
    internationalReputation: roster.player.internationalReputation,
    pace: roster.player.pace,
    shooting: roster.player.shooting,
    passing: roster.player.passing,
    dribbling: roster.player.dribbling,
    defending: roster.player.defending,
    physical: roster.player.physical,
    role:
      roster.role === "CLAVE"
        ? "Crucial"
        : roster.role === "IMPORTANTE"
          ? "Important"
          : "Rotation",
    leagueFactor: sellerTeam.league ? 1.2 : 1,
    matchRatings: roster.player.matchStats.map((stat) => stat.rating),
  });
  const weeklyWage = Math.max(0, Math.round(financial.weeklyWage));
  // Calculamos el desglose financiero completo de la cesión propuesta.
  const breakdown = calculateLoanFinancialBreakdown({
    weeklyWage,
    wageShareBuyerPct: body.wageShareBuyerPct,
    weeks,
    buyOptionPrice: body.hasBuyOption ? body.buyOptionPrice ?? 0 : 0,
  });
  const buyerWeeklyWageCost = breakdown.buyerWeeklyWage;
  const totalWageCost = breakdown.totalWageCost;
  const totalLoanCost = breakdown.totalLoanCost;

  if (userTeam.budget < totalLoanCost) {
    return NextResponse.json({ error: "insufficient-budget" }, { status: 400 });
  }

  const windowOpensAt: Date = windowState.kind === "WITHIN" ? simulatedNow : windowState.next.opensAt;
  const isHuman = isHumanManagedTeam(sellerTeam);
  const negotiation = await prisma.negotiation.create({
    data: {
      playerId: body.playerId,
      buyerTeamId: userTeam.id,
      sellerTeamId: sellerTeam.id,
      buyerId: userId,
      sellerId: isHuman ? sellerTeam.managerId : null,
      seasonId: season.id,
      type: transferType,
      status: "PENDING_AGREEMENT",
      canal: isHuman ? "HUMAN_EMAIL" : "AI_CALL",
      agreedPrice: 0,
      buyoutOptionPrice: body.hasBuyOption ? body.buyOptionPrice ?? null : null,
      sellerSalaryPercent: 100 - body.wageShareBuyerPct,
      buyerSalaryPercent: body.wageShareBuyerPct,
      offeredWage: 0,
      effectiveDate: windowOpensAt,
      windowOpensAt,
    },
  });

  const loan = await prisma.loan.create({
    data: {
      seasonId: season.id,
      playerId: body.playerId,
      sellerTeamId: sellerTeam.id,
      buyerTeamId: userTeam.id,
      buyerId: userId,
      duration: body.duration,
      wageShareBuyerPct: body.wageShareBuyerPct,
      hasBuyOption: body.hasBuyOption,
      buyOptionPrice: body.hasBuyOption ? body.buyOptionPrice ?? null : null,
      startsAt,
      endsAt,
      status: "PROPOSED",
      metadata: {
        negotiationId: negotiation.id,
        currentTension: 20,
        proposedDuration: body.duration,
        proposedWageShareBuyerPct: body.wageShareBuyerPct,
        proposedHasBuyOption: body.hasBuyOption,
        proposedBuyOptionPrice: body.hasBuyOption ? body.buyOptionPrice ?? null : null,
        acceptedDuration: null,
        acceptedWageShareBuyerPct: null,
        acceptedHasBuyOption: null,
        acceptedBuyOptionPrice: null,
        totalWageCost,
        weeklyWage,
        buyerWeeklyWageCost,
      },
      negotiationId: negotiation.id,
    },
  });

  if (isHuman && sellerTeam.managerId) {
    let emailId: string | null = null;
    try {
      const result = await sendNegotiationEmail({
        negotiationId: negotiation.id,
        senderUserId: userId,
        receiverUserId: sellerTeam.managerId,
        oferta: {
          dinero: 0,
          jugadoresOfrecidos: [],
        },
        simulatedSentAt: simulatedNow,
        prismaClient: prisma,
        kind: "LOAN",
      });
      emailId = result.emailId;
    } catch (e) {
      console.error("[loans/propose] human email send failed:", e);
    }
    return NextResponse.json({
      loanId: loan.id,
      negotiationId: negotiation.id,
      canal: "HUMAN_EMAIL",
      emailId,
      schedule: { startsAt, endsAt, weeks, seasonEndAt: seasonEndDate?.endDate ?? null },
      totalWageCost,
      weeklyWage,
      buyerWeeklyWageCost,
      buyOptionPrice: body.hasBuyOption ? body.buyOptionPrice ?? 0 : 0,
      totalLoanCost,
      wageShareBuyerPct: body.wageShareBuyerPct,
      formatted: {
        wageShareBuyerPct: body.wageShareBuyerPct,
        weeklyWage: formatEuro(weeklyWage),
        buyerWeeklyWage: formatEuro(buyerWeeklyWageCost),
        totalWageCost: formatEuro(totalWageCost),
        totalLoanCost: formatEuro(totalLoanCost),
        buyOptionPrice: body.buyOptionPrice ? formatEuro(body.buyOptionPrice) : null,
      },
    });
  }

  const greeting = getRandomLoanQuote("greeting", {
    player: roster.player.name,
    seller: sellerTeam.name,
    manager: sellerManagerName ?? undefined,
  });

  return NextResponse.json({
    loanId: loan.id,
    negotiationId: negotiation.id,
    greeting,
    schedule: { startsAt, endsAt, weeks, seasonEndAt: seasonEndDate?.endDate ?? null },
    totalWageCost,
    weeklyWage,
    buyerWeeklyWageCost,
    buyOptionPrice: body.hasBuyOption ? body.buyOptionPrice ?? 0 : 0,
    totalLoanCost,
    wageShareBuyerPct: body.wageShareBuyerPct,
    formatted: {
      wageShareBuyerPct: body.wageShareBuyerPct,
      weeklyWage: formatEuro(weeklyWage),
      buyerWeeklyWage: formatEuro(buyerWeeklyWageCost),
      totalWageCost: formatEuro(totalWageCost),
      totalLoanCost: formatEuro(totalLoanCost),
      buyOptionPrice: body.buyOptionPrice ? formatEuro(body.buyOptionPrice) : null,
    },
  });
}
