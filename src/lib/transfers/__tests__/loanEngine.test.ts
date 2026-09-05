import { describe, it, expect, vi } from "vitest";
import {
  ACTIVE_LOAN_STATUSES,
  computeLoanEndDate,
  findActiveLoanForBuyer,
} from "@/lib/transfers/loanEngine";

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

describe("findActiveLoanForBuyer (bug 1: bloquea doble negociación)", () => {
  function makeMockPrisma(existing: { id: string; status: string } | null) {
    const findFirst = vi.fn().mockResolvedValue(existing);
    return { loan: { findFirst } } as unknown as Parameters<
      typeof findActiveLoanForBuyer
    >[0]["prismaClient"];
  }

  it("devuelve el loan activo cuando ya existe uno para el mismo (playerId, buyerTeamId)", async () => {
    const prisma = makeMockPrisma({ id: "loan-1", status: "PROPOSED" });
    const result = await findActiveLoanForBuyer({
      playerId: "p1",
      buyerTeamId: "t1",
      prismaClient: prisma,
    });
    expect(result).toEqual({ id: "loan-1", status: "PROPOSED" });
    const findFirst = (prisma as unknown as { loan: { findFirst: ReturnType<typeof vi.fn> } })
      .loan.findFirst;
    expect(findFirst).toHaveBeenCalledTimes(1);
    const args = findFirst.mock.calls[0][0];
    expect(args.where).toEqual({
      playerId: "p1",
      buyerTeamId: "t1",
      status: { in: [...ACTIVE_LOAN_STATUSES] },
    });
  });

  it("devuelve null cuando no hay loan activo (permite iniciar la cesión)", async () => {
    const prisma = makeMockPrisma(null);
    const result = await findActiveLoanForBuyer({
      playerId: "p1",
      buyerTeamId: "t1",
      prismaClient: prisma,
    });
    expect(result).toBeNull();
  });

  it("considera como activos los estados PROPOSED, COUNTERED, ACCEPTED, COMPLETED y BUY_OPTION_TRIGGERED", () => {
    expect(ACTIVE_LOAN_STATUSES).toContain("PROPOSED");
    expect(ACTIVE_LOAN_STATUSES).toContain("COUNTERED");
    expect(ACTIVE_LOAN_STATUSES).toContain("ACCEPTED");
    expect(ACTIVE_LOAN_STATUSES).toContain("COMPLETED");
    expect(ACTIVE_LOAN_STATUSES).toContain("BUY_OPTION_TRIGGERED");
    // Estados terminales que NO deben bloquear nuevas propuestas:
    expect(ACTIVE_LOAN_STATUSES).not.toContain("REJECTED");
    expect(ACTIVE_LOAN_STATUSES).not.toContain("CANCELLED");
    expect(ACTIVE_LOAN_STATUSES).not.toContain("EXPIRED");
    expect(ACTIVE_LOAN_STATUSES).not.toContain("RETURNED");
  });
});
