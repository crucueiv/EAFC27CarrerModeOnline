"use client";

import { useEffect, useState } from "react";

type LoanedPlayer = {
  id: string;
  name: string;
  overall: number;
  position: string;
  loanedToTeam: { id: string; name: string; shortName: string | null; imageUrl: string | null } | null;
  loan: {
    id: string;
    status: string;
    startsAt: string;
    endsAt: string;
    duration: string;
    wageShareBuyerPct: number;
    hasBuyOption: boolean;
    buyOptionPrice: number | null;
    sellerTeam: { id: string; name: string; shortName: string | null };
    season: { id: string; name: string };
  } | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-ES");
}

export default function LoanedPlayers() {
  const [players, setPlayers] = useState<LoanedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/loaned-players", { cache: "no-store" });
      if (!res.ok) {
        setError("Error al cargar jugadores cedidos");
        return;
      }
      const data = await res.json();
      setPlayers(data.players ?? []);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = search
    ? players.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.loanedToTeam?.name.toLowerCase().includes(search.toLowerCase()) ||
          p.loan?.sellerTeam.name.toLowerCase().includes(search.toLowerCase()),
      )
    : players;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--theme-muted)]">
        Jugadores actualmente cedidos (<code>isLoaned = true</code>) con información de su
        club original, club cesionario, fechas y opción de compra.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar jugador, club..."
          className="flex-1 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm"
        />
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm font-medium text-[var(--theme-foreground)] transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Cargando..." : "Refrescar"}
        </button>
        <span className="text-xs text-[var(--theme-muted)]">{filtered.length} jugadores</span>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-[var(--theme-muted)]">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--theme-border)] p-6 text-center text-sm text-[var(--theme-muted)]">
          No hay jugadores cedidos.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--theme-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--theme-card-alt)] text-xs uppercase tracking-wider text-[var(--theme-muted)]">
              <tr>
                <th className="px-4 py-2">Jugador</th>
                <th className="px-4 py-2">Club original</th>
                <th className="px-4 py-2">Club cesionario</th>
                <th className="px-4 py-2">Inicio → Fin</th>
                <th className="px-4 py-2 text-right">% Salario</th>
                <th className="px-4 py-2 text-right">Opción de compra</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-[var(--theme-border)]">
                  <td className="px-4 py-2 font-medium text-[var(--theme-foreground)]">
                    {p.name} <span className="text-[var(--theme-muted)]">({p.overall})</span>
                  </td>
                  <td className="px-4 py-2 text-[var(--theme-muted)]">
                    {p.loan?.sellerTeam.name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-[var(--theme-muted)]">
                    {p.loanedToTeam?.name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-[var(--theme-muted)] font-mono text-xs">
                    {p.loan ? `${formatDate(p.loan.startsAt)} → ${formatDate(p.loan.endsAt)}` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--theme-muted)]">
                    {p.loan ? `${p.loan.wageShareBuyerPct}%` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--theme-muted)]">
                    {p.loan?.hasBuyOption && p.loan.buyOptionPrice
                      ? formatCurrency(p.loan.buyOptionPrice)
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {p.loan ? (
                      <code className="text-[10px]">{p.loan.status}</code>
                    ) : (
                      "—"
                    )}
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
