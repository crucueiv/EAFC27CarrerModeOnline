import { describe, it, expect } from "vitest";
import {
  rankNegotiations,
  computeRank,
  isPermanent,
  isLoan,
  type NegotiationComparable,
} from "@/lib/transfers/resolveTransferConflicts";

const baseDate = new Date("2027-01-15T00:00:00.000Z");
const baseCreated = new Date("2027-01-01T00:00:00.000Z");

function n(input: Partial<NegotiationComparable> & { id: string; type: NegotiationComparable["type"] }): NegotiationComparable {
  return {
    playerId: "p1",
    offeredWage: 50_000,
    offeredContractYears: 4,
    squadRole: "ROTACION",
    agreedPrice: 1_000_000,
    effectiveAt: baseDate,
    createdAt: baseCreated,
    ...input,
  };
}

describe("resolveTransferConflicts", () => {
  it("PERMANENT wins over LOAN_*", () => {
    const loan = n({ id: "loan", type: "LOAN_1_YEAR", offeredWage: 500_000 });
    const perm = n({ id: "perm", type: "PERMANENT", offeredWage: 1_000 });
    const r = rankNegotiations({ playerId: "p1", candidates: [loan, perm] });
    expect(r?.winner.id).toBe("perm");
    expect(r?.losers.map((l) => l.id)).toEqual(["loan"]);
  });

  it("between two PERMANENT offers, higher wage wins", () => {
    const low = n({ id: "low", type: "PERMANENT", offeredWage: 50_000 });
    const high = n({ id: "high", type: "PERMANENT", offeredWage: 200_000 });
    const r = rankNegotiations({ playerId: "p1", candidates: [low, high] });
    expect(r?.winner.id).toBe("high");
  });

  it("between two PERMANENT offers with same wage, longer contract wins", () => {
    const a = n({ id: "a", type: "PERMANENT", offeredWage: 50_000, offeredContractYears: 2 });
    const b = n({ id: "b", type: "PERMANENT", offeredWage: 50_000, offeredContractYears: 5 });
    const r = rankNegotiations({ playerId: "p1", candidates: [a, b] });
    expect(r?.winner.id).toBe("b");
  });

  it("between two PERMANENT offers with same wage/years, better squadRole wins", () => {
    const a = n({ id: "a", type: "PERMANENT", offeredWage: 50_000, offeredContractYears: 4, squadRole: "ROTACION" });
    const b = n({ id: "b", type: "PERMANENT", offeredWage: 50_000, offeredContractYears: 4, squadRole: "CLAVE" });
    const r = rankNegotiations({ playerId: "p1", candidates: [a, b] });
    expect(r?.winner.id).toBe("b");
  });

  it("between LOAN offers, longer duration wins", () => {
    const short = n({ id: "short", type: "LOAN_SHORT_TERM", offeredWage: 50_000 });
    const two = n({ id: "two", type: "LOAN_2_YEARS", offeredWage: 50_000 });
    const r = rankNegotiations({ playerId: "p1", candidates: [short, two] });
    expect(r?.winner.id).toBe("two");
  });

  it("throws when playerId mismatch", () => {
    const a = n({ id: "a", type: "PERMANENT", playerId: "p1" });
    const b = n({ id: "b", type: "PERMANENT", playerId: "p2" });
    expect(() => rankNegotiations({ playerId: "p1", candidates: [a, b] })).toThrow();
  });

  it("computeRank: PERMANENT >> any loan", () => {
    const perm = computeRank({ type: "PERMANENT", offeredWage: 0, offeredContractYears: 0, squadRole: null });
    const loan = computeRank({ type: "LOAN_2_YEARS", offeredWage: 999_999, offeredContractYears: 99, squadRole: "CLAVE" });
    expect(perm.total).toBeGreaterThan(loan.total);
  });

  it("isPermanent / isLoan typeguards", () => {
    expect(isPermanent("PERMANENT")).toBe(true);
    expect(isLoan("LOAN_1_YEAR")).toBe(true);
    expect(isLoan("PERMANENT")).toBe(false);
  });

  it("returns null for empty candidates", () => {
    const r = rankNegotiations({ playerId: "p1", candidates: [] });
    expect(r).toBeNull();
  });
});
