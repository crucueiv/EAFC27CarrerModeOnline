"use client";

import { useState } from "react";

export default function PointsConfigForm({
  seasonId,
  pointsWin,
  pointsDraw,
  pointsLoss,
  onSaved,
}: {
  seasonId: string;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  onSaved?: () => void | Promise<void>;
}) {
  const [win, setWin] = useState(String(pointsWin));
  const [draw, setDraw] = useState(String(pointsDraw));
  const [loss, setLoss] = useState(String(pointsLoss));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const w = Number(win);
      const d = Number(draw);
      const l = Number(loss);
      if (!Number.isFinite(w) || !Number.isFinite(d) || !Number.isFinite(l)) {
        setError("Los valores deben ser numéricos");
        return;
      }
      const res = await fetch("/api/admin/update-points-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pointsWin: w, pointsDraw: d, pointsLoss: l }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Error al guardar");
        return;
      }
      setMessage(`Configuración actualizada para la temporada ${seasonId.slice(-6)}.`);
      if (onSaved) await onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--theme-muted)]">
        Configura cuántos puntos se otorgan por cada resultado en la temporada activa.
        Los cambios afectan a las tablas de clasificación en <code>/competitions</code>.
      </p>

      {message && (
        <p className="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <NumberInput label="Victoria" value={win} onChange={setWin} />
        <NumberInput label="Empate" value={draw} onChange={setDraw} />
        <NumberInput label="Derrota" value={loss} onChange={setLoss} />
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-[var(--theme-primary)] px-5 py-2 text-sm font-bold text-[var(--theme-on-primary)] shadow hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar configuración"}
      </button>
    </div>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[var(--theme-foreground)]">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={0}
        step={1}
        className="mt-1 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-sm text-[var(--theme-foreground)]"
      />
    </label>
  );
}
