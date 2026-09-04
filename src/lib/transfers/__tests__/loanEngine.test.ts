import { describe, it, expect } from "vitest";
import { computeLoanEndDate } from "@/lib/transfers/loanEngine";

const start = new Date("2027-08-15T00:00:00.000Z");

describe("computeLoanEndDate", () => {
  it("SHORT_TERM with season end in the future -> returns season end", () => {
    const seasonEnd = new Date("2028-06-30T00:00:00.000Z");
    const end = computeLoanEndDate({ startsAt: start, duration: "SHORT_TERM", seasonEndDate: seasonEnd });
    expect(end.toISOString()).toBe(seasonEnd.toISOString());
  });

  it("SHORT_TERM without season end -> +6 months", () => {
    const end = computeLoanEndDate({ startsAt: start, duration: "SHORT_TERM", seasonEndDate: null });
    const expected = new Date(start);
    expected.setUTCMonth(expected.getUTCMonth() + 6);
    expect(end.getTime()).toBe(expected.getTime());
  });

  it("ONE_YEAR -> +365 days", () => {
    const end = computeLoanEndDate({ startsAt: start, duration: "ONE_YEAR", seasonEndDate: null });
    const diff = end.getTime() - start.getTime();
    expect(diff).toBe(365 * 24 * 60 * 60 * 1000);
  });

  it("TWO_YEARS -> +730 days", () => {
    const end = computeLoanEndDate({ startsAt: start, duration: "TWO_YEARS", seasonEndDate: null });
    const diff = end.getTime() - start.getTime();
    expect(diff).toBe(2 * 365 * 24 * 60 * 60 * 1000);
  });
});
