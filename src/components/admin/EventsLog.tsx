"use client";

import { useEffect, useState } from "react";

type Event = {
  at: string;
  type: "transfer" | "match" | "email" | "season" | "calendar";
  severity: "info" | "warn" | "success";
  message: string;
  meta?: Record<string, unknown>;
};

const TYPE_LABEL: Record<Event["type"], string> = {
  transfer: "Traspaso",
  match: "Partido",
  email: "Email",
  season: "Temporada",
  calendar: "Calendario",
};

const SEVERITY_COLOR: Record<Event["severity"], string> = {
  info: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  warn: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export default function EventsLog() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState<"all" | Event["type"]>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/events", { cache: "no-store" });
      if (!res.ok) {
        setError("Error al cargar eventos");
        return;
      }
      const json = await res.json();
      setEvents(json.events);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | Event["type"])}
          className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm"
        >
          <option value="all">Todos ({events.length})</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
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
        <span className="text-xs text-[var(--theme-muted)]">{filtered.length} eventos</span>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-[var(--theme-border)]">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-[var(--theme-card-alt)] text-[10px] uppercase tracking-wider text-[var(--theme-muted)]">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Severidad</th>
              <th className="px-3 py-2">Mensaje</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-center text-[var(--theme-muted)]">
                  Sin eventos
                </td>
              </tr>
            ) : (
              filtered.map((e, i) => (
                <tr key={i} className="border-t border-[var(--theme-border)]">
                  <td className="px-3 py-1.5 font-mono text-[var(--theme-muted)]">
                    {new Date(e.at).toLocaleString("es-ES")}
                  </td>
                  <td className="px-3 py-1.5 text-[var(--theme-foreground)]">{TYPE_LABEL[e.type]}</td>
                  <td className="px-3 py-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_COLOR[e.severity]}`}>
                      {e.severity}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-[var(--theme-foreground)]">{e.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
