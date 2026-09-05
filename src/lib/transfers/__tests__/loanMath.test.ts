import { describe, it, expect } from "vitest";
import {
  calculateLoanWageShare,
  calculateLoanWageCost,
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
