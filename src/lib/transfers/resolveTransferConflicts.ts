import type { RosterRole } from "@prisma/client";

export type TransferType =
  | "PERMANENT"
  | "LOAN_SHORT_TERM"
  | "LOAN_1_YEAR"
  | "LOAN_2_YEARS";

export type LoanType = "LOAN_SHORT_TERM" | "LOAN_1_YEAR" | "LOAN_2_YEARS";

export type NegotiationComparable = {
  id: string;
  playerId: string;
  type: TransferType;
  offeredWage: number;
  offeredContractYears: number | null;
  squadRole: RosterRole | null;
  agreedPrice: number;
  effectiveAt: Date;
  createdAt: Date;
};

export type NegotiationRank = {
  offerTypeScore: number;
  contractScore: number;
  roleScore: number;
  total: number;
};

const ROLE_SCORE: Record<RosterRole, number> = {
  CLAVE: 3,
  IMPORTANTE: 2,
  ROTACION: 1,
};

const LOAN_STABILITY: Record<LoanType, number> = {
  LOAN_2_YEARS: 3,
  LOAN_1_YEAR: 2,
  LOAN_SHORT_TERM: 1,
};

const PERMANENT_TYPE_BONUS = 1_000_000_000;
const LOAN_TYPE_BASE = 100_000_000;

export function computeRank(input: {
  type: TransferType;
  offeredWage: number;
  offeredContractYears: number | null;
  squadRole: RosterRole | null;
}): NegotiationRank {
  const offerTypeScore =
    input.type === "PERMANENT"
      ? PERMANENT_TYPE_BONUS
      : LOAN_TYPE_BASE + (LOAN_STABILITY[input.type] ?? 0);
  const contractScore = (input.offeredContractYears ?? 0) * 100 + input.offeredWage;
  const roleScore = input.squadRole ? ROLE_SCORE[input.squadRole] : 0;
  return {
    offerTypeScore,
    contractScore,
    roleScore,
    total: offerTypeScore + contractScore + roleScore,
  };
}

export type RankResult = {
  winner: NegotiationComparable;
  losers: NegotiationComparable[];
  ranks: Map<string, NegotiationRank>;
};

function sortCandidates(a: NegotiationComparable, b: NegotiationComparable): number {
  if (a.playerId !== b.playerId) {
    throw new Error("All candidates must belong to the same playerId");
  }
  const rankA = computeRank(a);
  const rankB = computeRank(b);
  if (rankA.total !== rankB.total) return rankB.total - rankA.total;

  if (a.type === "PERMANENT" && b.type === "PERMANENT") {
    if (a.offeredWage !== b.offeredWage) return b.offeredWage - a.offeredWage;
    const yearsA = a.offeredContractYears ?? 0;
    const yearsB = b.offeredContractYears ?? 0;
    if (yearsA !== yearsB) return yearsB - yearsA;
    return a.createdAt.getTime() - b.createdAt.getTime();
  }

  if (a.type !== "PERMANENT" && b.type !== "PERMANENT") {
    const loanA = a.type as LoanType;
    const loanB = b.type as LoanType;
    if (LOAN_STABILITY[loanA] !== LOAN_STABILITY[loanB]) {
      return LOAN_STABILITY[loanB] - LOAN_STABILITY[loanA];
    }
    if (a.agreedPrice !== b.agreedPrice) return b.agreedPrice - a.agreedPrice;
    if (a.offeredWage !== b.offeredWage) return b.offeredWage - a.offeredWage;
    return a.createdAt.getTime() - b.createdAt.getTime();
  }

  return 0;
}

export function rankNegotiations(input: {
  playerId: string;
  candidates: NegotiationComparable[];
}): RankResult | null {
  if (input.candidates.length === 0) return null;
  const samePlayer = input.candidates.every((c) => c.playerId === input.playerId);
  if (!samePlayer) {
    throw new Error("rankNegotiations: playerId mismatch in candidates");
  }

  const sorted = [...input.candidates].sort(sortCandidates);
  const winner = sorted[0];
  const losers = sorted.slice(1);

  const ranks = new Map<string, NegotiationRank>();
  for (const c of input.candidates) {
    ranks.set(c.id, computeRank(c));
  }
  return { winner, losers, ranks };
}

export function isPermanent(type: TransferType): boolean {
  return type === "PERMANENT";
}

export function isLoan(type: TransferType): type is LoanType {
  return type !== "PERMANENT";
}
