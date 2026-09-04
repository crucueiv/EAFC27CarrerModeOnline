export type LineupPlayer = {
  id: string;
  name: string;
  position: string;
  overall: number;
  avatarUrl: string | null;
  eaId: number | null;
};

export type LineupRosterEntry = {
  playerId: string;
  role: "CLAVE" | "IMPORTANTE" | "ROTACION";
};

export type DragData =
  | { kind: "roster"; playerId: string }
  | { kind: "slot"; slotIndex: number }
  | { kind: "bench"; order: number };

export const DND_TYPES = {
  ROSTER: "lineup-roster",
  SLOT: "lineup-slot",
  BENCH: "lineup-bench",
} as const;

export type DropTarget =
  | { kind: "slot"; slotIndex: number }
  | { kind: "bench"; order: number }
  | { kind: "roster" };

export function getPlayerAvatarUrl(player: { avatarUrl?: string | null; eaId?: number | null }): string {
  if (player.avatarUrl) return player.avatarUrl;
  if (player.eaId) return `https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p${player.eaId}.png`;
  return "/player-placeholder.svg";
}
