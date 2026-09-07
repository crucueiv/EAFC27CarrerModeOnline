import { describe, it, expect } from "vitest";
import {
  calculateLoanWageShare,
  calculateLoanWageCost,
  calculateLoanFinancialBreakdown,
  calculateLoanWeeks,
  clampPercent,
} from "@/lib/transfers/loanEngine";

describe("calculateLoanWageShare", () => {
  it("calcula el porcentaje correctamente", () => {
    expect(calculateLoanWageShare(100_000, 50)).toBe(50_000);
    expect(calculateLoanWageShare(100_000, 80)).toBe(80_000);
    expect(calculateLoanWageShare(100_000, 20)).toBe(20_000);
  });

  it("redondea al entero más cercano", () => {
    expect(calculateLoanWageShare(33_333, 33)).toBe(11_000);
  });

  it("protege contra porcentajes fuera de rango", () => {
    expect(calculateLoanWageShare(100_000, -10)).toBe(0);
    expect(calculateLoanWageShare(100_000, 150)).toBe(100_000);
  });

  it("devuelve 0 si weeklyWage es inválido", () => {
    expect(calculateLoanWageShare(0, 50)).toBe(0);
    expect(calculateLoanWageShare(-1, 50)).toBe(0);
    expect(calculateLoanWageShare(NaN, 50)).toBe(0);
  });
});

describe("calculateLoanWageCost", () => {
  it("extiende calculateLoanWageShare por N semanas", () => {
    expect(calculateLoanWageCost(10_000, 50, 4)).toBe(20_000);
    expect(calculateLoanWageCost(10_000, 100, 12)).toBe(120_000);
  });

  it("asegura al menos 1 semana", () => {
    expect(calculateLoanWageCost(10_000, 50, 0)).toBe(5_000);
    expect(calculateLoanWageCost(10_000, 50, -3)).toBe(5_000);
  });
});

describe("calculateLoanFinancialBreakdown", () => {
  it("devuelve el desglose completo correctamente", () => {
    const result = calculateLoanFinancialBreakdown({
      weeklyWage: 10_000,
      wageShareBuyerPct: 50,
      weeks: 4,
      buyOptionPrice: 1_000_000,
    });
    expect(result.weeklyWage).toBe(10_000);
    expect(result.buyerWeeklyWage).toBe(5_000);
    expect(result.totalWageCost).toBe(20_000);
    expect(result.buyOptionPrice).toBe(1_000_000);
    expect(result.totalLoanCost).toBe(1_020_000);
  });

  it("maneja correctamente weeks <= 0 (asegura mínimo 1)", () => {
    const result = calculateLoanFinancialBreakdown({
      weeklyWage: 10_000,
      wageShareBuyerPct: 50,
      weeks: 0,
    });
    expect(result.totalWageCost).toBe(5_000);
  });

  it("sin opción de compra devuelve 0 en buyOptionPrice", () => {
    const result = calculateLoanFinancialBreakdown({
      weeklyWage: 10_000,
      wageShareBuyerPct: 50,
      weeks: 4,
    });
    expect(result.buyOptionPrice).toBe(0);
    expect(result.totalLoanCost).toBe(20_000);
  });

  it("protege contra weeklyWage inválido", () => {
    const result = calculateLoanFinancialBreakdown({
      weeklyWage: NaN,
      wageShareBuyerPct: 50,
      weeks: 4,
    });
    expect(result.weeklyWage).toBe(0);
    expect(result.buyerWeeklyWage).toBe(0);
    expect(result.totalWageCost).toBe(0);
  });
});

describe("calculateLoanWeeks", () => {
  it("calcula semanas entre dos fechas", () => {
    const start = new Date("2025-01-01");
    const end = new Date("2025-01-29"); // 28 días
    expect(calculateLoanWeeks(start, end)).toBe(4);
  });

  it("devuelve al menos 1 semana si hay diferencia", () => {
    const start = new Date("2025-01-01");
    const end = new Date("2025-01-02");
    expect(calculateLoanWeeks(start, end)).toBe(1);
  });

  it("devuelve 0 si la fecha final es anterior a la inicial", () => {
    const start = new Date("2025-01-10");
    const end = new Date("2025-01-01");
    expect(calculateLoanWeeks(start, end)).toBe(0);
  });

  it("devuelve 0 con fechas inválidas", () => {
    expect(calculateLoanWeeks(new Date("invalid"), new Date("2025-01-01"))).toBe(0);
    expect(calculateLoanWeeks(new Date("2025-01-01"), new Date("invalid"))).toBe(0);
  });
});

describe("clampPercent", () => {
  it("recorta a [0, 100]", () => {
    expect(clampPercent(0)).toBe(0);
    expect(clampPercent(50)).toBe(50);
    expect(clampPercent(100)).toBe(100);
    expect(clampPercent(-10)).toBe(0);
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(NaN)).toBe(0);
  });
});
