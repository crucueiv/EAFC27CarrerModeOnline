import { Prisma, type PrismaClient } from "@prisma/client";

export type PrismaTx = Prisma.TransactionClient;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 50;

const SLEEP = (ms: number) => new Promise((res) => setTimeout(res, ms));

function isSerializationError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const code = (e as { code?: string }).code;
  return code === "P2034" || code === "40001";
}

export async function withSerializableTransaction<T>(
  prisma: PrismaClient,
  fn: (tx: PrismaTx) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 15000,
      });
    } catch (err) {
      lastError = err;
      if (!isSerializationError(err)) throw err;
      await SLEEP(RETRY_DELAY_MS * Math.pow(2, attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Transaction failed after retries");
}

export async function lockTeamCalendarState(
  tx: PrismaTx,
  teamId: string,
  seasonId: string,
): Promise<void> {
  await tx.$queryRaw<unknown[]>(
    Prisma.sql`SELECT id FROM "TeamCalendarState" WHERE "teamId" = ${teamId} AND "seasonId" = ${seasonId} FOR UPDATE`,
  );
}

export async function lockMatch(tx: PrismaTx, matchId: string): Promise<void> {
  await tx.$queryRaw<unknown[]>(
    Prisma.sql`SELECT id FROM "Match" WHERE "id" = ${matchId} FOR UPDATE`,
  );
}

export async function lockSeason(tx: PrismaTx, seasonId: string): Promise<void> {
  await tx.$queryRaw<unknown[]>(
    Prisma.sql`SELECT id FROM "Season" WHERE "id" = ${seasonId} FOR UPDATE`,
  );
}

export async function withTeamCalendarLock<T>(
  prisma: PrismaClient,
  teamId: string,
  seasonId: string,
  fn: (tx: PrismaTx) => Promise<T>,
): Promise<T> {
  return withSerializableTransaction(prisma, async (tx) => {
    await lockTeamCalendarState(tx, teamId, seasonId);
    return fn(tx);
  });
}

export async function withMatchAndTeamsLock<T>(
  prisma: PrismaClient,
  matchId: string,
  fn: (tx: PrismaTx) => Promise<T>,
): Promise<T> {
  return withSerializableTransaction(prisma, async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      select: { homeTeamId: true, awayTeamId: true, seasonId: true },
    });
    if (!match) throw new Error(`Match not found: ${matchId}`);
    await lockMatch(tx, matchId);
    await lockTeamCalendarState(tx, match.homeTeamId, match.seasonId);
    await lockTeamCalendarState(tx, match.awayTeamId, match.seasonId);
    return fn(tx);
  });
}
