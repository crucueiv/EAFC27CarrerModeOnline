import type { PrismaClient, Prisma } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";

export type OwnershipResult =
  | { isOwn: true; teamId: string; reason: "ROSTER" | "LOAN" }
  | { isOwn: false };

export async function resolveUserClubTeamId(
  userId: string,
  prismaClient?: PrismaClient,
): Promise<string | null> {
  const prisma = prismaClient ?? defaultPrisma;
  if (!prisma) return null;

  const managed = await prisma.team.findFirst({
    where: { managerId: userId },
    select: { id: true },
  });
  if (managed) return managed.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { clubTeamId: true },
  });
  return user?.clubTeamId ?? null;
}

export async function isPlayerOnUserTeam(input: {
  playerId: string;
  userId: string;
  prismaClient?: PrismaClient;
}): Promise<OwnershipResult> {
  const prisma = input.prismaClient ?? defaultPrisma;
  if (!prisma) return { isOwn: false };

  const userTeamId = await resolveUserClubTeamId(input.userId, prisma);
  if (!userTeamId) return { isOwn: false };

  const activeRoster = await prisma.roster.findFirst({
    where: { playerId: input.playerId, isActive: true, teamId: userTeamId },
    select: { id: true },
  });
  if (activeRoster) {
    return { isOwn: true, teamId: userTeamId, reason: "ROSTER" };
  }

  const loaned = await prisma.player.findFirst({
    where: {
      id: input.playerId,
      isLoaned: true,
      loanedToTeamId: userTeamId,
    },
    select: { id: true },
  });
  if (loaned) {
    return { isOwn: true, teamId: userTeamId, reason: "LOAN" };
  }

  return { isOwn: false };
}

export type AssertNotOwnResult =
  | { ok: true }
  | { ok: false; reason: "PLAYER_ALREADY_OWNED"; teamId: string; ownership: "ROSTER" | "LOAN" };

export async function assertNotOwnPlayer(input: {
  playerId: string;
  userId: string;
  prismaClient?: PrismaClient | Prisma.TransactionClient;
}): Promise<AssertNotOwnResult> {
  const result = await isPlayerOnUserTeam({
    playerId: input.playerId,
    userId: input.userId,
    prismaClient: input.prismaClient as PrismaClient | undefined,
  });
  if (result.isOwn) {
    return {
      ok: false,
      reason: "PLAYER_ALREADY_OWNED",
      teamId: result.teamId,
      ownership: result.reason,
    };
  }
  return { ok: true };
}
