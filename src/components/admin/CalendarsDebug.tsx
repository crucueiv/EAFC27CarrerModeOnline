"use client";

import { useEffect, useState } from "react";

type CalState = {
  id: string;
  teamId: string;
  teamName: string;
  seasonId: string;
  seasonName: string;
  seasonStatus: string;
  careerGroupId: string;
  currentDate: string;
  maxAllowedDate: string;
  isLocked: boolean;
  lockReason: string;
  version: number;
  lastAdvanceAt: string;
};

type AdvanceResult = {
  ok: boolean;
  reason?: string;
  newCurrentDate?: string;
  maxAllowedDate?: string;
  by?: string;
};

export default function CalendarsDebug() {
  const [states, setStates] = useState<CalState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [careerGroupFilter, setCareerGroupFilter] = useState("all");
  const [advanceTarget, setAdvanceTarget] = useState<Record<string, string>>({});
  const [advanceResults, setAdvanceResults] = useState<Record<string, AdvanceResult | string>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/calendars", { cache: "no-store" });
      if (!res.ok) {
        setError("Error al cargar calendarios");
        return;
      }
      const json = await res.json();
      setStates(json.states);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const groups = Array.from(new Set(states.map((s) => s.careerGroupId)));
  const filtered = careerGroupFilter === "all" ? states : states.filter((s) => s.careerGroupId === careerGroupFilter);

  const advance = async (teamId: string) => {
    const targetDate = advanceTarget[teamId];
    if (!targetDate) {
      setAdvanceResults((r) => ({ ...r, [teamId]: "Selecciona fecha objetivo" }));
      return;
    }
    setAdvanceResults((r) => ({ ...r, [teamId]: "Avanzando..." }));
    try {
      const res = await fetch("/api/admin/calendar/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, targetDate: new Date(targetDate).toISOString() }),
      });
      const json: AdvanceResult = await res.json();
      setAdvanceResults((r) => ({ ...r, [teamId]: json }));
      load();
    } catch {
      setAdvanceResults((r) => ({ ...r, [teamId]: { ok: false, reason: "network" } }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={careerGroupFilter}
          onChange={(e) => setCareerGroupFilter(e.target.value)}
          className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm"
        >
          <option value="all">Todos los grupos ({groups.length})</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm font-medium text-[var(--theme-foreground)] transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Cargando..." : "Refrescar"}
        </button>
        <span className="text-xs text-[var(--theme-muted)]">{filtered.length} calendarios</span>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-[var(--theme-border)]">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-[var(--theme-card-alt)] text-[10px] uppercase tracking-wider text-[var(--theme-muted)]">
            <tr>
              <th className="px-3 py-2">Equipo</th>
              <th className="px-3 py-2">Temporada</th>
              <th className="px-3 py-2">currentDate</th>
              <th className="px-3 py-2">maxAllowed</th>
              <th className="px-3 py-2">Locked</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">v</th>
              <th className="px-3 py-2">Forzar avance</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-3 text-center text-[var(--theme-muted)]">
                  Sin calendarios
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const r = advanceResults[s.teamId];
                return (
                  <tr key={s.id} className="border-t border-[var(--theme-border)]">
                    <td className="px-3 py-1.5 font-medium text-[var(--theme-foreground)]">{s.teamName}</td>
                    <td className="px-3 py-1.5 text-[var(--theme-muted)]">{s.seasonName}</td>
                    <td className="px-3 py-1.5 font-mono">{s.currentDate.slice(0, 10)}</td>
                    <td className="px-3 py-1.5 font-mono">{s.maxAllowedDate.slice(0, 10)}</td>
                    <td className="px-3 py-1.5">{s.isLocked ? "🔒" : "—"}</td>
                    <td className="px-3 py-1.5 text-[var(--theme-muted)]">{s.lockReason}</td>
                    <td className="px-3 py-1.5 text-[var(--theme-muted)]">{s.version}</td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          value={advanceTarget[s.teamId] ?? s.currentDate.slice(0, 10)}
                          onChange={(e) => setAdvanceTarget((t) => ({ ...t, [s.teamId]: e.target.value }))}
                          className="rounded border border-[var(--theme-border)] bg-[var(--theme-background)] px-1 py-0.5 text-[10px]"
                        />
                        <button
                          onClick={() => advance(s.teamId)}
                          className="rounded bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-slate-950"
                        >
                          →
                        </button>
                      </div>
                      {r && typeof r === "string" && <span className="ml-1 text-[10px] text-amber-600">{r}</span>}
                      {r && typeof r !== "string" && (
                        <span className={`ml-1 text-[10px] ${r.ok ? "text-emerald-600" : "text-rose-600"}`}>
                          {r.ok ? "ok" : r.reason}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
