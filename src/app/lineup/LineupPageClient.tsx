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

type Variant = {
  id: string;
  name: string | null;
  formationId: string;
  formationName: string;
  updatedAt: string;
};

type Props = {
  team: TeamInfo;
  initialFormationId: string;
  initialSlots: Array<{ slotIndex: number; playerId: string | null }>;
  initialBench: Array<{ order: number; playerId: string | null }>;
  roster: LineupPlayer[];
  variants: Variant[];
};

export default function LineupPageClient({
  team,
  initialFormationId,
  initialSlots,
  initialBench,
  roster,
  variants,
}: Props) {
  const router = useRouter();
  const [variantName, setVariantName] = useState("");
  const [savingAs, setSavingAs] = useState<"default" | "variant">("default");
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "ok" | "error"; message?: string }>({ kind: "idle" });

  const handleSave: LineupEditorProps["onSave"] = async (payload) => {
    setStatus({ kind: "saving" });
    try {
      const res = await fetch("/api/lineups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: team.id,
          formationId: payload.formationId,
          slots: payload.slots,
          bench: payload.bench,
          isDefault: savingAs === "default",
          name: savingAs === "variant" ? variantName || null : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus({ kind: "error", message: data.error ?? "Error al guardar" });
        return;
      }
      setStatus({ kind: "ok", message: savingAs === "default" ? "Guardado como alineación titular" : "Variante guardada" });
      router.refresh();
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Error" });
    }
  };

  async function handleDeleteVariant(id: string) {
    if (!confirm("¿Borrar esta variante?")) return;
    const res = await fetch(`/api/lineups/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[var(--theme-foreground)]">Plantilla Activa</h1>
          <p className="mt-1 text-[var(--theme-muted)]">
            {team.name} · Define el once titular y los 7 suplentes
          </p>
        </div>
        <Link
          href="/squad"
          className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] px-4 py-2 text-sm font-medium text-[var(--theme-foreground)] hover:opacity-90"
        >
          Ver plantilla completa
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-3 text-sm">
        <span className="font-semibold text-[var(--theme-muted)]">Guardar como:</span>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="saveAs"
            checked={savingAs === "default"}
            onChange={() => setSavingAs("default")}
            className="accent-emerald-500"
          />
          Alineación titular
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="saveAs"
            checked={savingAs === "variant"}
            onChange={() => setSavingAs("variant")}
            className="accent-emerald-500"
          />
          Variante con nombre
        </label>
        {savingAs === "variant" && (
          <input
            type="text"
            placeholder='Ej: "Plan B contra rivales fuertes"'
            value={variantName}
            onChange={(e) => setVariantName(e.target.value)}
            className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-1.5 text-sm text-[var(--theme-foreground)] focus:border-emerald-400 focus:outline-none"
          />
        )}
        {status.kind === "error" && (
          <span className="text-rose-500">{status.message}</span>
        )}
        {status.kind === "ok" && (
          <span className="text-emerald-500">{status.message}</span>
        )}
      </div>

      <LineupEditor
        initialFormationId={initialFormationId}
        initialSlots={initialSlots}
        initialBench={initialBench}
        roster={roster}
        onSave={handleSave}
        saveLabel={status.kind === "saving" ? "Guardando..." : "Guardar"}
        showVariantName
        variantName={variantName}
        onVariantNameChange={setVariantName}
      />

      {variants.length > 0 && (
        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
          <h2 className="mb-3 font-semibold text-[var(--theme-foreground)]">Variantes guardadas</h2>
          <ul className="divide-y divide-[var(--theme-border)]">
            {variants.map((v) => (
              <li key={v.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium text-[var(--theme-foreground)]">
                    {v.name ?? "Sin nombre"}
                  </div>
                  <div className="text-xs text-[var(--theme-muted)]">
                    {v.formationName} · Guardada {new Date(v.updatedAt).toLocaleDateString("es-ES")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteVariant(v.id)}
                  className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/20"
                >
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
