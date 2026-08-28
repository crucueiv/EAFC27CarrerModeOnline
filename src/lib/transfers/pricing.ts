import type { Player as PrismaPlayer, RosterRole } from "@prisma/client";

export type Player = Pick<
  PrismaPlayer,
  | "marketValue"
  | "overall"
  | "potential"
  | "pace"
  | "shooting"
  | "passing"
  | "dribbling"
  | "defending"
  | "physical"
>;

export type PricingContext = {
  leagueName?: string | null;
  role?: RosterRole | null;
  performanceAverage?: number;
};

function leagueFactor(leagueName?: string | null) {
  const name = (leagueName ?? "").toLocaleLowerCase("es");
  if (/champions|premier|laliga|bundesliga|serie a|ligue 1/.test(name)) return 1.2;
  if (/segunda|championship|2\. bundesliga|serie b|ligue 2/.test(name)) return 0.82;
  return 1;
}

function roleFactor(role?: RosterRole | null) {
  return role === "CLAVE" ? 1.18 : role === "IMPORTANTE" ? 1.08 : 0.95;
}

/** Calculates a transfer value while preserving a player's stored market value as the baseline. */
export function calculatePlayerValue(player: Player, context: PricingContext = {}): number {
  const stats = [
    player.pace,
    player.shooting,
    player.passing,
    player.dribbling,
    player.defending,
    player.physical
  ];
  const averageStats = stats.reduce((sum, stat) => sum + stat, 0) / stats.length;
  const overallFactor = Math.max(0.5, player.overall / 75);
  const potentialFactor = 1 + Math.max(0, player.potential - player.overall) / 200;
  const statsFactor = 0.75 + averageStats / 400;
  const performanceFactor = 0.85 + Math.max(0, Math.min(10, context.performanceAverage ?? 6)) / 60;
  const value = player.marketValue * overallFactor * potentialFactor * statsFactor *
    leagueFactor(context.leagueName) * roleFactor(context.role) * performanceFactor;

  return Math.max(0, Math.round(value / 1000) * 1000);
}

export function calculateWeeklySalary(player: Player, context: PricingContext = {}): number {
  const value = calculatePlayerValue(player, context);
  return Math.max(500, Math.round((value * 0.012 * roleFactor(context.role)) / 100) * 100);
}
