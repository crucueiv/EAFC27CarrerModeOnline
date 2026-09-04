"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import {
  FORMATIONS_BY_ID,
  BENCH_SIZE,
  getPositionGroup,
  type FormationDef,
} from "@/lib/constants/formations";
import { translatePosition } from "@/lib/constants/position-translation";
import { DND_TYPES, type LineupPlayer } from "./types";
import LineupSlot from "./LineupSlot";
import BenchSlot from "./BenchSlot";
import AvailablePlayersPanel from "./AvailablePlayersPanel";
import FormationPicker from "./FormationPicker";
import DraggablePlayerChip from "./DraggablePlayerChip";

export type LineupEditorProps = {
  initialFormationId: string;
  initialSlots: Array<{ slotIndex: number; playerId: string | null }>;
  initialBench: Array<{ order: number; playerId: string | null }>;
  roster: LineupPlayer[];
  onSave: (payload: {
    formationId: string;
    slots: Array<{ slotIndex: number; playerId: string }>;
    bench: Array<{ order: number; playerId: string }>;
  }) => Promise<void> | void;
  saveLabel?: string;
  showVariantName?: boolean;
  variantName?: string;
  onVariantNameChange?: (value: string) => void;
  extraActions?: React.ReactNode;
};

function groupByPosition(players: LineupPlayer[]): Array<{ label: string; players: LineupPlayer[] }> {
  const groups = ["Portero", "Defensa", "Centrocampista", "Ataque", "Otros"];
  return groups.map((label) => ({
    label,
    players: players
      .filter((p) => (label === "Otros" ? !groups.slice(0, 4).includes(getPositionGroup(p.position)) : getPositionGroup(p.position) === label))
      .sort((a, b) => b.overall - a.overall),
  }));
}

function isCompatible(naturalPosition: string, slotPosition: string): boolean {
  if (!naturalPosition) return true;
  const naturalGroup = getPositionGroup(naturalPosition);
  const slotGroup = getPositionGroup(slotPosition);
  if (naturalGroup === slotGroup) return true;
  if (slotGroup === "Centrocampista" && (naturalGroup === "Defensa" || naturalGroup === "Ataque")) return true;
  return false;
}

