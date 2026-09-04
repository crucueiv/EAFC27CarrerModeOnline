"use client";

import { useEffect, useState } from "react";

type WindowDto = {
  id: string;
  kind: "SUMMER" | "WINTER" | "ONBOARDING_ONLY";
  status: "SCHEDULED" | "OPEN" | "CLOSED";
  opensAt: string;
  closesAt: string;
  openedAt: string | null;
  closedAt: string | null;
};

type Response = {
  season: { id: string; name: string; isTransferWindowOpen: boolean } | null;
  windows: WindowDto[];
};

export default function WindowsDebug() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/windows", { cache: "no-store" });
      if (!res.ok) {
        setError("Error al cargar");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (windowId: string, status: WindowDto["status"]) => {
    await fetch("/api/admin/windows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ windowId, status }),
    });
    load();
  };

  const toggleSeasonFlag = async (seasonId: string, current: boolean) => {
    await fetch("/api/admin/windows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonId, isTransferWindowOpen: !current }),
    });
    load();
  };

  if (!data) {
    return <p className="text-sm text-[var(--theme-muted)]">{error ?? "Cargando..."}</p>;
  }

  if (!data.season) {
    return <p className="text-sm text-[var(--theme-muted)]">No hay temporada activa.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card-alt)] p-4">
        <h3 className="text-sm font-bold text-[var(--theme-foreground)]">{data.season.name}</h3>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-[var(--theme-muted)]">Season.isTransferWindowOpen:</span>
          <button
            onClick={() => toggleSeasonFlag(data.season!.id, data.season!.isTransferWindowOpen)}
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              data.season.isTransferWindowOpen
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {data.season.isTransferWindowOpen ? "true" : "false"} (toggle)
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--theme-border)]">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-[var(--theme-card-alt)] text-[10px] uppercase tracking-wider text-[var(--theme-muted)]">
            <tr>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Apertura</th>
              <th className="px-3 py-2">Cierre</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.windows.map((w) => (
              <tr key={w.id} className="border-t border-[var(--theme-border)]">
                <td className="px-3 py-1.5 font-medium text-[var(--theme-foreground)]">
                  {w.kind === "SUMMER" ? "Verano" : w.kind === "WINTER" ? "Invierno" : "Onboarding"}
                </td>
                <td className="px-3 py-1.5 font-mono text-[var(--theme-muted)]">
                  {new Date(w.opensAt).toLocaleDateString("es-ES")}
                </td>
                <td className="px-3 py-1.5 font-mono text-[var(--theme-muted)]">
                  {new Date(w.closesAt).toLocaleDateString("es-ES")}
                </td>
                <td className="px-3 py-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      w.status === "OPEN"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : w.status === "SCHEDULED"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {w.status}
                  </span>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setStatus(w.id, "OPEN")}
                      disabled={w.status === "OPEN"}
                      className="rounded bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-slate-950 disabled:opacity-40"
                    >
                      Abrir
                    </button>
                    <button
                      onClick={() => setStatus(w.id, "CLOSED")}
                      disabled={w.status === "CLOSED"}
                      className="rounded bg-slate-500 px-2 py-0.5 text-[10px] font-bold text-white disabled:opacity-40"
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={() => setStatus(w.id, "SCHEDULED")}
                      disabled={w.status === "SCHEDULED"}
                      className="rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-950 disabled:opacity-40"
                    >
                      Programar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={load}
        disabled={loading}
        className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-xs font-medium text-[var(--theme-foreground)] transition hover:opacity-90"
      >
        {loading ? "Refrescando..." : "Refrescar"}
      </button>
    </div>
  );
}
