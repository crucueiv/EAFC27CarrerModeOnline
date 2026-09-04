import { describe, it, expect, beforeEach } from "vitest";
import { canUserAdvanceToDate } from "../canUserAdvanceToDate";

function makePrismaStub(overrides: Partial<{
  transferWindow: { opensAt: Date } | null;
}> = {}) {
  const base = {
    season: {
      findFirst: async () => ({
        id: "s1",
        endDate: new Date("2027-06-30T00:00:00Z"),
        startDate: new Date("2026-07-05T00:00:00Z"),
        careerGroupId: "cg1",
        status: "ACTIVE",
      }),
      findUnique: async () => ({
        id: "s1",
        endDate: new Date("2027-06-30T00:00:00Z"),
        careerGroupId: "cg1",
      }),
    },
    team: {
      findFirst: async () => ({ id: "t1", managerId: "u1" }),
      findUnique: async () => ({ id: "t1", managerId: "u1" }),
    },
    teamCalendarState: {
      findUnique: async () => null,
    },
    match: {
      findFirst: async () => null,
    },
    transferWindow: {
      findFirst: async () => overrides.transferWindow ?? null,
    },
    tournamentStage: {
      findMany: async () => [],
    },
  };
  return base as unknown as Parameters<typeof canUserAdvanceToDate>[0];
}

describe("canUserAdvanceToDate (smoke)", () => {
  let stub = makePrismaStub();
  beforeEach(() => {
    stub = makePrismaStub();
  });

  it("returns canAdvance=true with no transfer window pending and a far target", async () => {
    const result = await canUserAdvanceToDate(stub, {
      userId: "u1",
      careerGroupId: "cg1",
      now: new Date("2026-08-15T00:00:00Z"),
    });
    expect(result.canAdvance).toBe(true);
    expect(result.blockingReason).toBeUndefined();
  });

  it("blocks with TRANSFER_WINDOW_SYNC_WAIT when next window opens within horizon", async () => {
    const local = makePrismaStub({ transferWindow: { opensAt: new Date("2027-01-01T00:00:00Z") } });
    const result = await canUserAdvanceToDate(local, {
      userId: "u1",
      careerGroupId: "cg1",
      now: new Date("2026-12-20T00:00:00Z"),
    });
    expect(result.canAdvance).toBe(true);
    expect(result.maxAllowedDate.toISOString()).toBe("2026-12-31T00:00:00.000Z");
  });

  it("returns SEASON_END_LOCK if no ACTIVE season is found", async () => {
    const local = makePrismaStub();
    (local as any).season.findFirst = async () => null;
    const result = await canUserAdvanceToDate(local, {
      userId: "u1",
      careerGroupId: "cg1",
    });
    expect(result.canAdvance).toBe(false);
    expect(result.blockingReason).toBe("SEASON_END_LOCK");
  });

  it("returns SEASON_END_LOCK if user has no team in the group", async () => {
    const local = makePrismaStub();
    (local as any).team.findFirst = async () => null;
    const result = await canUserAdvanceToDate(local, {
      userId: "u1",
      careerGroupId: "cg1",
    });
    expect(result.canAdvance).toBe(false);
    expect(result.blockingReason).toBe("SEASON_END_LOCK");
  });
});
