import { describe, it, expect } from "vitest";
import {
  isWithinTransferWindow,
  isPastTransferWindow,
  pureBuildSummerWindow,
  pureBuildWinterWindow,
  pureSeasonEnd,
  inferNextWindowFromCycle,
} from "@/lib/calendar/transferWindowResolver";

describe("transferWindowResolver (pure functions)", () => {
  it("summer window opens Jul 1 and closes Sep 1", () => {
    const w = pureBuildSummerWindow(2027);
    expect(w.opensAt.toISOString()).toBe("2027-07-01T00:00:00.000Z");
    expect(w.closesAt.toISOString()).toBe("2027-09-01T00:00:00.000Z");
  });

  it("winter window opens Jan 1 and closes Jan 31", () => {
    const w = pureBuildWinterWindow(2027);
    expect(w.opensAt.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(w.closesAt.toISOString()).toBe("2027-01-31T00:00:00.000Z");
  });

  it("season end is Jun 30", () => {
    const end = pureSeasonEnd(2027);
    expect(end.toISOString()).toBe("2027-06-30T00:00:00.000Z");
  });

  it("isWithinTransferWindow true inside", () => {
    const w = { id: "x", kind: "SUMMER" as const, opensAt: new Date("2027-07-01"), closesAt: new Date("2027-09-01"), seasonId: "s" };
    expect(isWithinTransferWindow(new Date("2027-07-15"), w)).toBe(true);
    expect(isWithinTransferWindow(new Date("2027-09-02"), w)).toBe(false);
    expect(isWithinTransferWindow(new Date("2027-06-30"), w)).toBe(false);
  });

  it("isPastTransferWindow true after closesAt", () => {
    const w = { id: "x", kind: "SUMMER" as const, opensAt: new Date("2027-07-01"), closesAt: new Date("2027-09-01"), seasonId: "s" };
    expect(isPastTransferWindow(new Date("2027-10-01"), w)).toBe(true);
    expect(isPastTransferWindow(new Date("2027-07-15"), w)).toBe(false);
  });

  it("inferNextWindowFromCycle: from October -> next winter (Jan 1 next year)", () => {
    const ref = new Date("2027-10-15T00:00:00.000Z");
    const next = inferNextWindowFromCycle(ref);
    expect(next.kind).toBe("WINTER");
    // En Oct 2027, el winter del cycle 2027 abre el 2028-01-01, por eso devuelve 2028-01-01.
    expect(next.opensAt.toISOString()).toBe("2028-01-01T00:00:00.000Z");
  });

  it("inferNextWindowFromCycle: from March -> summer same year", () => {
    const ref = new Date("2027-03-15T00:00:00.000Z");
    const next = inferNextWindowFromCycle(ref);
    expect(next.kind).toBe("SUMMER");
    expect(next.opensAt.getUTCFullYear()).toBe(2027);
  });
});
