"use client";

import { useState } from "react";

export default function ResetSeasonButton({
  onChanged,
  disabled,
}: {
  onChanged?: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/reset-season", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Error al reiniciar la temporada");
        return;
      }
      setMessage(`Temporada reiniciada correctamente. Nueva temporada: ${data.newSeasonName}.`);
      setOpen(false);
      if (onChanged) await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {message && (
        <p className="mb-3 rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled || loading}
        className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Reiniciar temporada
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-[var(--theme-foreground)]">¿Reiniciar la temporada?</h3>
            <p className="text-sm text-[var(--theme-muted)]">
              Se cerrará la temporada activa actual y se creará una nueva temporada. Los transfers activos permanecerán,
              pero los partidos en curso no se verán afectados.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] px-4 py-2 text-sm font-semibold text-[var(--theme-foreground)] hover:opacity-90 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? "Reiniciando..." : "Sí, reiniciar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
