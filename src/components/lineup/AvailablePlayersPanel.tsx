"use client";

import { useDroppable } from "@dnd-kit/core";
import { DND_TYPES, type LineupPlayer } from "./types";
import DraggablePlayerChip from "./DraggablePlayerChip";
import { getPositionGroup } from "@/lib/constants/formations";

export default function AvailablePlayersPanel({
  available,
  grouped,
}: {
  available: LineupPlayer[];
  grouped: Array<{ label: string; players: LineupPlayer[] }>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "roster-zone",
    data: { kind: "roster" },
  });

  return (
    <div
      ref={setNodeRef}
      data-dnd-type={DND_TYPES.ROSTER}
      className={`rounded-xl border-2 transition ${
        isOver
          ? "border-emerald-400 bg-emerald-400/10"
          : "border-[var(--theme-border)] bg-[var(--theme-card)]"
      }`}
    >
      <div className="border-b border-[var(--theme-border)] px-4 py-3">
        <h3 className="font-semibold text-[var(--theme-foreground)]">Plantilla disponible</h3>
        <p className="text-xs text-[var(--theme-muted)]">
          Arrastra un jugador al campo. Suelta aquí para devolverlo a la plantilla.
        </p>
      </div>
      <div className="max-h-[600px] space-y-4 overflow-y-auto p-4">
        {grouped.map((group) => (
          <div key={group.label}>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
              {group.label} ({group.players.length})
            </div>
            {group.players.length === 0 ? (
              <div className="text-xs italic text-[var(--theme-muted)]">Sin jugadores</div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {group.players.map((p) => (
                  <DraggablePlayerChip
                    key={p.id}
                    player={p}
                    size="md"
                    highlight={p.position === getPositionGroup(p.position)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
