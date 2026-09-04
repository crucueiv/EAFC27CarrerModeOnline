"use client";

import { useDroppable } from "@dnd-kit/core";
import { DND_TYPES, type LineupPlayer } from "./types";
import DraggablePlayerChip from "./DraggablePlayerChip";

export default function BenchSlot({
  order,
  player,
}: {
  order: number;
  player: LineupPlayer | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `bench-${order}`,
    data: { kind: "bench", order },
  });

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] p-2">
      <div className="grid h-7 w-7 place-items-center rounded-full bg-[var(--theme-accent-soft)] text-xs font-black text-[var(--theme-accent)]">
        {order + 1}
      </div>
      <div
        ref={setNodeRef}
        data-dnd-type={DND_TYPES.BENCH}
        className={`grid h-14 w-14 flex-1 place-items-center rounded-md border-2 transition ${
          isOver
            ? "border-emerald-400 bg-emerald-400/15"
            : player
              ? "border-transparent"
              : "border-dashed border-[var(--theme-border)] bg-[var(--theme-background)]/40"
        }`}
      >
        {player ? (
          <DraggablePlayerChip player={player} size="sm" fromRoster={false} sourceBenchOrder={order} />
        ) : (
          <div className="text-[10px] uppercase tracking-wider text-[var(--theme-muted)]">Vacío</div>
        )}
      </div>
    </div>
  );
}
