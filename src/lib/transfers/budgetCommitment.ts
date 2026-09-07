import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Helpers para gestionar el presupuesto de un club repartido entre:
 *  - budget: dinero líquido disponible para gastar o transferir.
 *  - committedBudget: dinero reservado por acuerdos en curso (cláusulas pagadas,
 *    traspasos acordados pendientes de firma, préstamos ACTIVOS, etc.).
 *
 * El dinero comprometido NO se ha gastado todavía pero no está disponible para
 * nuevas operaciones. Se devuelve a `budget` si la operación se cancela o se
 * consume definitivamente al consolidarse.
 */

type TeamClient = Prisma.TransactionClient | PrismaClient;

export type BudgetSnapshot = {
  teamId: string;
  budget: number;
  committedBudget: number;
  available: number;
};

function toInt(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

/**
 * Reserva una cantidad del presupuesto líquido: decrementa `budget` y aumenta
 * `committedBudget`. Devuelve la instantánea resultante del equipo.
 *
 * Se usa al:
 *  - Llegar a un acuerdo de traspaso con el club rival (AGREED_CLUB).
 *  - Pagar la cláusula de un jugador antes de negociar contrato.
 *  - Activar una cesión (el coste de la cesión se reserva del comprador).
 */
export async function commitBudget(
  tx: TeamClient,
  teamId: string,
  amount: number,
): Promise<BudgetSnapshot> {
  const safeAmount = toInt(amount);
  if (safeAmount <= 0) {
    return getBudgetSnapshot(tx, teamId);
  }
  const updated = await tx.team.update({
    where: { id: teamId },
    data: {
      budget: { decrement: safeAmount },
      committedBudget: { increment: safeAmount },
    },
    select: { id: true, budget: true, committedBudget: true },
  });
  return {
    teamId: updated.id,
    budget: updated.budget,
    committedBudget: updated.committedBudget,
    available: Math.max(0, updated.budget),
  };
}

/**
 * Devuelve una cantidad previamente comprometida al presupuesto líquido:
 * incrementa `budget` y decrementa `committedBudget`.
 *
 * Se usa al:
 *  - Cancelar una negociación o transferencia que estaba en estado de espera.
 *  - Expirar una oferta / cláusula que el jugador no llegó a firmar.
 *  - Colgar / rechazar antes de consolidar la operación.
 */
export async function releaseBudget(
  tx: TeamClient,
  teamId: string,
  amount: number,
): Promise<BudgetSnapshot> {
  const safeAmount = toInt(amount);
  if (safeAmount <= 0) {
    return getBudgetSnapshot(tx, teamId);
  }
  const updated = await tx.team.update({
    where: { id: teamId },
    data: {
      budget: { increment: safeAmount },
      committedBudget: { decrement: safeAmount },
    },
    select: { id: true, budget: true, committedBudget: true },
  });
  return {
    teamId: updated.id,
    budget: updated.budget,
    committedBudget: Math.max(0, updated.committedBudget),
    available: Math.max(0, updated.budget),
  };
}

/**
 * Consume definitivamente una cantidad del presupuesto comprometido: solo
 * decrementa `committedBudget` sin alterar `budget` (porque el dinero ya
 * salió de `budget` al hacer commit).
 *
 * Se usa al consolidarse definitivamente la operación: el club rival ya
 * recibió su parte (incremento de `budget` del vendedor) y el comprador
 * pierde definitivamente la reserva.
 */
export async function consumeBudget(
  tx: TeamClient,
  teamId: string,
  amount: number,
): Promise<BudgetSnapshot> {
  const safeAmount = toInt(amount);
  if (safeAmount <= 0) {
    return getBudgetSnapshot(tx, teamId);
  }
  const updated = await tx.team.update({
    where: { id: teamId },
    data: {
      committedBudget: { decrement: safeAmount },
    },
    select: { id: true, budget: true, committedBudget: true },
  });
  return {
    teamId: updated.id,
    budget: updated.budget,
    committedBudget: Math.max(0, updated.committedBudget),
    available: Math.max(0, updated.budget),
  };
}

/**
 * Acredita dinero a un club (no necesita estar comprometido) — usado para
 * pagar al vendedor en operaciones de compra / cláusula.
 */
export async function creditBudget(
  tx: TeamClient,
  teamId: string,
  amount: number,
): Promise<BudgetSnapshot> {
  const safeAmount = toInt(amount);
  if (safeAmount <= 0) {
    return getBudgetSnapshot(tx, teamId);
  }
  const updated = await tx.team.update({
    where: { id: teamId },
    data: { budget: { increment: safeAmount } },
    select: { id: true, budget: true, committedBudget: true },
  });
  return {
    teamId: updated.id,
    budget: updated.budget,
    committedBudget: updated.committedBudget,
    available: Math.max(0, updated.budget),
  };
}

/**
 * Devuelve la instantánea de presupuesto de un equipo. Por seguridad nunca
 * devuelve valores negativos.
 */
export async function getBudgetSnapshot(
  tx: TeamClient,
  teamId: string,
): Promise<BudgetSnapshot> {
  const team = await tx.team.findUnique({
    where: { id: teamId },
    select: { id: true, budget: true, committedBudget: true },
  });
  if (!team) {
    return { teamId, budget: 0, committedBudget: 0, available: 0 };
  }
  return {
    teamId: team.id,
    budget: Math.max(0, team.budget),
    committedBudget: Math.max(0, team.committedBudget),
    available: Math.max(0, team.budget),
  };
}

/**
 * Liquida un acuerdo entre dos clubes: el comprador consume el dinero
 * comprometido (el dinero ya salió de su `budget` al hacer commit) y el
 * vendedor recibe el pago en su `budget` líquido.
 *
 * Esta función se usa cuando el contrato se FIRMA definitivamente.
 */
export async function settleCommittedTransfer(args: {
  tx: TeamClient;
  buyerTeamId: string;
  sellerTeamId: string;
  amount: number;
}): Promise<{ buyer: BudgetSnapshot; seller: BudgetSnapshot }> {
  const [buyer, seller] = await Promise.all([
    consumeBudget(args.tx, args.buyerTeamId, args.amount),
    creditBudget(args.tx, args.sellerTeamId, args.amount),
  ]);
  return { buyer, seller };
}
