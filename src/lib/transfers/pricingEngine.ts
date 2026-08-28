export type PricingPosition =
  | "ST" | "CF" | "LW" | "RW" | "CAM" | "CM"
  | "CB" | "LB" | "RB" | "LWB" | "RWB" | "GK"
  | string;

export type PricingRole = "Crucial" | "Important" | "Rotation" | "Sporadic" | "Prospect";

export interface PlayerPricingInput {
  overall: number;
  potential: number;
  age?: number;
  birthdate?: Date | string | null;
  position: PricingPosition;
  internationalReputation?: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  leagueFactor?: number;
  role?: PricingRole;
  matchRatings?: readonly number[];
}

export interface WageCalculationParams extends PlayerPricingInput {
  clubTier: number;
}

export interface FinancialBreakdown {
  marketValue: number;
  releaseClause: number;
  weeklyWage: number;
  baseValue: number;
  ageFactor: number;
  potentialFactor: number;
  positionFactor: number;
  reputationFactor: number;
  leagueFactor: number;
  roleFactor: number;
  performanceFactor: number;
  performanceAverage: number | null;
}

const POSITION_ALIASES: Record<string, PricingPosition> = {
  POR: "GK", GK: "GK", DFC: "CB", CB: "CB", LI: "LB", LB: "LB", LD: "RB", RB: "RB",
  CAI: "LWB", LWB: "LWB", CAD: "RWB", RWB: "RWB", MCD: "CM", CM: "CM", MC: "CM",
  MCO: "CAM", CAM: "CAM", EI: "LW", LW: "LW", ED: "RW", RW: "RW", DC: "ST", ST: "ST", CF: "CF"
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function resolveAge(player: PlayerPricingInput): number | undefined {
  if (player.age !== undefined && Number.isFinite(player.age)) return Math.max(0, player.age);
  if (!player.birthdate) return undefined;
  const birthdate = new Date(player.birthdate);
  if (Number.isNaN(birthdate.getTime())) return undefined;
  const now = new Date();
  let age = now.getUTCFullYear() - birthdate.getUTCFullYear();
  const birthdayPassed =
    now.getUTCMonth() > birthdate.getUTCMonth() ||
    (now.getUTCMonth() === birthdate.getUTCMonth() && now.getUTCDate() >= birthdate.getUTCDate());
  if (!birthdayPassed) age -= 1;
  return Math.max(0, age);
}

function ageFactor(age?: number): number {
  if (age === undefined) return 1;
  if (age < 22) return 1.15 + (22 - age) * 0.05;
  if (age <= 27) return 1 + (age - 22) * 0.02;
  return Math.max(0.2, 1 - (age - 28) * 0.08);
}

function positionFactor(position: PricingPosition): number {
  const resolved = POSITION_ALIASES[position.trim().toUpperCase()] ?? position.trim().toUpperCase();
  if (["ST", "CF", "LW", "RW"].includes(resolved)) return 1.2;
  if (["CAM", "CM"].includes(resolved)) return 1.05;
  if (["CB", "LB", "RB", "LWB", "RWB"].includes(resolved)) return 0.9;
  if (resolved === "GK") return 0.75;
  return 1;
}

function roleFactor(role?: PricingRole): number {
  switch (role) {
    case "Crucial": return 1.25;
    case "Important": return 1.1;
    case "Sporadic":
    case "Prospect": return 0.8;
    default: return 1;
  }
}

function reputationFactor(reputation = 1): number {
  return 1 + (clamp(reputation, 1, 5) - 1) * 0.08;
}

function performanceData(ratings?: readonly number[]) {
  const valid = (ratings ?? []).filter((rating) => Number.isFinite(rating));
  if (!valid.length) return { average: null, factor: 1 };
  const average = valid.reduce((sum, rating) => sum + clamp(rating, 0, 10), 0) / valid.length;
  return { average, factor: 0.9 + average / 60 };
}

function profileFactor(player: PlayerPricingInput): number {
  const weightedScore = (
    player.pace * 0.18 +
    player.shooting * 0.2 +
    player.passing * 0.16 +
    player.dribbling * 0.2 +
    player.defending * 0.13 +
    player.physical * 0.13
  );
  return 0.85 + clamp(weightedScore / 100, 0, 1) * 0.2;
}

function roundedCommercialValue(value: number): number {
  const step = value >= 150_000_000 ? 500_000
    : value >= 50_000_000 ? 250_000
    : value >= 10_000_000 ? 100_000
    : value >= 1_000_000 ? 25_000
    : 10_000;
  return Math.max(step, Math.round(value / step) * step);
}

export function calculatePlayerValue(player: PlayerPricingInput): number {
  const breakdown = calculatePlayerValueAndClause(player);
  return breakdown.marketValue;
}

export function calculateReleaseClause(marketValue: number): number {
  return roundedCommercialValue(Math.max(0, marketValue) * 1.9);
}

export function calculatePlayerWage(params: WageCalculationParams): number {
  const reputation = reputationFactor(params.internationalReputation);
  const performance = performanceData(params.matchRatings);
  const clubTier = 0.6 + (clamp(params.clubTier, 1, 5) - 1) * 0.2;
  const normalizedQuality = clamp((clamp(params.overall, 1, 99) - 50) / 49, 0, 1);
  const base = 20_000 + 800_000 * Math.pow(normalizedQuality, 4.5);
  const wage = (base * positionFactor(params.position) * reputation * clubTier * roleFactor(params.role) * performance.factor * profileFactor(params)) / 4;
  return Math.min(610_000, Math.max(0, Math.round(wage / 100) * 100));
}

export function calculatePlayerValueAndClause(player: PlayerPricingInput): FinancialBreakdown {
  const overall = clamp(player.overall, 1, 99);
  const normalizedQuality = clamp((overall - 50) / 49, 0, 1);
  const baseValue = 120_000 + 225_000_000 * Math.pow(normalizedQuality, 5.5);
  const potentialFactor = 1 + Math.max(0, player.potential - overall) / 45;
  const performance = performanceData(player.matchRatings);
  const eliteFactor = 1 + Math.pow(Math.max(0, overall - 85) / 14, 2) * 0.25;
  const marketValue = roundedCommercialValue(Math.min(172_500_000, (
    baseValue *
    ageFactor(resolveAge(player)) *
    potentialFactor *
    positionFactor(player.position) *
    reputationFactor(player.internationalReputation) *
    clamp(player.leagueFactor ?? 1, 0.5, 1.5) *
    performance.factor *
    profileFactor(player) *
    eliteFactor
  )));
  const role = player.role;
  return {
    marketValue,
    releaseClause: calculateReleaseClause(marketValue),
    weeklyWage: calculatePlayerWage({ ...player, clubTier: 3 }),
    baseValue,
    ageFactor: ageFactor(resolveAge(player)),
    potentialFactor,
    positionFactor: positionFactor(player.position),
    reputationFactor: reputationFactor(player.internationalReputation),
    leagueFactor: clamp(player.leagueFactor ?? 1, 0.5, 1.5),
    roleFactor: roleFactor(role),
    performanceFactor: performance.factor,
    performanceAverage: performance.average
  };
}

export function formatEuroCurrency(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(Math.max(0, value));
}

export const pricingExamples = {
  mbappe: calculatePlayerValueAndClause({
    overall: 91, potential: 95, age: 27, position: "ST", internationalReputation: 5,
    pace: 97, shooting: 91, passing: 80, dribbling: 92, defending: 29, physical: 76
  }),
  youngProspect: calculatePlayerValueAndClause({
    overall: 75, potential: 88, age: 18, position: "CAM", internationalReputation: 2,
    pace: 78, shooting: 70, passing: 80, dribbling: 82, defending: 40, physical: 55
  }),
  veteran: calculatePlayerValueAndClause({
    overall: 84, potential: 84, age: 35, position: "CB", internationalReputation: 4,
    pace: 55, shooting: 45, passing: 78, dribbling: 60, defending: 88, physical: 80
  })
} as const;
