"use client";

import { useEffect, useState } from "react";

type TeamRow = {
  id: string;
  name: string;
  shortName: string;
  budget: number;
  committedBudget: number;
  primaryColor: string | null;
  league: { id: string; name: string } | null;
  manager: { id: string; username: string | null; name: string | null; email: string | null } | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

export default function TeamsTable({ onChange }: { onChange?: () => void | Promise<void> }) {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/teams", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setTeams(data.teams ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (team: TeamRow) => {
    setEditingId(team.id);
    setDraft(String(team.budget));
    setMessage(null);
    setError(null);
  };

  const save = async (teamId: string) => {
    const value = Number(draft);
    if (!Number.isFinite(value) || value < 0) {
      setError("Presupuesto inválido");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/update-budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, budget: value }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Error al guardar");
        return;
      }
      setMessage("Presupuesto actualizado");
      setEditingId(null);
      await load();
      if (onChange) await onChange();
    } finally {
      setSaving(false);
    }
  };

  const filtered = teams.filter((t) =>
    [t.name, t.shortName, t.league?.name, t.manager?.username, t.manager?.email]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
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

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre, liga o manager..."
        className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-sm text-[var(--theme-foreground)] placeholder:text-[var(--theme-muted)]"
      />

      {loading ? (
        <p className="text-sm text-[var(--theme-muted)]">Cargando equipos...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--theme-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--theme-card-alt)] text-xs uppercase tracking-wider text-[var(--theme-muted)]">
              <tr>
                <th className="px-4 py-2">Equipo</th>
                <th className="px-4 py-2">Liga</th>
                <th className="px-4 py-2">Manager</th>
                <th className="px-4 py-2 text-right">Presupuesto</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-center text-[var(--theme-muted)]">
                    Sin resultados.
                  </td>
                </tr>
              ) : (
                filtered.map((team) => (
                  <tr key={team.id} className="border-t border-[var(--theme-border)]">
                    <td className="px-4 py-2 font-medium text-[var(--theme-foreground)]">
                      <span
                        className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                        style={{ background: team.primaryColor ?? "#999" }}
                      />
                      {team.name}
                    </td>
                    <td className="px-4 py-2 text-[var(--theme-muted)]">{team.league?.name ?? "—"}</td>
                    <td className="px-4 py-2 text-[var(--theme-muted)]">
                      {team.manager?.username ?? team.manager?.name ?? team.manager?.email ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-[var(--theme-foreground)]">
                      {editingId === team.id ? (
                        <input
                          type="number"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          className="w-32 rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2 py-1 text-right text-sm"
                          min={0}
                          step={1000}
                        />
                      ) : (
                        formatCurrency(team.budget)
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {editingId === team.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            disabled={saving}
                            className="rounded border border-[var(--theme-border)] px-2 py-1 text-xs text-[var(--theme-foreground)] hover:opacity-90"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => save(team.id)}
                            disabled={saving}
                            className="rounded bg-[var(--theme-primary)] px-2 py-1 text-xs font-bold text-[var(--theme-on-primary)] hover:opacity-90 disabled:opacity-50"
                          >
                            {saving ? "..." : "Guardar"}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(team)}
                          className="rounded border border-[var(--theme-border)] px-2 py-1 text-xs text-[var(--theme-foreground)] hover:opacity-90"
                        >
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
