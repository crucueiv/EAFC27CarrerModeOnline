"use client";

import { useEffect, useState } from "react";

type NegotiationRow = {
  id: string;
  type: string;
  status: string;
  agreedPrice: number;
  buyerSalaryPercent: number;
  canal: string;
  createdAt: string;
  player: { id: string; name: string; overall: number; position: string };
  buyerTeam: { id: string; name: string };
  sellerTeam: { id: string; name: string };
  season: { id: string; name: string; isTransferWindowOpen: boolean };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

const STATUS_BADGES: Record<string, string> = {
  PENDING_AGREEMENT: "bg-amber-100 text-amber-700",
  AGREED_PENDING_WINDOW: "bg-indigo-100 text-indigo-700",
  AGREED_ACTIVE: "bg-sky-100 text-sky-700",
  AGREED_CLUB: "bg-emerald-100 text-emerald-700",
  WAITING_PLAYER_CONTRACT: "bg-indigo-100 text-indigo-700",
};

const TYPE_LABELS: Record<string, string> = {
  PERMANENT: "Traspaso",
  LOAN_SHORT_TERM: "Cesión corta",
  LOAN_1_YEAR: "Cesión 1 año",
  LOAN_2_YEARS: "Cesión 2 años",
};

export default function ActiveNegotiations({ onChange }: { onChange?: () => void | Promise<void> }) {
  const [rows, setRows] = useState<NegotiationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/negotiations/list", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setRows(data.negotiations ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = async (negotiationId: string) => {
    setActionId(negotiationId);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/negotiations/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ negotiationId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al cancelar la negociación");
        return;
      }
      setMessage("Negociación cancelada correctamente.");
      await load();
      if (onChange) await onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--theme-muted)]">
        Negociaciones activas (entre clubes) en curso. Puedes cancelar para liberar el presupuesto
        comprometido. Las negociaciones en estado <code>AGREED_PENDING_WINDOW</code> se activan
        automáticamente cuando abre la ventana de traspasos.
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
        <p className="text-sm text-[var(--theme-muted)]">Cargando negociaciones...</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--theme-border)] p-6 text-center text-sm text-[var(--theme-muted)]">
          No hay negociaciones activas.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--theme-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--theme-card-alt)] text-xs uppercase tracking-wider text-[var(--theme-muted)]">
              <tr>
                <th className="px-4 py-2">Jugador</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Vendedor → Comprador</th>
                <th className="px-4 py-2 text-right">Precio</th>
                <th className="px-4 py-2 text-right">% Salario</th>
                <th className="px-4 py-2">Canal</th>
                <th className="px-4 py-2">Temporada</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id} className="border-t border-[var(--theme-border)]">
                  <td className="px-4 py-2 font-medium text-[var(--theme-foreground)]">
                    {n.player.name} <span className="text-[var(--theme-muted)]">({n.player.overall})</span>
                  </td>
                  <td className="px-4 py-2 text-[var(--theme-muted)]">
                    {TYPE_LABELS[n.type] ?? n.type}
                  </td>
                  <td className="px-4 py-2 text-[var(--theme-muted)]">
                    {n.sellerTeam.name} → {n.buyerTeam.name}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{formatCurrency(Math.round(n.agreedPrice))}</td>
                  <td className="px-4 py-2 text-right text-[var(--theme-muted)]">
                    {n.buyerSalaryPercent}%
                  </td>
                  <td className="px-4 py-2 text-[var(--theme-muted)]">
                    <code className="text-[10px]">{n.canal}</code>
                  </td>
                  <td className="px-4 py-2 text-[var(--theme-muted)]">
                    {n.season.name}
                    {n.season.isTransferWindowOpen ? (
                      <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">VENTANA ABIERTA</span>
                    ) : (
                      <span className="ml-2 rounded-full bg-zinc-200 px-1.5 py-0.5 text-[9px] font-bold text-zinc-700">cerrada</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        STATUS_BADGES[n.status] ?? "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {n.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => cancel(n.id)}
                      disabled={actionId === n.id}
                      className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
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
