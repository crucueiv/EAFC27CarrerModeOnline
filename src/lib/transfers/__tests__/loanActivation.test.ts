import { describe, it, expect } from "vitest";
import { computeLoanSchedule, computeLoanWageCost } from "../loanActivation";

describe("loanActivation - computeLoanSchedule", () => {
  const seasonStart = new Date("2026-08-01T00:00:00Z");
  const seasonEnd = new Date("2027-06-30T00:00:00Z");

  it("SHORT_TERM termina en season.endDate si la ventana está abierta", () => {
    const now = new Date("2027-03-01T00:00:00Z");
    const schedule = computeLoanSchedule({
      duration: "SHORT_TERM",
      seasonStartDate: seasonStart,
      seasonEndDate: seasonEnd,
      isTransferWindowOpen: true,
      now,
    });
    expect(schedule.startsAt.getTime()).toBe(now.getTime());
    expect(schedule.endsAt.getTime()).toBe(seasonEnd.getTime());
  });

  it("ONE_YEAR añade un año desde startsAt", () => {
    const now = new Date("2026-09-15T00:00:00Z");
    const schedule = computeLoanSchedule({
      duration: "ONE_YEAR",
      seasonStartDate: seasonStart,
      seasonEndDate: seasonEnd,
      isTransferWindowOpen: true,
      now,
    });
    const days = (schedule.endsAt.getTime() - schedule.startsAt.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(360);
    expect(days).toBeLessThanOrEqual(366);
  });

  it("TWO_YEARS añade dos años", () => {
    const now = new Date("2026-09-15T00:00:00Z");
    const schedule = computeLoanSchedule({
      duration: "TWO_YEARS",
      seasonStartDate: seasonStart,
      seasonEndDate: seasonEnd,
      isTransferWindowOpen: true,
      now,
    });
    const days = (schedule.endsAt.getTime() - schedule.startsAt.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(720);
  });

  it("si la ventana está cerrada, startsAt se programa al mes siguiente", () => {
    const now = new Date("2026-11-15T00:00:00Z");
    const schedule = computeLoanSchedule({
      duration: "ONE_YEAR",
      seasonStartDate: seasonStart,
      seasonEndDate: seasonEnd,
      isTransferWindowOpen: false,
      now,
    });
    expect(schedule.startsAt.getTime()).toBeGreaterThan(now.getTime());
  });
});

describe("loanActivation - computeLoanWageCost", () => {
  it("calcula el coste total: semanal * share% * semanas", () => {
    const cost = computeLoanWageCost(10_000, 50, 30);
    expect(cost).toBe(10_000 * 0.5 * 30);
  });

  it("share 100% paga todo el sueldo", () => {
    expect(computeLoanWageCost(8_000, 100, 10)).toBe(80_000);
  });

  it("share 0% paga nada", () => {
    expect(computeLoanWageCost(8_000, 0, 10)).toBe(0);
  });
});
