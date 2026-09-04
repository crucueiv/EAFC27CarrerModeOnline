import { prisma } from "@/lib/prisma";
import { FORMATIONS_BY_ID, BENCH_SIZE } from "@/lib/constants/formations";

export type LineupSlotInput = {
  slotIndex: number;
  playerId: string;
};

export type LineupBenchInput = {
  order: number;
  playerId: string;
};

export type UpsertLineupInput = {
  teamId: string;
  matchId?: string | null;
  formationId: string;
  name?: string | null;
  isDefault: boolean;
  slots: LineupSlotInput[];
  bench: LineupBenchInput[];
};

export type LineupValidationError = string;

export function validateLineupPayload(payload: unknown): {
  ok: true;
  data: UpsertLineupInput;
} | {
  ok: false;
  error: LineupValidationError;
} {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Payload inválido" };
  }
  const p = payload as Record<string, unknown>;

  if (typeof p.teamId !== "string" || !p.teamId) {
    return { ok: false, error: "Falta teamId" };
  }
  if (typeof p.formationId !== "string" || !p.formationId) {
    return { ok: false, error: "Falta formationId" };
  }
  if (!FORMATIONS_BY_ID[p.formationId]) {
    return { ok: false, error: "Formación desconocida" };
  }

  const matchId = p.matchId == null ? null : String(p.matchId);
  const isDefault = Boolean(p.isDefault);
  if (isDefault && matchId) {
    return { ok: false, error: "Una alineación default no puede tener matchId" };
  }

  const name = p.name == null ? null : String(p.name);

  if (!Array.isArray(p.slots) || p.slots.length !== 11) {
    return { ok: false, error: "La alineación debe tener exactamente 11 titulares" };
  }
  const slots: LineupSlotInput[] = [];
  const usedSlotIndexes = new Set<number>();
  const usedPlayerIds = new Set<string>();
  for (const s of p.slots) {
    if (!s || typeof s !== "object") {
      return { ok: false, error: "Slot inválido" };
    }
    const slotIndex = Number((s as Record<string, unknown>).slotIndex);
    const playerId = String((s as Record<string, unknown>).playerId ?? "");
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 10) {
      return { ok: false, error: "slotIndex fuera de rango (0-10)" };
    }
    if (!playerId) {
      return { ok: false, error: "Falta playerId en un slot" };
    }
    if (usedSlotIndexes.has(slotIndex)) {
      return { ok: false, error: "slotIndex duplicado" };
    }
    if (usedPlayerIds.has(playerId)) {
      return { ok: false, error: "Un jugador no puede estar dos veces en el once" };
    }
    usedSlotIndexes.add(slotIndex);
    usedPlayerIds.add(playerId);
    slots.push({ slotIndex, playerId });
  }

  if (!Array.isArray(p.bench) || p.bench.length > BENCH_SIZE) {
    return { ok: false, error: `El banquillo admite como máximo ${BENCH_SIZE} jugadores` };
  }
  const bench: LineupBenchInput[] = [];
  const usedBenchOrders = new Set<number>();
  for (const b of p.bench) {
    if (!b || typeof b !== "object") {
      return { ok: false, error: "Suplente inválido" };
    }
    const order = Number((b as Record<string, unknown>).order);
    const playerId = String((b as Record<string, unknown>).playerId ?? "");
    if (!Number.isInteger(order) || order < 0 || order >= BENCH_SIZE) {
      return { ok: false, error: "order del banquillo fuera de rango" };
    }
    if (!playerId) {
      return { ok: false, error: "Falta playerId en un suplente" };
    }
    if (usedBenchOrders.has(order)) {
      return { ok: false, error: "order de banquillo duplicado" };
    }
    if (usedPlayerIds.has(playerId)) {
      return { ok: false, error: "Un jugador no puede estar en el once y en el banquillo" };
    }
    usedBenchOrders.add(order);
    usedPlayerIds.add(playerId);
    bench.push({ order, playerId });
  }

  return {
    ok: true,
    data: {
      teamId: p.teamId,
      matchId,
      formationId: p.formationId,
      name,
      isDefault,
      slots,
      bench,
    },
  };
}