export default function LineupEditor({
  initialFormationId,
  initialSlots,
  initialBench,
  roster,
  onSave,
  saveLabel = "Guardar alineación",
  showVariantName = false,
  variantName,
  onVariantNameChange,
  extraActions,
}: LineupEditorProps) {
  const [formationId, setFormationId] = useState(initialFormationId);
  const formation = FORMATIONS_BY_ID[formationId];

  const [slots, setSlots] = useState<Array<{ slotIndex: number; playerId: string | null }>>(() => {
    const base = Array.from({ length: 11 }, (_, i) => ({ slotIndex: i, playerId: null as string | null }));
    for (const s of initialSlots) {
      if (s.slotIndex >= 0 && s.slotIndex < 11) base[s.slotIndex] = { ...s };
    }
    return base;
  });

  const [bench, setBench] = useState<Array<{ order: number; playerId: string | null }>>(() => {
    const base = Array.from({ length: BENCH_SIZE }, (_, i) => ({ order: i, playerId: null as string | null }));
    for (const b of initialBench) {
      if (b.order >= 0 && b.order < BENCH_SIZE) base[b.order] = { ...b };
    }
    return base;
  });

  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const playerById = useMemo(() => {
    const map = new Map<string, LineupPlayer>();
    for (const p of roster) map.set(p.id, p);
    return map;
  }, [roster]);

  const assignedIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) if (s.playerId) set.add(s.playerId);
    for (const b of bench) if (b.playerId) set.add(b.playerId);
    return set;
  }, [slots, bench]);

  const availablePlayers = useMemo(
    () => roster.filter((p) => !assignedIds.has(p.id)).sort((a, b) => b.overall - a.overall),
    [roster, assignedIds],
  );

  const groupedAvailable = useMemo(() => groupByPosition(availablePlayers), [availablePlayers]);

  function clearAll() {
    setSlots(Array.from({ length: 11 }, (_, i) => ({ slotIndex: i, playerId: null })));
    setBench(Array.from({ length: BENCH_SIZE }, (_, i) => ({ order: i, playerId: null })));
  }

  function autoFill() {
    const used = new Set<string>();
    const newSlots = Array.from({ length: 11 }, (_, i) => ({ slotIndex: i, playerId: null as string | null }));
    for (let i = 0; i < 11; i++) {
      const pos = formation.slots[i].position;
      const candidate = roster
        .filter((p) => !used.has(p.id))
        .sort((a, b) => {
          const aCompat = isCompatible(a.position, pos) ? 0 : 1;
          const bCompat = isCompatible(b.position, pos) ? 0 : 1;
          if (aCompat !== bCompat) return aCompat - bCompat;
          return b.overall - a.overall;
        })[0];
      if (candidate) {
        newSlots[i].playerId = candidate.id;
        used.add(candidate.id);
      }
    }
    const newBench = Array.from({ length: BENCH_SIZE }, (_, i) => ({ order: i, playerId: null as string | null }));
    for (let i = 0; i < BENCH_SIZE; i++) {
      const candidate = roster.find((p) => !used.has(p.id));
      if (candidate) {
        newBench[i].playerId = candidate.id;
        used.add(candidate.id);
      }
    }
    setSlots(newSlots);
    setBench(newBench);
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { kind?: string; playerId?: string } | undefined;
    if (data?.kind === "roster" && data.playerId) {
      setDraggingPlayerId(data.playerId);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingPlayerId(null);
    const { active, over } = event;
    if (!over) return;

    const sourceData = active.data.current as { kind?: string; playerId?: string; slotIndex?: number; order?: number } | undefined;
    const overData = over.data.current as { kind?: string; slotIndex?: number; order?: number } | undefined;
    if (!sourceData?.playerId) return;

    const movingPlayerId = sourceData.playerId;

    const sourceKind = sourceData.kind;
    const sourceIsField = sourceKind === "field" || sourceKind === "slot" || sourceKind === "bench";
    const sourceSlotIndex = sourceData.slotIndex;
    const sourceOrder = sourceData.order;

    function clearSource() {
      if ((sourceKind === "slot" || sourceKind === "field") && typeof sourceSlotIndex === "number") {
        setSlots((prev) => prev.map((s) => (s.slotIndex === sourceSlotIndex ? { ...s, playerId: null } : s)));
      } else if ((sourceKind === "bench" || (sourceKind === "field" && typeof sourceSlotIndex !== "number")) && typeof sourceOrder === "number") {
        setBench((prev) => prev.map((b) => (b.order === sourceOrder ? { ...b, playerId: null } : b)));
      }
    }

    if (overData?.kind === "slot" && typeof overData.slotIndex === "number") {
      const targetIndex = overData.slotIndex;
      const currentOccupant = slots[targetIndex]?.playerId ?? null;
      clearSource();
      setSlots((prev) => {
        const next = prev.map((s) => ({ ...s }));
        next[targetIndex] = { ...next[targetIndex], playerId: movingPlayerId };
        if (currentOccupant && currentOccupant !== movingPlayerId) {
          if (sourceIsField && typeof sourceSlotIndex === "number") {
            next[sourceSlotIndex] = { ...next[sourceSlotIndex], playerId: currentOccupant };
          } else if (sourceIsField && typeof sourceOrder === "number") {
            const newBench = bench.map((b) => ({ ...b }));
            newBench[sourceOrder] = { ...newBench[sourceOrder], playerId: currentOccupant };
            setBench(newBench);
          } else {
            const free = bench.findIndex((b) => !b.playerId);
            if (free !== -1) {
              const newBench = bench.map((b) => ({ ...b }));
              newBench[free] = { ...newBench[free], playerId: currentOccupant };
              setBench(newBench);
            }
          }
        }
        return next;
      });
      return;
    }

    if (overData?.kind === "bench" && typeof overData.order === "number") {
      const targetOrder = overData.order;
      const currentOccupant = bench[targetOrder]?.playerId ?? null;
      clearSource();
      setBench((prev) => {
        const next = prev.map((b) => ({ ...b }));
        next[targetOrder] = { ...next[targetOrder], playerId: movingPlayerId };
        if (currentOccupant && currentOccupant !== movingPlayerId) {
          if (sourceIsField && typeof sourceSlotIndex === "number") {
            const newSlots = slots.map((s) => ({ ...s }));
            newSlots[sourceSlotIndex] = { ...newSlots[sourceSlotIndex], playerId: currentOccupant };
            setSlots(newSlots);
          } else {
            const newSlots = slots.map((s) => ({ ...s }));
            const free = newSlots.findIndex((s) => !s.playerId);
            if (free !== -1) newSlots[free] = { ...newSlots[free], playerId: currentOccupant };
            setSlots(newSlots);
          }
        }
        return next;
      });
      return;
    }

    if (overData?.kind === "roster") {
      clearSource();
      return;
    }
  }

  function handleFormationChange(newId: string) {
    setFormationId(newId);
  }

  const startingCount = slots.filter((s) => s.playerId).length;
  const benchCount = bench.filter((b) => b.playerId).length;
  const canSave = startingCount === 11;

  async function handleSave() {
    if (!canSave) return;
    await onSave({
      formationId,
      slots: slots
        .filter((s) => s.playerId)
        .map((s) => ({ slotIndex: s.slotIndex, playerId: s.playerId as string })),
      bench: bench
        .filter((b) => b.playerId)
        .map((b) => ({ order: b.order, playerId: b.playerId as string })),
    });
  }

  const draggingPlayer = draggingPlayerId ? playerById.get(draggingPlayerId) ?? null : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <FormationPicker value={formationId} onChange={handleFormationChange} />
            {showVariantName && (
              <input
                type="text"
                placeholder="Nombre de la variante (opcional)"
                value={variantName ?? ""}
                onChange={(e) => onVariantNameChange?.(e.target.value)}
                className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm text-[var(--theme-foreground)] focus:border-emerald-400 focus:outline-none"
              />
            )}
            <div className="rounded-md bg-[var(--theme-background)] px-3 py-2 text-xs font-bold text-[var(--theme-muted)]">
              {startingCount}/11 titulares · {benchCount}/{BENCH_SIZE} banquillo
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={autoFill}
              className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm font-medium text-[var(--theme-foreground)] transition hover:opacity-90"
            >
              Autorrellenar
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-500 transition hover:bg-rose-500/20"
            >
              Vaciar
            </button>
            {extraActions}
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-500/40"
            >
              {saveLabel}
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div
            className="relative overflow-hidden rounded-2xl border border-[var(--theme-border)] shadow-lg"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 80px), repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 80px), linear-gradient(180deg, #0e7a3d 0%, #0a5a2c 100%)",
            }}
          >
            <div className="pointer-events-none absolute inset-4 rounded-xl border-2 border-white/40" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40" />
            <div className="pointer-events-none absolute left-1/2 top-4 h-3 w-1 -translate-x-1/2 rounded-full bg-white/60" />
            <div className="pointer-events-none absolute left-1/2 bottom-4 h-3 w-1 -translate-x-1/2 rounded-full bg-white/60" />

            <div className="relative z-10 grid grid-rows-[1fr_1fr_1fr_1fr] gap-3 p-6">
              {formationRows(formation.slots).map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className="flex items-center justify-center gap-3"
                  style={{ minHeight: 90 }}
                >
                  {row.map((slotIdx) => {
                    const slotDef = formation.slots[slotIdx];
                    const slotData = slots[slotIdx];
                    const player = slotData?.playerId ? playerById.get(slotData.playerId) ?? null : null;
                    return (
                      <LineupSlot
                        key={slotIdx}
                        slotIndex={slotIdx}
                        position={translatePosition(slotDef.position)}
                        label={slotDef.label}
                        player={player}
                        isMismatched={!!player && !isCompatible(player.position, slotDef.position)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="relative z-10 border-t-2 border-white/30 bg-black/30 p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/70">Banquillo</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {bench.map((b) => (
                  <BenchSlot
                    key={b.order}
                    order={b.order}
                    player={b.playerId ? playerById.get(b.playerId) ?? null : null}
                  />
                ))}
              </div>
            </div>
          </div>

          <AvailablePlayersPanel available={availablePlayers} grouped={groupedAvailable} />
        </div>
      </div>

      <DragOverlay>
        {draggingPlayer ? (
          <div className="rotate-2 opacity-90">
            <DraggablePlayerChip player={draggingPlayer} size="md" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function formationRows(slots: FormationDef["slots"]): number[][] {
  const rows: number[][] = [[], [], [], []];
  for (let i = 0; i < 11; i++) {
    const pos = slots[i].position;
    if (pos === "POR") rows[3].push(i);
    else if (["DFC", "LI", "LD", "CAD", "CAI"].includes(pos)) rows[2].push(i);
    else if (["MCD", "MC", "MCO", "MI", "MD"].includes(pos)) rows[1].push(i);
    else rows[0].push(i);
  }
  return rows;
}
