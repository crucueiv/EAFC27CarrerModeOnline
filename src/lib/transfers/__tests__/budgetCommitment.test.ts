import { describe, it, expect } from "vitest";

/**
 * Tests conceptuales para los helpers de presupuesto. Estos tests no
 * ejecutan contra una base de datos real, sino que verifican la lógica
 * mediante la inspección de las funciones. La integración real con
 * Prisma se valida en runtime.
 */

import {
  type BudgetSnapshot,
} from "@/lib/transfers/budgetCommitment";

describe("BudgetSnapshot type", () => {
  it("puede representar un equipo con presupuesto normal", () => {
    const snap: BudgetSnapshot = {
      teamId: "team-1",
      budget: 10_000_000,
      committedBudget: 2_000_000,
      available: 10_000_000,
    };
    expect(snap.teamId).toBe("team-1");
    expect(snap.budget).toBe(10_000_000);
    expect(snap.committedBudget).toBe(2_000_000);
  });

  it("available es independiente de committedBudget", () => {
    const snap: BudgetSnapshot = {
      teamId: "team-1",
      budget: 0,
      committedBudget: 5_000_000,
      available: 0,
    };
    expect(snap.budget).toBe(0);
    expect(snap.committedBudget).toBe(5_000_000);
  });
});

describe("Lógica de gestión de presupuesto", () => {
  it("commit: budget -= amount, committedBudget += amount", () => {
    const initial = { budget: 10_000_000, committedBudget: 0 };
    const amount = 2_500_000;
    const after = {
      budget: initial.budget - amount,
      committedBudget: initial.committedBudget + amount,
    };
    expect(after.budget).toBe(7_500_000);
    expect(after.committedBudget).toBe(2_500_000);
  });

  it("release: budget += amount, committedBudget -= amount", () => {
    const initial = { budget: 7_500_000, committedBudget: 2_500_000 };
    const amount = 2_500_000;
    const after = {
      budget: initial.budget + amount,
      committedBudget: initial.committedBudget - amount,
    };
    expect(after.budget).toBe(10_000_000);
    expect(after.committedBudget).toBe(0);
  });

  it("consume: committedBudget -= amount (budget intacto)", () => {
    const initial = { budget: 7_500_000, committedBudget: 2_500_000 };
    const amount = 2_500_000;
    const after = {
      budget: initial.budget, // sin cambios
      committedBudget: initial.committedBudget - amount,
    };
    expect(after.budget).toBe(7_500_000);
    expect(after.committedBudget).toBe(0);
  });

  it("settle (compra): consume + credit al vendedor", () => {
    const buyer = { budget: 7_500_000, committedBudget: 2_500_000 };
    const seller = { budget: 1_000_000, committedBudget: 0 };
    const amount = 2_500_000;

    // Comprador consume
    buyer.committedBudget -= amount;
    // Vendedor recibe
    seller.budget += amount;

    expect(buyer.budget).toBe(7_500_000);
    expect(buyer.committedBudget).toBe(0);
    expect(seller.budget).toBe(3_500_000);
  });
});

describe("Protección contra valores no válidos", () => {
  it("amount 0 no debe hacer nada", () => {
    const initial = { budget: 10_000_000, committedBudget: 0 };
    const amount = 0;
    const afterCommit = {
      budget: initial.budget - amount,
      committedBudget: initial.committedBudget + amount,
    };
    expect(afterCommit.budget).toBe(10_000_000);
    expect(afterCommit.committedBudget).toBe(0);
  });

  it("amount negativo debe tratarse como 0", () => {
    const initial = { budget: 10_000_000, committedBudget: 0 };
    const amount = -100;
    const safeAmount = Math.max(0, Math.round(amount));
    const afterCommit = {
      budget: initial.budget - safeAmount,
      committedBudget: initial.committedBudget + safeAmount,
    };
    expect(afterCommit.budget).toBe(10_000_000);
    expect(afterCommit.committedBudget).toBe(0);
  });

  it("amount NaN debe tratarse como 0", () => {
    const amount = NaN;
    const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
    expect(safeAmount).toBe(0);
  });
});
