import type { NegotiationCooldownReason } from "@prisma/client";

export const NEGOTIATION_EMAIL_EXPIRY_DAYS = 30;
export const NEGOTIATION_COOLDOWN_DAYS = 7;
export const RELEASE_CLAUSE_MULTIPLIER = 1.9;

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function addSimulatedDays(startsAt: Date, days: number): Date {
  const next = new Date(startsAt.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export interface PlayerImportanceInput {
  overall: number;
  teamMeanOverall: number;
  startsRatio: number;
  age: number;
  potential: number;
}

export function computePlayerImportance(input: PlayerImportanceInput): number {
  const overallRel = clamp((input.overall - input.teamMeanOverall) / 15, 0, 1);
  const usoRel = clamp(input.startsRatio, 0, 1);
  const agePot = input.age < 28 ? clamp((input.potential - input.overall) / 20, 0, 1) : 0;
  return clamp(0.55 * overallRel + 0.3 * usoRel + 0.15 * agePot, 0, 1);
}

export interface ClubThresholds {
  lowballThreshold: number;
  targetPrice: number;
  counterDropFactor: number;
  tensionDeltaBase: number;
  hangupAt: number;
  hardline: boolean;
}

export function computeClubThresholds(
  marketValue: number,
  importance: number,
): ClubThresholds {
  const imp = clamp(importance, 0, 1);
  const rawLowball = marketValue * (0.9 + imp * 0.6);
  const lowballThreshold = Math.max(rawLowball, marketValue);
  const targetPrice = marketValue * (1.05 + imp * 0.45);
  return {
    lowballThreshold,
    targetPrice,
    counterDropFactor: 0.35 - imp * 0.3,
    tensionDeltaBase: 15 + imp * 20,
    hangupAt: Math.round(100 - imp * 15),
    hardline: imp >= 0.85,
  };
}

export interface PlayerForOffer {
  id: string;
}

export interface OfferPlayerContext {
  marketValueOf: (p: PlayerForOffer) => number;
  releaseClauseOf: (p: PlayerForOffer) => number | null;
  isListedForSale: (p: PlayerForOffer) => boolean;
}

export interface Oferta {
  dinero: number;
  jugadoresOfrecidos: PlayerForOffer[];
}

export interface ValorTotalBreakdown {
  total: number;
  dinero: number;
  jugadores: Array<{ playerId: string; marketValue: number; factor: number; contributed: number }>;
}

export function valorTotalOferta(oferta: Oferta, ctx: OfferPlayerContext): ValorTotalBreakdown {
  const jugadores = oferta.jugadoresOfrecidos.map((p) => {
    const mv = ctx.marketValueOf(p);
    const clause = ctx.releaseClauseOf(p);
    const listed = ctx.isListedForSale(p);
    let factor = 0.9;
    if (clause != null && clause > mv * 1.5) factor = 0.95;
    if (listed) factor = 0.8;
    return { playerId: p.id, marketValue: mv, factor, contributed: mv * factor };
  });
  const total =
    oferta.dinero + jugadores.reduce((s, j) => s + j.contributed, 0);
  return { total, dinero: oferta.dinero, jugadores };
}

export function isEmailVisible(recipientCurrentDate: Date, sentAt: Date): boolean {
  return recipientCurrentDate.getTime() >= sentAt.getTime();
}

export function pickEmailTemplate<T extends { id: string; kind?: string }>(
  templates: readonly T[],
  lastTemplateId: string | null,
  allowedKinds?: readonly ("TRANSFER" | "LOAN" | "BOTH")[],
  rng: () => number = Math.random,
): T {
  const kindFiltered =
    allowedKinds && allowedKinds.length > 0
      ? templates.filter((t) => !t.kind || allowedKinds.includes(t.kind as "TRANSFER" | "LOAN" | "BOTH"))
      : templates.slice();
  const basePool = kindFiltered.length > 0 ? kindFiltered : templates.slice();
  const candidates = lastTemplateId
    ? basePool.filter((t) => t.id !== lastTemplateId)
    : basePool.slice();
  const pool = candidates.length > 0 ? candidates : basePool.slice();
  return pool[Math.floor(rng() * pool.length)];
}

export type Evaluation =
  | { kind: "REJECT_IMMEDIATE"; reason: "IMPORTANCE_HARDLINE" }
  | { kind: "LOWBALL"; tensionDelta: number; wouldHangup: boolean }
  | { kind: "ACCEPT"; finalPrice: number }
  | { kind: "COUNTER"; tensionDelta: number; newCounter: number; wouldHangup: boolean };

export function resolveOfferEvaluation(input: {
  valorTotal: number;
  thresholds: ClubThresholds;
  currentTension: number;
}): Evaluation {
  const { valorTotal, thresholds, currentTension } = input;
  if (
    thresholds.hardline &&
    valorTotal < thresholds.targetPrice * 0.95
  ) {
    return { kind: "REJECT_IMMEDIATE", reason: "IMPORTANCE_HARDLINE" };
  }
  if (valorTotal < thresholds.lowballThreshold) {
    const tensionDelta = thresholds.tensionDeltaBase;
    return {
      kind: "LOWBALL",
      tensionDelta,
      wouldHangup: currentTension + tensionDelta >= thresholds.hangupAt,
    };
  }
  if (valorTotal >= thresholds.targetPrice) {
    return {
      kind: "ACCEPT",
      finalPrice: Math.max(valorTotal, thresholds.lowballThreshold),
    };
  }
  const gap = (thresholds.targetPrice - valorTotal) / thresholds.targetPrice;
  const tensionDelta = Math.round(thresholds.tensionDeltaBase + gap * 20);
  const newCounter = Math.max(
    thresholds.lowballThreshold,
    thresholds.targetPrice -
      (thresholds.targetPrice - valorTotal) * thresholds.counterDropFactor,
  );
  return {
    kind: "COUNTER",
    tensionDelta,
    newCounter,
    wouldHangup: currentTension + tensionDelta >= thresholds.hangupAt,
  };
}

export interface CooldownLike {
  expiresAt: Date;
}

export function isCooldownActive(
  cooldown: CooldownLike | null | undefined,
  currentDate: Date,
): boolean {
  if (!cooldown) return false;
  return currentDate.getTime() < cooldown.expiresAt.getTime();
}

export function computeCooldownExpiry(startsAt: Date): Date {
  return addSimulatedDays(startsAt, NEGOTIATION_COOLDOWN_DAYS);
}

export function computeEmailExpiry(sentAt: Date): Date {
  return addSimulatedDays(sentAt, NEGOTIATION_EMAIL_EXPIRY_DAYS);
}

export function clampTension(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function effectiveMarketValue(player: { marketValue: number }): number {
  return player.marketValue;
}

export function effectiveReleaseClause(player: { marketValue: number }): number {
  return player.marketValue * RELEASE_CLAUSE_MULTIPLIER;
}

export type CooldownReasonLiteral = "MANAGER_REJECTED" | "PLAYER_CONTRACT_REJECTED";

export const COOLDOWN_REASON: Record<CooldownReasonLiteral, NegotiationCooldownReason> = {
  MANAGER_REJECTED: "MANAGER_REJECTED",
  PLAYER_CONTRACT_REJECTED: "PLAYER_CONTRACT_REJECTED",
};
