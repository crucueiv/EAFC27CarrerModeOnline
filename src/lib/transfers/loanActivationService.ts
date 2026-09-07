import type { Prisma } from "@prisma/client";
import { consumeBudget } from "@/lib/transfers/budgetCommitment";

type LoanTransaction = Prisma.TransactionClient;

type LoanActivationResult =
  | { ok: true; alreadyActive: boolean; loanId: string }
  | { ok: false; reason: string };

function numericMetadataValue(metadata: Prisma.JsonValue | null, key: string): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;
}

export async function activateLoanInTransaction(
  tx: LoanTransaction,
  input: { loanId: string; simulatedNow: Date },
): Promise<LoanActivationResult> {
  const loan = await tx.loan.findUnique({
    where: { id: input.loanId },
    select: {
      id: true,
      status: true,
      playerId: true,
      buyerTeamId: true,
      sellerTeamId: true,
      seasonId: true,
      fee: true,
      metadata: true,
      negotiationId: true,
    },
  });
  if (!loan) return { ok: false, reason: "LOAN_NOT_FOUND" };
  if (loan.status === "COMPLETED") {
    return { ok: true, alreadyActive: true, loanId: loan.id };
  }
  if (loan.status !== "AGREED_CLUB" && loan.status !== "WAITING_PLAYER_CONTRACT") {
    return { ok: false, reason: `INVALID_STATUS:${loan.status}` };
  }

  const activeRoster = await tx.roster.findFirst({
    where: { playerId: loan.playerId, isActive: true },
    select: { id: true, teamId: true },
  });
  if (activeRoster) {
    await tx.roster.update({
      where: { id: activeRoster.id },
      data: { teamId: loan.buyerTeamId, isActive: true, isLoaned: true },
    });
  } else {
    await tx.roster.create({
      data: {
        teamId: loan.buyerTeamId,
        playerId: loan.playerId,
        seasonId: loan.seasonId,
        isActive: true,
        isLoaned: true,
        role: "ROTACION",
      },
    });
  }

  await tx.player.update({
    where: { id: loan.playerId },
    data: { isLoaned: true, loanedToTeamId: loan.buyerTeamId },
  });

  const reservedAmount =
    numericMetadataValue(loan.metadata, "totalWageCost") ??
    Math.max(0, Math.round(loan.fee));
  if (reservedAmount > 0) {
    await consumeBudget(tx, loan.buyerTeamId, reservedAmount);
  }

  await tx.loan.update({
    where: { id: loan.id },
    data: { status: "COMPLETED", completedAt: input.simulatedNow },
  });

  if (loan.negotiationId) {
    await tx.negotiation.update({
      where: { id: loan.negotiationId },
      data: {
        status: "COMPLETED",
        decidedAt: input.simulatedNow,
        effectiveDate: input.simulatedNow,
      },
    });
  }

  return { ok: true, alreadyActive: false, loanId: loan.id };
}