export async function getEffectiveLineup(teamId: string, matchId: string | null) {
  if (matchId) {
    const override = await prisma.lineup.findUnique({
      where: { matchId },
      include: {
        slots: { include: { player: true }, orderBy: { slotIndex: "asc" } },
        bench: { include: { player: true }, orderBy: { order: "asc" } },
        formation: { include: { slots: { orderBy: { slotIndex: "asc" } } } },
      },
    });
    if (override) return { lineup: override, source: "override" as const };
  }

  const fallback = await prisma.lineup.findFirst({
    where: { teamId, isDefault: true, matchId: null },
    include: {
      slots: { include: { player: true }, orderBy: { slotIndex: "asc" } },
      bench: { include: { player: true }, orderBy: { order: "asc" } },
      formation: { include: { slots: { orderBy: { slotIndex: "asc" } } } },
    },
  });
  return { lineup: fallback, source: "default" as const };
}

export async function getDefaultLineup(teamId: string) {
  return prisma.lineup.findFirst({
    where: { teamId, isDefault: true, matchId: null },
    include: {
      slots: { include: { player: true }, orderBy: { slotIndex: "asc" } },
      bench: { include: { player: true }, orderBy: { order: "asc" } },
      formation: { include: { slots: { orderBy: { slotIndex: "asc" } } } },
    },
  });
}

export async function getLineupVariants(teamId: string) {
  return prisma.lineup.findMany({
    where: { teamId, isDefault: false, matchId: null },
    include: {
      formation: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function upsertLineup(input: UpsertLineupInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      if (input.matchId) {
        const existing = await tx.lineup.findUnique({
          where: { matchId: input.matchId },
        });
        if (existing) {
          await tx.lineupSlot.deleteMany({ where: { lineupId: existing.id } });
          await tx.lineupBench.deleteMany({ where: { lineupId: existing.id } });
          return finalizeLineup(tx, existing.id, input);
        }
        const created = await tx.lineup.create({
          data: {
            teamId: input.teamId,
            matchId: input.matchId,
            formationId: input.formationId,
            isDefault: false,
          },
        });
        return finalizeLineup(tx, created.id, input);
      }

      if (input.isDefault) {
        await tx.lineup.updateMany({
          where: { teamId: input.teamId, isDefault: true, matchId: null },
          data: { isDefault: false },
        });
      }

      const created = await tx.lineup.create({
        data: {
          teamId: input.teamId,
          matchId: null,
          formationId: input.formationId,
          name: input.name ?? null,
          isDefault: input.isDefault,
        },
      });
      return finalizeLineup(tx, created.id, input);
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err) {
      const prismaErr = err as { code?: string; meta?: { field_name?: string } };
      if (prismaErr.code === "P2003" && prismaErr.meta?.field_name?.includes("formationId")) {
        throw new Error("La formación seleccionada no existe en la base de datos. Ejecuta 'npm run db:seed-formations' para repararlo.");
      }
    }
    throw err;
  }
}

async function finalizeLineup(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  lineupId: string,
  input: UpsertLineupInput,
) {
  if (input.slots.length > 0) {
    await tx.lineupSlot.createMany({
      data: input.slots.map((s) => ({
        lineupId,
        slotIndex: s.slotIndex,
        playerId: s.playerId,
        position: FORMATIONS_BY_ID[input.formationId].slots[s.slotIndex].position,
      })),
    });
  }
  if (input.bench.length > 0) {
    await tx.lineupBench.createMany({
      data: input.bench.map((b) => ({
        lineupId,
        order: b.order,
        playerId: b.playerId,
      })),
    });
  }
  return tx.lineup.findUniqueOrThrow({
    where: { id: lineupId },
    include: {
      slots: { include: { player: true }, orderBy: { slotIndex: "asc" } },
      bench: { include: { player: true }, orderBy: { order: "asc" } },
      formation: { include: { slots: { orderBy: { slotIndex: "asc" } } } },
    },
  });
}

export async function deleteLineup(lineupId: string) {
  return prisma.lineup.delete({ where: { id: lineupId } });
}

export async function getAvailableRoster(teamId: string) {
  return prisma.roster.findMany({
    where: { teamId, isActive: true },
    include: { player: true },
    orderBy: [{ player: { overall: "desc" } }, { player: { name: "asc" } }],
  });
}
