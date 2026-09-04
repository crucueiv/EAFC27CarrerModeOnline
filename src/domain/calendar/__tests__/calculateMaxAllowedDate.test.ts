import { describe, it, expect } from "vitest";
import {
  calculateMaxAllowedDatePure,
  type MaxAllowedInput,
} from "../calculateMaxAllowedDatePure";
import { utcMidnight } from "../utcDate";

const base: MaxAllowedInput = {
  now: utcMidnight(2027, 8, 15),
  seasonEndDate: utcMidnight(2027, 6, 30).getTime() < Date.UTC(2027, 8, 15)
    ? utcMidnight(2028, 6, 30)
    : utcMidnight(2027, 6, 30),
  currentDate: utcMidnight(2027, 8, 15),
};

describe("calculateMaxAllowedDatePure", () => {
  it("returns season end as cap when no other constraints exist", () => {
    const r = calculateMaxAllowedDatePure({
      ...base,
      seasonEndDate: utcMidnight(2027, 12, 31),
    });
    expect(r.reason).toBe("SEASON_END");
    expect(r.maxAllowedDate.toISOString()).toBe("2027-12-31T00:00:00.000Z");
  });

  it("caps at next match (CPU vs CPU)", () => {
    const r = calculateMaxAllowedDatePure({
      ...base,
      seasonEndDate: utcMidnight(2027, 12, 31),
      nextPendingMatch: {
        id: "m1",
        scheduledAt: utcMidnight(2027, 8, 22),
        mode: "CPU_VS_CPU",
      },
    });
    expect(r.reason).toBe("NEXT_MATCH");
    expect(r.maxAllowedDate.toISOString()).toBe("2027-08-22T00:00:00.000Z");
    expect(r.blockingDetails?.matchId).toBe("m1");
  });

  it("treats PvP matches as blocking with opponent user", () => {
    const r = calculateMaxAllowedDatePure({
      ...base,
      seasonEndDate: utcMidnight(2027, 12, 31),
      nextPendingMatch: {
        id: "m1",
        scheduledAt: utcMidnight(2027, 9, 1),
        mode: "PLAYER_VS_PLAYER",
        opponentManagerId: "user_opp",
      },
    });
    expect(r.reason).toBe("NEXT_MATCH");
    expect(r.maxAllowedDate.toISOString()).toBe("2027-09-01T00:00:00.000Z");
    expect(r.blockingDetails?.pendingUsers).toEqual(["user_opp"]);
  });

  it("stops the day before transfer window opens", () => {
    const r = calculateMaxAllowedDatePure({
      ...base,
      seasonEndDate: utcMidnight(2027, 12, 31),
      nextTransferWindowOpensAt: utcMidnight(2028, 1, 1),
    });
    expect(r.reason).toBe("TRANSFER_WINDOW_SYNC");
    expect(r.maxAllowedDate.toISOString()).toBe("2027-12-31T00:00:00.000Z");
    expect(r.blockingDetails?.transferWindowOpensAt).toBe("2028-01-01T00:00:00.000Z");
  });

  it("returns the most restrictive cap when multiple constraints coexist", () => {
    const r = calculateMaxAllowedDatePure({
      ...base,
      seasonEndDate: utcMidnight(2027, 12, 31),
      nextPendingMatch: {
        id: "m1",
        scheduledAt: utcMidnight(2027, 9, 5),
        mode: "CPU_VS_CPU",
      },
      nextTransferWindowOpensAt: utcMidnight(2027, 9, 10),
      pendingTournamentStageName: "Group Stage",
      pendingTournamentMinDate: utcMidnight(2027, 8, 20),
    });
    expect(r.reason).toBe("TOURNAMENT_PHASE");
    expect(r.maxAllowedDate.toISOString()).toBe("2027-08-20T00:00:00.000Z");
  });

  it("forces cap to currentDate when season has ended", () => {
    const r = calculateMaxAllowedDatePure({
      ...base,
      seasonEndDate: utcMidnight(2027, 6, 30),
      now: utcMidnight(2027, 7, 10),
    });
    expect(r.reason).toBe("SEASON_END");
    expect(r.maxAllowedDate.toISOString()).toBe("2027-07-10T00:00:00.000Z");
  });

  it("never returns a date earlier than currentDate", () => {
    const r = calculateMaxAllowedDatePure({
      ...base,
      currentDate: utcMidnight(2027, 8, 20),
      seasonEndDate: utcMidnight(2027, 8, 18),
    });
    expect(r.maxAllowedDate.toISOString()).toBe("2027-08-20T00:00:00.000Z");
  });
});
