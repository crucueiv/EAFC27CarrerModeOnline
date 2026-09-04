"use client";

import { useDroppable } from "@dnd-kit/core";
import { DND_TYPES, type LineupPlayer } from "./types";
import DraggablePlayerChip from "./DraggablePlayerChip";

export default function LineupSlot({
  slotIndex,
  position,
  label,
  player,
  isMismatched,
}: {
  slotIndex: number;
  position: string;
  label: string;
  player: LineupPlayer | null;
  isMismatched: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slotIndex}`,
    data: { kind: "slot", slotIndex },
  });

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        ref={setNodeRef}
        data-dnd-type={DND_TYPES.SLOT}
        className={`grid h-20 w-20 place-items-center rounded-xl border-2 transition ${
          isOver
            ? "border-emerald-400 bg-emerald-400/15"
            : player
              ? "border-[var(--theme-border)] bg-[var(--theme-surface)]/80"
              : "border-dashed border-[var(--theme-border)] bg-black/20"
        }`}
      >
        {player ? (
          <div className="flex flex-col items-center">
            <DraggablePlayerChip
              player={player}
              size="md"
              fromRoster={false}
              highlight={!isMismatched}
              badge={isMismatched ? "out" : undefined}
              sourceSlotIndex={slotIndex}
            />
            <div className="-mt-1 text-[9px] font-bold uppercase tracking-wider text-[var(--theme-muted)]">
              {position}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">
              {position}
            </div>
            <div className="text-[9px] text-white/50">{label}</div>
          </div>
        )}
      </div>
    </div>
  );
}
