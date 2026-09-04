"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LineupEditor, { type LineupEditorProps } from "@/components/lineup/LineupEditor";
import type { LineupPlayer } from "@/components/lineup/types";

type TeamInfo = {
  id: string;
  name: string;
  shortName: string;
  imageUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
};

type Props = {
  matchId: string;
  matchStatus: "PENDING" | "WAITING_PVP" | "COMPLETED" | "SIMULATED";
  scheduledAt: string;
  userTeam: TeamInfo;
  opponent: TeamInfo;
  isHome: boolean;
  initialFormationId: string;
  initialSlots: Array<{ slotIndex: number; playerId: string | null }>;
  initialBench: Array<{ order: number; playerId: string | null }>;
  roster: LineupPlayer[];
  hasOverride: boolean;
  hasDefault: boolean;
};

export default function MatchLineupClient({
  matchId,
  matchStatus,
  scheduledAt,
  userTeam,
  opponent,
  isHome,
  initialFormationId,
  initialSlots,
  initialBench,
  roster,
  hasOverride,
  hasDefault,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "ok" | "error"; message?: string }>({ kind: "idle" });

  const locked = matchStatus === "COMPLETED" || matchStatus === "SIMULATED";

  const handleSave: LineupEditorProps["onSave"] = async (payload) => {
    if (locked) return;
    setStatus({ kind: "saving" });
    try {
      const res = await fetch("/api/lineups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: userTeam.id,
          matchId,
          formationId: payload.formationId,
          slots: payload.slots,
          bench: payload.bench,
          isDefault: false,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus({ kind: "error", message: data.error ?? "Error al guardar" });
        return;
      }
      setStatus({ kind: "ok", message: "Alineación guardada para este partido" });
      router.refresh();
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Error" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[var(--theme-foreground)]">Alineación del partido</h1>
          <p className="mt-1 text-[var(--theme-muted)]">
            {new Date(scheduledAt).toLocaleString("es-ES")} · {isHome ? "Local" : "Visitante"}
          </p>
        </div>
        <Link
          href={`/match/${matchId}`}
          className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] px-4 py-2 text-sm font-medium text-[var(--theme-foreground)] hover:opacity-90"
        >
          Volver al partido
        </Link>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
        <div className="flex items-center gap-3">
          {userTeam.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userTeam.imageUrl} alt={userTeam.name} className="h-10 w-10 object-contain" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-[var(--theme-background)]" />
          )}
          <div className="text-lg font-bold text-[var(--theme-foreground)]">{userTeam.name}</div>
        </div>
        <div className="text-2xl font-black text-[var(--theme-muted)]">VS</div>
        <div className="flex items-center gap-3">
          {opponent.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={opponent.imageUrl} alt={opponent.name} className="h-10 w-10 object-contain" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-[var(--theme-background)]" />
          )}
          <div className="text-lg font-bold text-[var(--theme-foreground)]">{opponent.name}</div>
        </div>
      </div>

      {!hasDefault && !hasOverride && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-500">
          No tienes alineación guardada. Esta será la primera.
        </div>
      )}
      {hasOverride && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-500">
          Tienes una alineación personalizada para este partido.
        </div>
      )}
      {!hasOverride && hasDefault && (
        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 text-sm text-[var(--theme-muted)]">
          Estás editando sobre la base de tu alineación titular. Si guardas, se creará un override solo para este partido.
        </div>
      )}

      {locked ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-500">
          Este partido ya no admite cambios de alineación.
        </div>
      ) : null}

      {status.kind === "error" && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-500">
          {status.message}
        </div>
      )}
      {status.kind === "ok" && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-500">
          {status.message}
        </div>
      )}

      <LineupEditor
        initialFormationId={initialFormationId}
        initialSlots={initialSlots}
        initialBench={initialBench}
        roster={roster}
        onSave={handleSave}
        saveLabel={status.kind === "saving" ? "Guardando..." : "Guardar alineación de este partido"}
      />
    </div>
  );
}
