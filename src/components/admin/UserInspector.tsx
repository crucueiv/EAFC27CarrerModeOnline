"use client";

import { useState } from "react";

type LookupResponse = {
  user: {
    id: string;
    email: string;
    username: string | null;
    name: string | null;
    createdAt: string;
    clubTeam: { id: string; name: string; shortName: string; league: { id: string; name: string } | null } | null;
    memberships: Array<{ id: string; role: string; careerGroup: { id: string; name: string } }>;
  } | null;
  calendarStates: Array<{
    id: string;
    seasonName: string;
    seasonStatus: string;
    currentDate: string;
    maxAllowedDate: string;
    isLocked: boolean;
    lockReason: string;
    version: number;
    lastAdvanceAt: string;
  }>;
  matches: Array<{
    id: string;
    scheduledAt: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
    status: string;
  }>;
  transfers: Array<{ id: string; player: string; status: string; fee: number; createdAt: string }>;
  seasons: Array<{ id: string; name: string; status: string; careerGroup: string; startDate: string; endDate: string }>;
};

export default function UserInspector() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<LookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/lookup?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      if (!res.ok) {
        setError("Búsqueda fallida");
        return;
      }
      const json: LookupResponse = await res.json();
      setData(json);
      if (!json.user) setError("Sin resultados");
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  };

  const copyJson = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="email, username, nombre o id"
          className="flex-1 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm"
        />
        <button
          onClick={search}
          disabled={loading || !q.trim()}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
        {data && (
          <button
            onClick={copyJson}
            className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm font-medium text-[var(--theme-foreground)] transition hover:opacity-90"
          >
            Copiar JSON
          </button>
        )}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {data?.user ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card-alt)] p-4">
            <h3 className="text-lg font-bold text-[var(--theme-foreground)]">Usuario</h3>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <Detail label="ID" value={data.user.id} />
              <Detail label="Email" value={data.user.email} />
              <Detail label="Username" value={data.user.username ?? "—"} />
              <Detail label="Nombre" value={data.user.name ?? "—"} />
              <Detail label="Club" value={data.user.clubTeam?.name ?? "—"} />
              <Detail label="Liga" value={data.user.clubTeam?.league?.name ?? "—"} />
              <Detail label="Creado" value={new Date(data.user.createdAt).toLocaleString("es-ES")} />
            </dl>
            {data.user.memberships.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-bold uppercase text-[var(--theme-muted)]">Membresías</p>
                <ul className="mt-1 space-y-1 text-xs">
                  {data.user.memberships.map((m) => (
                    <li key={m.id}>
                      {m.careerGroup.name} <span className="text-[var(--theme-muted)]">({m.role})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Section title={`Calendarios (${data.calendarStates.length})`}>
            <DataTable
              headers={["Temporada", "Status", "currentDate", "maxAllowed", "Locked", "Reason", "Ver"]}
              rows={data.calendarStates.map((c) => [
                c.seasonName,
                c.seasonStatus,
                c.currentDate.slice(0, 10),
                c.maxAllowedDate.slice(0, 10),
                c.isLocked ? "Sí" : "No",
                c.lockReason,
                `v${c.version}`,
              ])}
            />
          </Section>

          <Section title={`Partidos recientes (${data.matches.length})`}>
            <DataTable
              headers={["Fecha", "Local", "Visitante", "Resultado", "Status"]}
              rows={data.matches.map((m) => [
                new Date(m.scheduledAt).toLocaleDateString("es-ES"),
                m.homeTeam,
                m.awayTeam,
                m.homeScore != null ? `${m.homeScore}–${m.awayScore ?? 0}` : "—",
                m.status,
              ])}
            />
          </Section>

          <Section title={`Traspasos (${data.transfers.length})`}>
            <DataTable
              headers={["Fecha", "Jugador", "Status", "Fee"]}
              rows={data.transfers.map((t) => [
                new Date(t.createdAt).toLocaleDateString("es-ES"),
                t.player,
                t.status,
                String(t.fee),
              ])}
            />
          </Section>

          <Section title={`Temporadas (${data.seasons.length})`}>
            <DataTable
              headers={["Nombre", "Status", "CareerGroup", "Inicio"]}
              rows={data.seasons.map((s) => [s.name, s.status, s.careerGroup, s.startDate.slice(0, 10)])}
            />
          </Section>
        </div>
      ) : !error && (
        <p className="text-sm text-[var(--theme-muted)]">Introduce email, username o id de usuario.</p>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-[var(--theme-muted)]">{label}</dt>
      <dd className="font-mono text-xs text-[var(--theme-foreground)]">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card-alt)] p-4">
      <h3 className="text-sm font-bold text-[var(--theme-foreground)]">{title}</h3>
      <div className="mt-2 overflow-x-auto">{children}</div>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (rows.length === 0) return <p className="text-xs text-[var(--theme-muted)]">Sin datos</p>;
  return (
    <table className="min-w-full text-left text-xs">
      <thead className="text-[10px] uppercase tracking-wider text-[var(--theme-muted)]">
        <tr>
          {headers.map((h) => (
            <th key={h} className="px-2 py-1">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-[var(--theme-border)]">
            {r.map((c, j) => (
              <td key={j} className="px-2 py-1 text-[var(--theme-foreground)]">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
