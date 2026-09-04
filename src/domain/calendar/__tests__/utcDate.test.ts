import { describe, it, expect } from "vitest";
import {
  utcMidnight,
  addDaysUtc,
  isSameUtcDay,
  minDate,
  getSeasonCycle,
  resolveSeasonForDate,
  SEASON_END_MONTH,
  SEASON_END_DAY,
  SEASON_START_MONTH,
  SEASON_START_DAY,
} from "../utcDate";

describe("utcMidnight", () => {
  it("returns UTC midnight for a valid date", () => {
    const d = utcMidnight(2027, 7, 1);
    expect(d.toISOString()).toBe("2027-07-01T00:00:00.000Z");
  });

  it("throws on non-integer month", () => {
    expect(() => utcMidnight(2027, 7.5, 1)).toThrow();
  });

  it("throws on out-of-range values", () => {
    expect(() => utcMidnight(2027, 13, 1)).toThrow();
    expect(() => utcMidnight(2027, 1, 0)).toThrow();
  });
});

describe("addDaysUtc", () => {
  it("adds positive days without drifting time of day", () => {
    const start = utcMidnight(2027, 7, 1);
    const after = addDaysUtc(start, 5);
    expect(after.toISOString()).toBe("2027-07-06T00:00:00.000Z");
  });

  it("handles month boundaries", () => {
    const start = utcMidnight(2027, 6, 29);
    expect(addDaysUtc(start, 2).toISOString()).toBe("2027-07-01T00:00:00.000Z");
  });

  it("handles negative offsets", () => {
    const start = utcMidnight(2027, 1, 2);
    expect(addDaysUtc(start, -1).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("isSameUtcDay", () => {
  it("matches the same calendar day regardless of hour", () => {
    const a = new Date("2027-07-01T00:00:00.000Z");
    const b = new Date("2027-07-01T23:59:59.000Z");
    expect(isSameUtcDay(a, b)).toBe(true);
  });

  it("differs across day boundaries", () => {
    const a = new Date("2027-07-01T23:59:59.000Z");
    const b = new Date("2027-07-02T00:00:00.000Z");
    expect(isSameUtcDay(a, b)).toBe(false);
  });
});

describe("minDate", () => {
  it("returns the smallest non-null date", () => {
    const a = new Date("2027-07-10T00:00:00Z");
    const b = new Date("2027-07-01T00:00:00Z");
    const c = new Date("2027-07-05T00:00:00Z");
    expect(minDate(a, b, c).toISOString()).toBe(b.toISOString());
  });

  it("ignores null entries", () => {
    const a = new Date("2027-07-10T00:00:00Z");
    expect(minDate(null, a, null).toISOString()).toBe(a.toISOString());
  });

  it("throws when all entries are null", () => {
    expect(() => minDate(null, undefined)).toThrow();
  });
});

describe("getSeasonCycle", () => {
  it("returns canonical dates for a given year", () => {
    const cycle = getSeasonCycle(2027);
    expect(cycle.startDate.getUTCMonth() + 1).toBe(SEASON_START_MONTH);
    expect(cycle.startDate.getUTCDate()).toBe(SEASON_START_DAY);
    expect(cycle.endDate.getUTCMonth() + 1).toBe(SEASON_END_MONTH);
    expect(cycle.endDate.getUTCDate()).toBe(SEASON_END_DAY);
    expect(cycle.summerOpen.toISOString()).toBe("2027-07-01T00:00:00.000Z");
    expect(cycle.summerClose.toISOString()).toBe("2027-09-01T00:00:00.000Z");
    expect(cycle.winterOpen.toISOString()).toBe("2028-01-01T00:00:00.000Z");
    expect(cycle.winterClose.toISOString()).toBe("2028-01-31T00:00:00.000Z");
  });

  it("marks transition window from endDate (30 jun) to startDate-1 (4 jul)", () => {
    const cycle = getSeasonCycle(2027);
    expect(cycle.transitionStart.toISOString()).toBe("2027-06-30T00:00:00.000Z");
    expect(cycle.transitionEnd.toISOString()).toBe("2027-07-04T00:00:00.000Z");
  });
});

describe("resolveSeasonForDate", () => {
  it("maps a July date to the current cycle", () => {
    const d = new Date("2027-07-15T00:00:00Z");
    const { cycle, isOffSeason } = resolveSeasonForDate(d);
    expect(isOffSeason).toBe(false);
    expect(cycle.startDate.toISOString()).toBe("2027-07-05T00:00:00.000Z");
  });

  it("maps a March date to the current cycle", () => {
    const d = new Date("2027-03-15T00:00:00Z");
    const { cycle, isOffSeason } = resolveSeasonForDate(d);
    expect(isOffSeason).toBe(false);
    expect(cycle.startDate.getUTCFullYear()).toBe(2026);
  });

  it("returns the next cycle when in off-season (Aug prev year)", () => {
    const d = new Date("2027-08-15T00:00:00Z");
    const { cycle, isOffSeason } = resolveSeasonForDate(d);
    expect(isOffSeason).toBe(false);
    expect(cycle.startDate.getUTCFullYear()).toBe(2027);
  });
});
