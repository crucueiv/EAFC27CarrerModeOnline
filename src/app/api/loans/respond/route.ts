import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRandomLoanQuote, type LoanDuration } from "@/lib/transfers/loanNegotiationEngine";

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
    include: { player: true, sellerTeam: true, buyerTeam: true },
  });
  if (!loan) return NextResponse.json({ error: "loan-not-found" }, { status: 404 });

  if (loan.status === "ACCEPTED" || loan.status === "REJECTED" || loan.status === "CANCELLED") {
    return NextResponse.json({ error: "loan-finalized" }, { status: 400 });
  }

  const meta = (loan.metadata as Metadata | null) ?? {};
  const isSeller = userId === loan.sellerId;
  const isBuyer = userId === loan.buyerId;
  if (!isSeller && !isBuyer) {
    return NextResponse.json({ error: "not-participant" }, { status: 403 });
  }

  let nextStatus: "PROPOSED" | "COUNTERED" | "ACCEPTED" | "REJECTED" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "BUY_OPTION_TRIGGERED" | "RETURNED" | null = null;
  let nextTension = clampTension(meta.currentTension ?? 20);
  let nextMeta: Metadata = { ...meta };
  let messageCategory:
    | "greeting"
    | "rejectionDuration"
    | "rejectionWage"
    | "rejectionBuyOption"
    | "counterOfferWage"
    | "counterOfferBuyOption"
    | "highTensionWarning"
    | "accepted"
    | "maxTensionHangup" = "greeting";

  if (body.action === "REJECT") {
    nextStatus = "REJECTED";
    messageCategory = "maxTensionHangup";
  } else if (body.action === "HANGUP") {
    nextStatus = "CANCELLED";
    messageCategory = "maxTensionHangup";
    nextTension = 100;
  } else if (body.action === "ACCEPT") {
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
    if (typeof body.counterWageShareBuyerPct === "number") {
      nextMeta.proposedWageShareBuyerPct = body.counterWageShareBuyerPct;
      messageCategory = "counterOfferWage";
    }
    if (typeof body.counterHasBuyOption === "boolean") {
      nextMeta.proposedHasBuyOption = body.counterHasBuyOption;
      if (body.counterHasBuyOption && typeof body.counterBuyOptionPrice === "number") {
        nextMeta.proposedBuyOptionPrice = body.counterBuyOptionPrice;
        messageCategory = "counterOfferBuyOption";
      } else if (!body.counterHasBuyOption) {
        nextMeta.proposedBuyOptionPrice = null;
        messageCategory = "counterOfferWage";
      }
    }
    nextTension = clampTension(nextTension + 15);
    nextStatus = "COUNTERED";
  }

  if (nextTension >= 90 && body.action === "COUNTER") {
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

  const message = getRandomLoanQuote(messageCategory, {
    player: loan.player.name,
    seller: loan.sellerTeam.name,
    duration: nextMeta.proposedDuration ?? meta.proposedDuration,
    wageShareBuyerPct: nextMeta.proposedWageShareBuyerPct ?? meta.proposedWageShareBuyerPct,
    buyOptionPrice: nextMeta.proposedBuyOptionPrice ?? meta.proposedBuyOptionPrice ?? undefined,
  });

  return NextResponse.json({
    status: nextStatus ?? loan.status,
    tension: nextTension,
    message,
    proposed: {
      duration: nextMeta.proposedDuration ?? meta.proposedDuration,
      wageShareBuyerPct: nextMeta.proposedWageShareBuyerPct ?? meta.proposedWageShareBuyerPct,
      hasBuyOption: nextMeta.proposedHasBuyOption ?? meta.proposedHasBuyOption,
      buyOptionPrice: nextMeta.proposedBuyOptionPrice ?? meta.proposedBuyOptionPrice,
    },
  });
}
