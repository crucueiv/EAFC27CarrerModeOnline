import { describe, it, expect } from "vitest";
import {
  DURATION_LABELS,
  formatEuro,
  getRandomLoanQuote,
  computeLoanNegotiationParams,
  type LoanDuration,
} from "../loanNegotiationEngine";

describe("loanNegotiationEngine - getRandomLoanQuote", () => {
  it("reemplaza placeholders y devuelve texto", () => {
    const text = getRandomLoanQuote("greeting", {
      player: "Pedri",
      seller: "FC Barcelona",
    });
    expect(text.length).toBeGreaterThan(10);
    expect(text).not.toContain("{player}");
    expect(text).not.toContain("{seller}");
  });

  it("usa durationLabel para el placeholder {durationLabel}", () => {
    const text = getRandomLoanQuote("rejectionDuration", {
      player: "Pedri",
      duration: "TWO_YEARS",
    });
    expect(text).toContain(DURATION_LABELS.TWO_YEARS);
  });

  it("interpola wageShareBuyerPct y buyOptionPrice", () => {
    // Forzamos el índice 0 para evitar flakiness: ese template contiene ambos placeholders.
    const text = getRandomLoanQuote(
      "counterOfferWage",
      {
        player: "Pedri",
        wageShareBuyerPct: 30,
        counterWageShareBuyerPct: 60,
      },
      0,
    );
    expect(text).toContain("30");
    expect(text).toContain("60");
  });
});

describe("loanNegotiationEngine - computeLoanNegotiationParams", () => {
  const baseInput = {
    playerOverall: 75,
    playerPotential: 84,
    playerAge: 20,
    playerWeeklyWage: 50_000,
    playerMarketValue: 25_000_000,
    sellerTeamBudget: 200_000_000,
    buyerTeamBudget: 100_000_000,
    isShortTerm: false,
    hasBuyOption: true,
  };

  it("desiredWageShareBuyerPct está entre 30 y 70", () => {
    const params = computeLoanNegotiationParams(baseInput);
    expect(params.desiredWageShareBuyerPct).toBeGreaterThanOrEqual(30);
    expect(params.desiredWageShareBuyerPct).toBeLessThanOrEqual(70);
  });

  it("joven con alto potencial tiende a mayor desiredWageShareBuyerPct (seller pide más)", () => {
    const young = computeLoanNegotiationParams({ ...baseInput, playerAge: 20, randomSeed: 0.5 });
    const veteran = computeLoanNegotiationParams({ ...baseInput, playerAge: 32, randomSeed: 0.5 });
    expect(young.desiredWageShareBuyerPct).toBeGreaterThanOrEqual(
      veteran.desiredWageShareBuyerPct,
    );
  });

  it("buyOptionPrice basado en marketValue", () => {
    const params = computeLoanNegotiationParams(baseInput);
    expect(params.baseBuyOptionPrice).toBe(Math.round(25_000_000 * 1.7));
    expect(params.targetBuyOptionPrice).toBe(Math.round(25_000_000 * 2.1));
  });
});

describe("loanNegotiationEngine - formatEuro", () => {
  it("formatea euros con redondeo", () => {
    const result = formatEuro(1_500_000);
    expect(result).toMatch(/1\.500\.000\s*€|1,500,000\s*€/);
  });
});

describe("DURATION_LABELS", () => {
  it("tiene label para cada duración", () => {
    const keys: LoanDuration[] = ["SHORT_TERM", "ONE_YEAR", "TWO_YEARS"];
    for (const k of keys) {
      expect(DURATION_LABELS[k]).toBeTruthy();
    }
  });
});
