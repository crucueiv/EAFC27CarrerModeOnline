import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canPlayerBeLoanedOut } from "@/lib/transfers/loanEligibility";
import {
  ACTIVE_LOAN_STATUSES,
  computeLoanEndDate,
  findActiveLoanForBuyer,
  type LoanType,
  calculateLoanWageCost,
  calculateLoanWageShare,
} from "@/lib/transfers/loanEngine";
import { getRandomLoanQuote, formatEuro } from "@/lib/transfers/loanNegotiationEngine";
import type { LoanDuration } from "@/lib/transfers/loanNegotiationEngine";
import { getSimulatedCurrentDate } from "@/lib/calendar/simulatedClock";
import { resolveActiveWindow, type TransferWindowSnapshot } from "@/lib/calendar/transferWindowResolver";
import {
  pureBuildSummerWindow,
  pureBuildWinterWindow,
} from "@/lib/calendar/transferWindowResolver";
import { getOrCreateActiveSeason } from "@/lib/seasons";
import { assertNotOwnPlayer } from "@/lib/transfers/ownership";
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
    include: { team: true, player: true },
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
  if (!eligibility.eligible) {
    return NextResponse.json(
      { error: "ineligible", reason: eligibility.reason },
      { status: 400 },
    );
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
    role: "Rotation",
  });
  const weeklyWage = financial.weeklyWage;
  const buyerWeeklyWageCost = calculateLoanWageShare(weeklyWage, body.wageShareBuyerPct);
  const totalWageCost = calculateLoanWageCost(weeklyWage, body.wageShareBuyerPct, weeks);

  if (userTeam.budget < totalWageCost) {
    return NextResponse.json({ error: "insufficient-budget" }, { status: 400 });
  }

  const windowOpensAt: Date = windowState.kind === "WITHIN" ? simulatedNow : windowState.next.opensAt;
  const negotiation = await prisma.negotiation.create({
    data: {
      playerId: body.playerId,
      buyerTeamId: userTeam.id,
      sellerTeamId: sellerTeam.id,
      buyerId: userId,
      sellerId: null,
      seasonId: season.id,
      type: transferType,
      status: "PENDING_AGREEMENT",
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

  const greeting = getRandomLoanQuote("greeting", {
    player: roster.player.name,
    seller: sellerTeam.name,
  });

  return NextResponse.json({
    loanId: loan.id,
    negotiationId: negotiation.id,
    greeting,
    schedule: { startsAt, endsAt, weeks },
    totalWageCost,
    weeklyWage,
    buyerWeeklyWageCost,
    wageShareBuyerPct: body.wageShareBuyerPct,
    formatted: {
      wageShareBuyerPct: body.wageShareBuyerPct,
      weeklyWage: formatEuro(weeklyWage),
      buyerWeeklyWage: formatEuro(buyerWeeklyWageCost),
      totalWageCost: formatEuro(totalWageCost),
      buyOptionPrice: body.buyOptionPrice ? formatEuro(body.buyOptionPrice) : null,
    },
  });
}
