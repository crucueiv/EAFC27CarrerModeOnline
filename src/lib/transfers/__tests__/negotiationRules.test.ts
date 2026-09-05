import { describe, it, expect } from "vitest";
import {
  addSimulatedDays,
  computeClubThresholds,
  computeCooldownExpiry,
  computeEmailExpiry,
  computePlayerImportance,
  effectiveMarketValue,
  effectiveReleaseClause,
  isCooldownActive,
  isEmailVisible,
  NEGOTIATION_COOLDOWN_DAYS,
  NEGOTIATION_EMAIL_EXPIRY_DAYS,
  pickEmailTemplate,
  RELEASE_CLAUSE_MULTIPLIER,
  resolveOfferEvaluation,
  valorTotalOferta,
  clampTension,
  type Oferta,
  type OfferPlayerContext,
} from "../negotiationRules";

function makeCtx(prices: Record<string, { marketValue: number; releaseClause?: number; listed?: boolean }>): OfferPlayerContext {
  return {
    marketValueOf: (p) => prices[p.id]?.marketValue ?? 0,
    releaseClauseOf: (p) => prices[p.id]?.releaseClause ?? null,
    isListedForSale: (p) => prices[p.id]?.listed ?? false,
  };
}

describe("computePlayerImportance", () => {
  it("prescindible cuando overall = teamMeanOverall, 0% starts, sin upside", () => {
    const imp = computePlayerImportance({
      overall: 75,
      teamMeanOverall: 75,
      startsRatio: 0,
      age: 26,
      potential: 75,
    });
    expect(imp).toBe(0);
  });

  it("indiscutible cuando overall >> teamMeanOverall, full starts, alto upside", () => {
    const imp = computePlayerImportance({
      overall: 90,
      teamMeanOverall: 60,
      startsRatio: 1,
      age: 21,
      potential: 95,
    });
    expect(imp).toBeGreaterThan(0.85);
  });

  it("veterano > 28 años: agePot = 0", () => {
    const imp = computePlayerImportance({
      overall: 85,
      teamMeanOverall: 70,
      startsRatio: 0.8,
      age: 33,
      potential: 85,
    });
    expect(imp).toBeLessThanOrEqual(0.55 * 1 + 0.3 * 0.8);
  });

  it("juvenil con upside: agePot > 0", () => {
    const imp = computePlayerImportance({
      overall: 75,
      teamMeanOverall: 75,
      startsRatio: 0,
      age: 19,
      potential: 92,
    });
    expect(imp).toBeGreaterThan(0);
  });

  it("resultado siempre en [0, 1]", () => {
    for (let i = 0; i < 50; i++) {
      const imp = computePlayerImportance({
        overall: 50 + i,
        teamMeanOverall: 75,
        startsRatio: i / 50,
        age: 18 + i,
        potential: 90,
      });
      expect(imp).toBeGreaterThanOrEqual(0);
      expect(imp).toBeLessThanOrEqual(1);
    }
  });
});

describe("computeClubThresholds", () => {
  it("lowballThreshold >= marketValue siempre", () => {
    for (let i = 0; i <= 10; i++) {
      const imp = i / 10;
      const t = computeClubThresholds(10_000_000, imp);
      expect(t.lowballThreshold).toBeGreaterThanOrEqual(10_000_000);
    }
  });

  it("hardline = true con importance >= 0.85", () => {
    expect(computeClubThresholds(10_000_000, 0.84).hardline).toBe(false);
    expect(computeClubThresholds(10_000_000, 0.85).hardline).toBe(true);
    expect(computeClubThresholds(10_000_000, 1).hardline).toBe(true);
  });

  it("counterDropFactor monótono decreciente con importance", () => {
    const a = computeClubThresholds(10_000_000, 0).counterDropFactor;
    const b = computeClubThresholds(10_000_000, 0.5).counterDropFactor;
    const c = computeClubThresholds(10_000_000, 1).counterDropFactor;
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
  });

  it("hangupAt monótono decreciente con importance", () => {
    const a = computeClubThresholds(10_000_000, 0).hangupAt;
    const b = computeClubThresholds(10_000_000, 0.5).hangupAt;
    const c = computeClubThresholds(10_000_000, 1).hangupAt;
    expect(a).toBeGreaterThanOrEqual(b);
    expect(b).toBeGreaterThanOrEqual(c);
    expect(c).toBeLessThanOrEqual(85);
  });
});

