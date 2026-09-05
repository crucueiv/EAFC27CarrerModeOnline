import { describe, it, expect } from "vitest";
import {
  DURATION_LABELS,
  formatEuro,
  getRandomLoanQuote,
  computeLoanNegotiationParams,
  LOAN_QUOTE_BANKS,
  type LoanDuration,
  type LoanQuoteCategory,
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

  // BUG FIX (bug 4): los placeholders de contraoferta y manager deben
  // interpolarse correctamente, no quedar como literales en la UI.
  it("interpola counterWageShareBuyerPct en counterOfferWage", () => {
    const text = getRandomLoanQuote(
      "counterOfferWage",
      {
        player: "Pedri",
        wageShareBuyerPct: 25,
        counterWageShareBuyerPct: 55,
      },
      0,
    );
    expect(text).toContain("25");
    expect(text).toContain("55");
    expect(text).not.toContain("{counterWageShareBuyerPct}");
    expect(text).not.toContain("{wageShareBuyerPct}");
  });

  it("interpola counterBuyOptionPrice en counterOfferBuyOption", () => {
    const text = getRandomLoanQuote(
      "counterOfferBuyOption",
      {
        player: "Pedri",
        buyOptionPrice: 12_000_000,
        counterBuyOptionPrice: 25_000_000,
      },
      0,
    );
    // formatPrice produce "12.0M" / "25.0M"
    expect(text).toContain("12.0M");
    expect(text).toContain("25.0M");
    expect(text).not.toContain("{buyOptionPrice}");
    expect(text).not.toContain("{counterBuyOptionPrice}");
  });

  it("interpola player y durationLabel en rejectionDuration", () => {
    const text = getRandomLoanQuote("rejectionDuration", {
      player: "Pedri",
      duration: "ONE_YEAR",
    });
    expect(text).toContain("Pedri");
    expect(text).toContain(DURATION_LABELS.ONE_YEAR);
  });

  it("interpola {manager} en greeting cuando se proporciona", () => {
    const text = getRandomLoanQuote("greeting", {
      player: "Pedri",
      seller: "FC Barcelona",
      manager: "Xavi Hernández",
    });
    expect(text).toContain("Xavi Hernández");
    expect(text).not.toContain("{manager}");
  });

  it("lowballHangup interpola wageShareBuyerPct", () => {
    const text = getRandomLoanQuote(
      "lowballHangup",
      {
        player: "Pedri",
        wageShareBuyerPct: 20,
      },
      0,
    );
    expect(text).toContain("20");
    expect(text).not.toContain("{wageShareBuyerPct}");
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

  // BUG FIX (bug 4): la contraoferta del manager rival debe estar acotada
  // por el threshold lowball para que las plantillas puedan interpolar valores
  // coherentes.
  it("lowballWageThreshold siempre <= desiredWageShareBuyerPct", () => {
    for (let seed = 0; seed < 1; seed += 0.1) {
      const params = computeLoanNegotiationParams({ ...baseInput, randomSeed: seed });
      expect(params.lowballWageThreshold).toBeLessThanOrEqual(
        params.desiredWageShareBuyerPct,
      );
    }
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

describe("LOAN_QUOTE_BANKS (bug 4: pool ampliado)", () => {
  it("tiene al menos 5 frases por categoría para evitar sensación de bucle", () => {
    const categories: LoanQuoteCategory[] = [
      "greeting",
      "rejectionDuration",
      "rejectionWage",
      "rejectionBuyOption",
      "counterOfferWage",
      "counterOfferBuyOption",
      "highTensionWarning",
      "lowballHangup",
      "accepted",
      "maxTensionHangup",
    ];
    for (const c of categories) {
      expect(LOAN_QUOTE_BANKS[c].length).toBeGreaterThanOrEqual(5);
    }
  });
});
