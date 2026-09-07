import { describe, expect, it, vi } from "vitest";
import { activateLoanInTransaction } from "../loanActivationService";

const { consumeBudget } = vi.hoisted(() => ({
  consumeBudget: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/transfers/budgetCommitment", () => ({
  consumeBudget,
}));

function makeTransaction(loan: Record<string, unknown>, roster: Record<string, unknown> | null = null) {
  return {
    loan: {
      findUnique: vi.fn().mockResolvedValue(loan),
      update: vi.fn().mockResolvedValue(undefined),
    },
    roster: {
      findFirst: vi.fn().mockResolvedValue(roster),
      update: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue(undefined),
    },
    player: {
      update: vi.fn().mockResolvedValue(undefined),
    },
    negotiation: {
      update: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe("activateLoanInTransaction", () => {
  it("mueve el jugador al club comprador y consume la reserva una sola vez", async () => {
    consumeBudget.mockClear();
    const tx = makeTransaction({
      id: "loan-1",
      status: "AGREED_CLUB",
      playerId: "player-1",
      buyerTeamId: "buyer-1",
      sellerTeamId: "seller-1",
      seasonId: "season-1",
      fee: 5000,
      metadata: { totalWageCost: 5000 },
      negotiationId: "neg-1",
    }, { id: "roster-1", teamId: "seller-1" });

    const result = await activateLoanInTransaction(tx as never, {
      loanId: "loan-1",
      simulatedNow: new Date("2027-08-01T00:00:00Z"),
    });

    expect(result).toEqual({ ok: true, alreadyActive: false, loanId: "loan-1" });
    expect(tx.roster.update).toHaveBeenCalledWith({
      where: { id: "roster-1" },
      data: { teamId: "buyer-1", isActive: true, isLoaned: true },
    });
    expect(tx.player.update).toHaveBeenCalledWith({
      where: { id: "player-1" },
      data: { isLoaned: true, loanedToTeamId: "buyer-1" },
    });
    expect(consumeBudget).toHaveBeenCalledTimes(1);
    expect(tx.loan.update).toHaveBeenCalled();
    expect(tx.negotiation.update).toHaveBeenCalled();
  });

  it("es idempotente si la cesión ya está completada", async () => {
    consumeBudget.mockClear();
    const tx = makeTransaction({
      id: "loan-2",
      status: "COMPLETED",
      playerId: "player-2",
      buyerTeamId: "buyer-2",
      sellerTeamId: "seller-2",
      seasonId: "season-2",
      fee: 8000,
      metadata: { totalWageCost: 8000 },
      negotiationId: "neg-2",
    });

    const result = await activateLoanInTransaction(tx as never, {
      loanId: "loan-2",
      simulatedNow: new Date("2027-08-01T00:00:00Z"),
    });

    expect(result).toEqual({ ok: true, alreadyActive: true, loanId: "loan-2" });
    expect(consumeBudget).not.toHaveBeenCalled();
    expect(tx.roster.update).not.toHaveBeenCalled();
    expect(tx.player.update).not.toHaveBeenCalled();
  });
});