describe("valorTotalOferta", () => {
  it("solo dinero", () => {
    const r = valorTotalOferta({ dinero: 1_000_000, jugadoresOfrecidos: [] }, makeCtx({}));
    expect(r.total).toBe(1_000_000);
    expect(r.dinero).toBe(1_000_000);
    expect(r.jugadores).toEqual([]);
  });

  it("1 jugador sin clausula ni listado: factor 0.9", () => {
    const r = valorTotalOferta(
      { dinero: 0, jugadoresOfrecidos: [{ id: "p1" }] },
      makeCtx({ p1: { marketValue: 10_000_000 } }),
    );
    expect(r.total).toBe(9_000_000);
    expect(r.jugadores[0].factor).toBe(0.9);
  });

  it("jugador con cláusula > 1.5x marketValue: factor 0.95", () => {
    const r = valorTotalOferta(
      { dinero: 0, jugadoresOfrecidos: [{ id: "p1" }] },
      makeCtx({ p1: { marketValue: 10_000_000, releaseClause: 20_000_000 } }),
    );
    expect(r.total).toBe(9_500_000);
    expect(r.jugadores[0].factor).toBe(0.95);
  });

  it("jugador en lista de transferibles: factor 0.80", () => {
    const r = valorTotalOferta(
      { dinero: 0, jugadoresOfrecidos: [{ id: "p1" }] },
      makeCtx({ p1: { marketValue: 10_000_000, listed: true } }),
    );
    expect(r.total).toBe(8_000_000);
    expect(r.jugadores[0].factor).toBe(0.8);
  });

  it("mixto: dinero + jugadores", () => {
    const r = valorTotalOferta(
      {
        dinero: 5_000_000,
        jugadoresOfrecidos: [{ id: "p1" }, { id: "p2" }],
      },
      makeCtx({
        p1: { marketValue: 10_000_000 },
        p2: { marketValue: 20_000_000, releaseClause: 50_000_000 },
      }),
    );
    expect(r.total).toBe(5_000_000 + 9_000_000 + 19_000_000);
  });
});

describe("isEmailVisible", () => {
  const sentAt = new Date("2026-09-05T10:00:00Z");
  it("false si recipientCurrentDate < sentAt", () => {
    expect(isEmailVisible(new Date("2026-09-04T23:59:59Z"), sentAt)).toBe(false);
  });
  it("true si recipientCurrentDate >= sentAt", () => {
    expect(isEmailVisible(new Date("2026-09-05T10:00:00Z"), sentAt)).toBe(true);
    expect(isEmailVisible(new Date("2026-09-06T00:00:00Z"), sentAt)).toBe(true);
  });
});

describe("pickEmailTemplate", () => {
  const templates = [
    { id: "A" },
    { id: "B" },
    { id: "C" },
  ] as const;
  it("nunca devuelve lastTemplateId", () => {
    let rngState = 42;
    const rng = () => {
      rngState = (rngState * 9301 + 49297) % 233280;
      return rngState / 233280;
    };
    for (let i = 0; i < 1000; i++) {
      const result = pickEmailTemplate(templates as unknown as { id: string }[], "B", undefined, rng);
      expect(result.id).not.toBe("B");
    }
  });
  it("si N=1, devuelve esa", () => {
    const one = [{ id: "X" }];
    const result = pickEmailTemplate(one, "X");
    expect(result.id).toBe("X");
  });
  it("si lastTemplateId es null, elige cualquiera", () => {
    const result = pickEmailTemplate(templates as unknown as { id: string }[], null);
    expect(["A", "B", "C"]).toContain(result.id);
  });
});

