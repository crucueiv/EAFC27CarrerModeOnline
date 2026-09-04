"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { DND_TYPES, type LineupPlayer, getPlayerAvatarUrl } from "./types";

export default function DraggablePlayerChip({
  player,
  size = "md",
  fromRoster = true,
  highlight = false,
  badge,
  sourceSlotIndex,
  sourceBenchOrder,
}: {
  player: LineupPlayer;
  size?: "sm" | "md" | "lg";
  fromRoster?: boolean;
  highlight?: boolean;
  badge?: string;
  sourceSlotIndex?: number;
  sourceBenchOrder?: number;
}) {
  const data: Record<string, unknown> = fromRoster
    ? { kind: "roster", playerId: player.id }
    : { kind: "field", playerId: player.id, slotIndex: sourceSlotIndex, order: sourceBenchOrder };

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${fromRoster ? "roster" : "field"}-${player.id}${typeof sourceSlotIndex === "number" ? `-s${sourceSlotIndex}` : ""}${typeof sourceBenchOrder === "number" ? `-b${sourceBenchOrder}` : ""}`,
    data,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const sizeClasses = {
    sm: { wrap: "h-10 w-10", img: 32, name: false, ovr: "text-[10px]" },
    md: { wrap: "h-12 w-12", img: 40, name: true, ovr: "text-[11px]" },
    lg: { wrap: "h-16 w-16", img: 56, name: true, ovr: "text-sm" },
  }[size];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-dnd-type={DND_TYPES.ROSTER}
      className={`flex cursor-grab touch-none select-none flex-col items-center gap-1 ${
        isDragging ? "z-50" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-full ring-2 transition ${
          highlight ? "ring-emerald-400" : "ring-[var(--theme-border)]"
        } ${sizeClasses.wrap}`}
      >
        <Image
          src={getPlayerAvatarUrl(player)}
          alt={player.name}
          width={sizeClasses.img * 2}
          height={sizeClasses.img * 2}
          unoptimized
          className="h-full w-full object-cover"
        />
        <div
          className={`absolute bottom-0 right-0 grid place-items-center rounded-full bg-[var(--theme-accent)] font-black text-white shadow ${sizeClasses.ovr} h-5 min-w-5 px-1`}
        >
          {player.overall}
        </div>
        {badge && (
          <div className="absolute left-0 top-0 rounded-br-md bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
            {badge}
          </div>
        )}
      </div>
      {sizeClasses.name && (
        <div className="max-w-[5rem] truncate text-center text-[10px] font-semibold text-[var(--theme-foreground)]">
          {player.name}
        </div>
      )}
    </div>
  );
}
