import { describe, it, expect } from "vitest";
import { evaluateLoanWageOffer } from "@/lib/transfers/loanNegotiationEngine";

const baseParams = {
  baseWageShareBuyerPct: 50,
  desiredWageShareBuyerPct: 60,
  lowballWageThreshold: 30,
  baseBuyOptionPrice: 0,
  targetBuyOptionPrice: 0,
  lowballBuyOptionThreshold: 0,
};

describe("evaluateLoanWageOffer", () => {
  it("cuelga si la oferta es inferior al lowball threshold", () => {
    const r = evaluateLoanWageOffer(20, baseParams);
    expect(r.shouldHangUp).toBe(true);
    expect(r.autoAccept).toBe(false);
    expect(r.tensionDelta).toBe(100);
  });

  it("auto-acepta si la oferta iguala o supera el desired", () => {
    const r = evaluateLoanWageOffer(60, baseParams);
    expect(r.shouldHangUp).toBe(false);
    expect(r.autoAccept).toBe(true);
    expect(r.tensionDelta).toBe(-100);
  });

  it("mayor porcentaje = menor tensión", () => {
    const low = evaluateLoanWageOffer(31, baseParams);
    const high = evaluateLoanWageOffer(55, baseParams);
    expect(high.tensionDelta).toBeLessThan(low.tensionDelta);
  });

  it("counter del vendedor nunca excede desired", () => {
    const r = evaluateLoanWageOffer(35, baseParams);
    if (r.counterWageShareBuyerPct !== null) {
      expect(r.counterWageShareBuyerPct).toBeLessThanOrEqual(baseParams.desiredWageShareBuyerPct);
    }
  });

  it("counter siempre supera la oferta del comprador (lógica de regateo)", () => {
    const r = evaluateLoanWageOffer(35, baseParams);
    if (r.counterWageShareBuyerPct !== null) {
      expect(r.counterWageShareBuyerPct).toBeGreaterThanOrEqual(35);
    }
  });

  it("closeness = 1 cuando la oferta iguala el desired", () => {
    const r = evaluateLoanWageOffer(60, baseParams);
    expect(r.closeness).toBeCloseTo(1, 5);
  });
});
