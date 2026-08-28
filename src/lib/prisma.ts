import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = process.env.DATABASE_URL
  ? globalForPrisma.prisma ?? new PrismaClient()
  : null;

export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());

if (prisma && process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
