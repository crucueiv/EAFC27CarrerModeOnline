"use client";

import { useEffect, useState } from "react";

type LoanRow = {
  id: string;
  status: string;
  duration: string;
  wageShareBuyerPct: number;
  hasBuyOption: boolean;
  buyOptionPrice: number | null;
  startsAt: string;
  endsAt: string;
  fee: number;
  player: { id: string; name: string; overall: number; position: string };
  buyerTeam: { id: string; name: string };
  sellerTeam: { id: string; name: string };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-ES");
}

const STATUS_BADGES: Record<string, string> = {
  PROPOSED: "bg-slate-200 text-slate-700",
  COUNTERED: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-sky-100 text-sky-700",
  AGREED_CLUB: "bg-indigo-100 text-indigo-700",
  WAITING_PLAYER_CONTRACT: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  BUY_OPTION_TRIGGERED: "bg-emerald-100 text-emerald-700",
  RETURNED: "bg-zinc-200 text-zinc-700",
  CANCELLED: "bg-rose-100 text-rose-700",
  REJECTED: "bg-rose-100 text-rose-700",
};

export default function ActiveLoans({ onChange }: { onChange?: () => void | Promise<void> }) {
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/loans/list", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setLoans(data.loans ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (loanId: string, action: "ACTIVATE" | "CANCEL" | "RETURN") => {
    setActionId(loanId);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/loans/force-finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Error al ejecutar la acción");
        return;
      }
      setMessage(`Cesión ${action === "ACTIVATE" ? "activada" : action === "CANCEL" ? "cancelada" : "devuelta"} correctamente.`);
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
        Cesiones en curso. Puedes forzar la activación (mover roster y consumir presupuesto),
        cancelar (libera el presupuesto comprometido) o devolver al jugador al club vendedor.
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
        <p className="text-sm text-[var(--theme-muted)]">Cargando cesiones...</p>
      ) : loans.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--theme-border)] p-6 text-center text-sm text-[var(--theme-muted)]">
          No hay cesiones activas.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--theme-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--theme-card-alt)] text-xs uppercase tracking-wider text-[var(--theme-muted)]">
              <tr>
                <th className="px-4 py-2">Jugador</th>
                <th className="px-4 py-2">Vendedor → Comprador</th>
                <th className="px-4 py-2">Duración</th>
                <th className="px-4 py-2">% Salario</th>
                <th className="px-4 py-2">Opción</th>
                <th className="px-4 py-2">Inicio → Fin</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => {
                const canActivate = ["PROPOSED", "COUNTERED", "ACCEPTED", "AGREED_CLUB", "WAITING_PLAYER_CONTRACT"].includes(l.status);
                const canCancel = ["PROPOSED", "COUNTERED", "ACCEPTED", "AGREED_CLUB", "WAITING_PLAYER_CONTRACT"].includes(l.status);
                const canReturn = ["COMPLETED", "BUY_OPTION_TRIGGERED"].includes(l.status);
                return (
                  <tr key={l.id} className="border-t border-[var(--theme-border)]">
                    <td className="px-4 py-2 font-medium text-[var(--theme-foreground)]">
                      {l.player.name} <span className="text-[var(--theme-muted)]">({l.player.overall})</span>
                    </td>
                    <td className="px-4 py-2 text-[var(--theme-muted)]">
                      {l.sellerTeam.name} → {l.buyerTeam.name}
                    </td>
                    <td className="px-4 py-2 text-[var(--theme-muted)]">
                      <code className="text-[10px]">{l.duration}</code>
                    </td>
                    <td className="px-4 py-2 text-[var(--theme-muted)]">{l.wageShareBuyerPct}%</td>
                    <td className="px-4 py-2 text-[var(--theme-muted)]">
                      {l.hasBuyOption && l.buyOptionPrice ? formatCurrency(l.buyOptionPrice) : "—"}
                    </td>
                    <td className="px-4 py-2 text-[var(--theme-muted)] font-mono text-xs">
                      {formatDate(l.startsAt)} → {formatDate(l.endsAt)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          STATUS_BADGES[l.status] ?? "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        {canActivate && (
                          <button
                            type="button"
                            onClick={() => act(l.id, "ACTIVATE")}
                            disabled={actionId === l.id}
                            className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Forzar activación
                          </button>
                        )}
                        {canReturn && (
                          <button
                            type="button"
                            onClick={() => act(l.id, "RETURN")}
                            disabled={actionId === l.id}
                            className="rounded bg-sky-600 px-2 py-1 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-50"
                          >
                            Devolver
                          </button>
                        )}
                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => act(l.id, "CANCEL")}
                            disabled={actionId === l.id}
                            className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-500/20 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
