import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateLoanFinancialBreakdown,
  calculateLoanWeeks,
} from "@/lib/transfers/loanEngine";
import { formatEuro } from "@/lib/transfers/loanNegotiationEngine";

type LoanMetadata = {
  currentTension?: number;
  totalWageCost?: number;
  weeklyWage?: number;
  buyerWeeklyWageCost?: number;
  proposedWageShareBuyerPct?: number;
  acceptedWageShareBuyerPct?: number;
  proposedBuyOptionPrice?: number | null;
  acceptedBuyOptionPrice?: number | null;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!prisma) return NextResponse.json({ error: "no-db" }, { status: 503 });

  const { id } = await params;
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      player: {
        select: {
          id: true,
          name: true,
          overall: true,
          position: true,
          marketValue: true,
          birthdate: true,
        },
      },
      sellerTeam: { select: { id: true, name: true } },
      buyerTeam: { select: { id: true, name: true, budget: true, committedBudget: true } },
      season: { select: { id: true, name: true } },
    },
  });
  if (!loan) return NextResponse.json({ error: "not-found" }, { status: 404 });
  if (loan.buyerId !== userId && loan.sellerId !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const meta = (loan.metadata as LoanMetadata | null) ?? {};

  // Recalculamos el coste con los valores vigentes del préstamo. Si el
  // `metadata` no incluye los datos (p.ej. préstamos antiguos), usamos
  // los campos del propio loan para reconstruir el cálculo.
  const effectivePct =
    meta.acceptedWageShareBuyerPct ??
    meta.proposedWageShareBuyerPct ??
    loan.wageShareBuyerPct;
  const effectiveBuyOption =
    meta.acceptedBuyOptionPrice ??
    meta.proposedBuyOptionPrice ??
    loan.buyOptionPrice ??
    0;

  // Semanas totales del préstamo (entre startsAt y endsAt).
  const totalWeeks = calculateLoanWeeks(
    new Date(loan.startsAt),
    new Date(loan.endsAt),
  );

  // Si tenemos un weeklyWage almacenado, lo usamos. Si no, derivamos uno
  // a partir del totalWageCost / weeks / pct.
  const storedWeeklyWage =
    typeof meta.weeklyWage === "number" && meta.weeklyWage > 0
      ? meta.weeklyWage
      : null;
  const storedTotalWage =
    typeof meta.totalWageCost === "number" && meta.totalWageCost > 0
      ? meta.totalWageCost
      : null;

  let weeklyWage = storedWeeklyWage ?? 0;
  if (!weeklyWage && storedTotalWage && totalWeeks > 0 && effectivePct > 0) {
    weeklyWage = Math.round(
      storedTotalWage / totalWeeks / (effectivePct / 100),
    );
  }

  const breakdown = calculateLoanFinancialBreakdown({
    weeklyWage,
    wageShareBuyerPct: effectivePct,
    weeks: totalWeeks,
    buyOptionPrice: loan.hasBuyOption ? Number(effectiveBuyOption) : 0,
  });

  // Coste restante desde hoy: semanas restantes * coste semanal del comprador
  const now = new Date();
  const remainingWeeks = Math.max(
    0,
    calculateLoanWeeks(now, new Date(loan.endsAt)),
  );
  const remainingWageCost = calculateLoanFinancialBreakdown({
    weeklyWage,
    wageShareBuyerPct: effectivePct,
    weeks: remainingWeeks,
    buyOptionPrice: 0,
  }).totalWageCost;

  return NextResponse.json({
    ...loan,
    financial: {
      weeklyWage,
      wageShareBuyerPct: effectivePct,
      totalWeeks,
      remainingWeeks,
      buyerWeeklyWage: breakdown.buyerWeeklyWage,
      totalWageCost: breakdown.totalWageCost,
      buyOptionPrice: breakdown.buyOptionPrice,
      totalLoanCost: breakdown.totalLoanCost,
      remainingWageCost,
      formatted: {
        weeklyWage: formatEuro(weeklyWage),
        buyerWeeklyWage: formatEuro(breakdown.buyerWeeklyWage),
        totalWageCost: formatEuro(breakdown.totalWageCost),
        totalLoanCost: formatEuro(breakdown.totalLoanCost),
        remainingWageCost: formatEuro(remainingWageCost),
        buyOptionPrice:
          loan.hasBuyOption && breakdown.buyOptionPrice > 0
            ? formatEuro(breakdown.buyOptionPrice)
            : null,
      },
    },
  });
}