describe("resolveOfferEvaluation", () => {
  const baseInput = {
    thresholds: computeClubThresholds(10_000_000, 0.5),
    currentTension: 20,
  };

  it("REJECT_IMMEDIATE en hardline con oferta muy baja", () => {
    const t = computeClubThresholds(10_000_000, 0.9);
    const r = resolveOfferEvaluation({ ...baseInput, thresholds: t, valorTotal: 1_000_000 });
    expect(r.kind).toBe("REJECT_IMMEDIATE");
  });

  it("LOWBALL puro: oferta por debajo de lowballThreshold", () => {
    const r = resolveOfferEvaluation({ ...baseInput, valorTotal: 5_000_000 });
    expect(r.kind).toBe("LOWBALL");
  });

  it("ACCEPT directo: oferta >= targetPrice", () => {
    const t = baseInput.thresholds;
    const r = resolveOfferEvaluation({ ...baseInput, valorTotal: t.targetPrice + 1 });
    expect(r.kind).toBe("ACCEPT");
  });

  it("COUNTER puro: entre lowball y target", () => {
    const t = baseInput.thresholds;
    const mid = (t.lowballThreshold + t.targetPrice) / 2;
    const r = resolveOfferEvaluation({ ...baseInput, valorTotal: mid });
    expect(r.kind).toBe("COUNTER");
    if (r.kind === "COUNTER") {
      expect(r.newCounter).toBeGreaterThanOrEqual(t.lowballThreshold);
    }
  });

  it("COUNTER que excede hangupAt marca wouldHangup=true", () => {
    const t = computeClubThresholds(10_000_000, 0.5);
    const mid = (t.lowballThreshold + t.targetPrice) / 2;
    const r = resolveOfferEvaluation({
      thresholds: t,
      currentTension: t.hangupAt - 5,
      valorTotal: mid,
    });
    expect(r.kind).toBe("COUNTER");
    if (r.kind === "COUNTER") {
      expect(r.wouldHangup).toBe(true);
    }
  });
});

describe("cooldown", () => {
  const startsAt = new Date("2026-09-05T00:00:00Z");
  it("computeCooldownExpiry = startsAt + 7d", () => {
    const exp = computeCooldownExpiry(startsAt);
    expect(exp.getUTCDate()).toBe(12);
  });
  it("isCooldownActive null = false", () => {
    expect(isCooldownActive(null, startsAt)).toBe(false);
  });
  it("isCooldownActive expirado = false", () => {
    expect(
      isCooldownActive(
        { expiresAt: new Date("2026-09-04T00:00:00Z") },
        startsAt,
      ),
    ).toBe(false);
  });
  it("isCooldownActive vigente = true", () => {
    expect(
      isCooldownActive(
        { expiresAt: new Date("2026-09-12T00:00:00Z") },
        startsAt,
      ),
    ).toBe(true);
  });
  it("exacto en expiresAt = false (estrictamente <)", () => {
    expect(isCooldownActive({ expiresAt: startsAt }, startsAt)).toBe(false);
  });
});

describe("constantes y helpers varios", () => {
  it("NEGOTIATION_COOLDOWN_DAYS = 7", () => {
    expect(NEGOTIATION_COOLDOWN_DAYS).toBe(7);
  });
  it("NEGOTIATION_EMAIL_EXPIRY_DAYS = 30", () => {
    expect(NEGOTIATION_EMAIL_EXPIRY_DAYS).toBe(30);
  });
  it("RELEASE_CLAUSE_MULTIPLIER = 1.9", () => {
    expect(RELEASE_CLAUSE_MULTIPLIER).toBe(1.9);
  });
  it("clampTension respeta 0..100", () => {
    expect(clampTension(-5)).toBe(0);
    expect(clampTension(50)).toBe(50);
    expect(clampTension(150)).toBe(100);
    expect(clampTension(NaN)).toBe(0);
  });
  it("effectiveMarketValue / effectiveReleaseClause", () => {
    expect(effectiveMarketValue({ marketValue: 10_000_000 })).toBe(10_000_000);
    expect(effectiveReleaseClause({ marketValue: 10_000_000 })).toBe(19_000_000);
  });
  it("computeEmailExpiry = sentAt + 30d", () => {
    const sentAt = new Date("2026-09-05T00:00:00Z");
    const exp = computeEmailExpiry(sentAt);
    expect(exp.getUTCDate()).toBe(new Date("2026-10-05T00:00:00Z").getUTCDate());
  });
  it("addSimulatedDays suma días sin mutar entrada", () => {
    const start = new Date("2026-09-05T00:00:00Z");
    const next = addSimulatedDays(start, 7);
    expect(next.getUTCDate()).toBe(12);
    expect(start.getUTCDate()).toBe(5);
  });
});
