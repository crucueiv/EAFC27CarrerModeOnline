"use client";

import { useEffect, useState } from "react";

type TransferRow = {
  id: string;
  status: string;
  fee: number;
  createdAt: string;
  player: { id: string; name: string; overall: number };
  buyerTeam: { id: string; name: string } | null;
  sellerTeam: { id: string; name: string } | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

export default function ActiveTransfers({ onChange }: { onChange?: () => void | Promise<void> }) {
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/transfers", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setTransfers(data.transfers ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (transferId: string, action: "COMPLETE" | "CANCEL") => {
    setActionId(transferId);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/force-finish-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Error al ejecutar la acción");
        return;
      }
      setMessage(`Transfer ${data.status === "COMPLETED" ? "completado" : "cancelado"} correctamente.`);
      await load();
      if (onChange) await onChange();
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--theme-muted)]">
        Transfers en curso entre clubes. Puedes forzar la finalización (mover roster y ajustar presupuesto)
        o cancelar la operación.
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

      {loading ? (
        <p className="text-sm text-[var(--theme-muted)]">Cargando transfers...</p>
      ) : transfers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--theme-border)] p-6 text-center text-sm text-[var(--theme-muted)]">
          No hay transfers activos.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--theme-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--theme-card-alt)] text-xs uppercase tracking-wider text-[var(--theme-muted)]">
              <tr>
                <th className="px-4 py-2">Jugador</th>
                <th className="px-4 py-2">Vendedor</th>
                <th className="px-4 py-2">Comprador</th>
                <th className="px-4 py-2 text-right">Importe</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id} className="border-t border-[var(--theme-border)]">
                  <td className="px-4 py-2 font-medium text-[var(--theme-foreground)]">
                    {t.player.name} <span className="text-[var(--theme-muted)]">({t.player.overall})</span>
                  </td>
                  <td className="px-4 py-2 text-[var(--theme-muted)]">{t.sellerTeam?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-[var(--theme-muted)]">{t.buyerTeam?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-mono">{formatCurrency(t.fee)}</td>
                  <td className="px-4 py-2 text-[var(--theme-muted)]">
                    <code className="text-[10px]">{t.status}</code>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => act(t.id, "COMPLETE")}
                        disabled={actionId === t.id}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Forzar fin
                      </button>
                      <button
                        type="button"
                        onClick={() => act(t.id, "CANCEL")}
                        disabled={actionId === t.id}
                        className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
