import type { PrismaClient, Prisma, TransferWindow } from "@prisma/client";
import {
  addDaysUtc,
  getSeasonCycle,
  utcMidnight,
} from "@/domain/calendar/utcDate";

export type SeedTransferWindowsInput = {
  seasonId: string;
  seasonStartDate: Date;
  seasonEndDate: Date;
  now?: Date;
};

export type SeedTransferWindowsResult = {
  created: TransferWindow[];
  reused: TransferWindow[];
};

function asPrismaArg(input: SeedTransferWindowsInput): {
  seasonId: string;
  seasonStartDate: Date;
  seasonEndDate: Date;
  now: Date;
} {
  return { ...input, now: input.now ?? new Date() };
}

export async function seedTransferWindows(
  prisma: PrismaClient,
  input: SeedTransferWindowsInput,
): Promise<SeedTransferWindowsResult> {
  const args = asPrismaArg(input);
  if (!args.seasonStartDate || !args.seasonEndDate) {
    throw new Error("seedTransferWindows requires seasonStartDate and seasonEndDate");
  }

  const year = args.seasonStartDate.getUTCFullYear();
  const cycle = getSeasonCycle(year, args.now);

  const summerOpen = cycle.summerOpen.getTime() < args.seasonStartDate.getTime()
    ? args.seasonStartDate
    : cycle.summerOpen;
  const summerClose = cycle.summerClose.getTime() > args.seasonEndDate.getTime()
    ? args.seasonEndDate
    : cycle.summerClose;
  const winterOpen = cycle.winterOpen;
  const winterClose = addDaysUtc(winterOpen, 30);
  const winterCloseCapped = winterClose.getTime() > args.seasonEndDate.getTime()
    ? utcMidnight(year, 1, 31)
    : winterClose;

  const plan = [
    {
      kind: "SUMMER" as const,
      opensAt: summerOpen,
      closesAt: summerClose,
      opensOnboarding: true,
    },
    {
      kind: "WINTER" as const,
      opensAt: winterOpen,
      closesAt: winterCloseCapped,
      opensOnboarding: true,
    },
    {
      kind: "ONBOARDING_ONLY" as const,
      opensAt: args.seasonStartDate,
      closesAt: summerClose,
      opensOnboarding: true,
    },
  ];

  const created: TransferWindow[] = [];
  const reused: TransferWindow[] = [];

  for (const p of plan) {
    const existing = await prisma.transferWindow.findUnique({
      where: { seasonId_kind: { seasonId: args.seasonId, kind: p.kind } },
    });
    if (existing) {
      reused.push(existing);
      continue;
    }
    const data: Prisma.TransferWindowCreateInput = {
      kind: p.kind,
      status: "SCHEDULED",
      opensAt: p.opensAt,
      closesAt: p.closesAt,
      opensOnboarding: p.opensOnboarding,
      season: { connect: { id: args.seasonId } },
    };
    const w = await prisma.transferWindow.create({ data });
    created.push(w);
  }

  return { created, reused };
}
