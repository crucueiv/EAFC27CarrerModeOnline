"use client";

import { useState } from "react";
import ResetSeasonButton from "./ResetSeasonButton";
import TeamsTable from "./TeamsTable";
import PointsConfigForm from "./PointsConfigForm";
import ActiveTransfers from "./ActiveTransfers";
import ActiveLoans from "./ActiveLoans";
import ActiveNegotiations from "./ActiveNegotiations";
import LoanedPlayers from "./LoanedPlayers";
import UserInspector from "./UserInspector";
import CalendarsDebug from "./CalendarsDebug";
import WindowsDebug from "./WindowsDebug";
import EventsLog from "./EventsLog";

type ActiveSeason = {
  id: string;
  name: string;
  status: string;
  currentWeek: number;
  isTransferWindowOpen: boolean;
  startDate: string;
  endDate: string;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  leagueId: string | null;
  careerGroupId: string;
  careerGroup: { id: string; name: string };
  league: { id: string; name: string } | null;
} | null;

type AllSeason = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  careerGroup: { id: string; name: string };
  league: { id: string; name: string } | null;
};

type AdminPanelProps = {
  initialState?: {
    activeSeason: ActiveSeason;
    allSeasons: AllSeason[];
    teamCount: number;
    careerGroupCount: number;
    activeTransferCount: number;
    unreadEmailCount: number;
  };
};

const TABS = [
  { id: "overview", label: "Resumen" },
  { id: "seasons", label: "Temporadas" },
  { id: "teams", label: "Equipos" },
  { id: "points", label: "Puntos" },
  { id: "transfers", label: "Transfers" },
  { id: "loans", label: "Cesiones" },
  { id: "negotiations", label: "Negociaciones" },
  { id: "loanedPlayers", label: "Cedidos" },
  { id: "users", label: "Debug: Usuario" },
  { id: "calendars", label: "Debug: Calendarios" },
  { id: "windows", label: "Debug: Ventanas" },
  { id: "events", label: "Debug: Eventos" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminPanel({ initialState }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [state, setState] = useState(initialState ?? null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/state", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-[var(--theme-border)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-t-xl px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-[var(--theme-primary)] text-[var(--theme-on-primary)]"
                : "bg-[var(--theme-card-alt)] text-[var(--theme-muted)] hover:text-[var(--theme-foreground)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!state ? (
        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 text-sm text-[var(--theme-muted)]">
          Cargando estado del panel...
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 shadow-sm">
          {activeTab === "overview" && <OverviewTab state={state} />}
          {activeTab === "seasons" && (
            <SeasonsTab state={state} onChange={refresh} loading={loading} />
          )}
          {activeTab === "teams" && <TeamsTable onChange={refresh} />}
          {activeTab === "points" && state.activeSeason && (
            <PointsConfigForm
              seasonId={state.activeSeason.id}
              pointsWin={state.activeSeason.pointsWin}
              pointsDraw={state.activeSeason.pointsDraw}
              pointsLoss={state.activeSeason.pointsLoss}
              onSaved={refresh}
            />
          )}
          {activeTab === "transfers" && <ActiveTransfers onChange={refresh} />}
          {activeTab === "loans" && <ActiveLoans onChange={refresh} />}
          {activeTab === "negotiations" && <ActiveNegotiations onChange={refresh} />}
          {activeTab === "loanedPlayers" && <LoanedPlayers />}
          {activeTab === "users" && <UserInspector />}
          {activeTab === "calendars" && <CalendarsDebug />}
          {activeTab === "windows" && <WindowsDebug />}
          {activeTab === "events" && <EventsLog />}
        </div>
      )}
    </div>
  );
}

function OverviewTab({ state }: { state: NonNullable<AdminPanelProps["initialState"]> }) {
  const { activeSeason, teamCount, careerGroupCount, activeTransferCount, unreadEmailCount } = state;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Temporada activa" value={activeSeason?.name ?? "—"} sub={activeSeason ? `Semana ${activeSeason.currentWeek}` : "Sin temporada"} />
      <StatCard label="Equipos" value={teamCount.toString()} sub="Total registrados" />
      <StatCard label="Grupos de carrera" value={careerGroupCount.toString()} sub="CareerGroups" />
      <StatCard label="Transfers activos" value={activeTransferCount.toString()} sub={unreadEmailCount + " correos sin leer"} />
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card-alt)] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[var(--theme-foreground)]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[var(--theme-muted)]">{sub}</p>}
    </div>
  );
}

function SeasonsTab({
  state,
  onChange,
  loading,
}: {
  state: NonNullable<AdminPanelProps["initialState"]>;
  onChange: () => Promise<void> | void;
  loading: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card-alt)] p-4">
        <h3 className="text-lg font-bold text-[var(--theme-foreground)]">Temporada activa</h3>
        {state.activeSeason ? (
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Detail label="Nombre" value={state.activeSeason.name} />
            <Detail label="Status" value={state.activeSeason.status} />
            <Detail label="Semana" value={String(state.activeSeason.currentWeek)} />
            <Detail label="Ventana de traspasos" value={state.activeSeason.isTransferWindowOpen ? "Abierta" : "Cerrada"} />
            <Detail label="Liga" value={state.activeSeason.league?.name ?? "—"} />
            <Detail label="CareerGroup" value={state.activeSeason.careerGroup.name} />
            <Detail label="Puntos V/E/D" value={`${state.activeSeason.pointsWin} / ${state.activeSeason.pointsDraw} / ${state.activeSeason.pointsLoss}`} />
            <Detail label="Inicio" value={new Date(state.activeSeason.startDate).toLocaleDateString("es-ES")} />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-[var(--theme-muted)]">No hay temporada activa.</p>
        )}
        <div className="mt-4">
          <ResetSeasonButton onChanged={onChange} disabled={loading} />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-bold text-[var(--theme-foreground)]">Historial de temporadas</h3>
        <div className="overflow-x-auto rounded-xl border border-[var(--theme-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--theme-card-alt)] text-xs uppercase tracking-wider text-[var(--theme-muted)]">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Liga</th>
                <th className="px-4 py-2">Inicio</th>
                <th className="px-4 py-2">Fin</th>
              </tr>
            </thead>
            <tbody>
              {state.allSeasons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-center text-[var(--theme-muted)]">
                    No hay temporadas registradas.
                  </td>
                </tr>
              ) : (
                state.allSeasons.map((s) => (
                  <tr key={s.id} className="border-t border-[var(--theme-border)]">
                    <td className="px-4 py-2 font-medium text-[var(--theme-foreground)]">{s.name}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          s.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : s.status === "COMPLETED"
                              ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[var(--theme-muted)]">{s.league?.name ?? "—"}</td>
                    <td className="px-4 py-2 text-[var(--theme-muted)]">{new Date(s.startDate).toLocaleDateString("es-ES")}</td>
                    <td className="px-4 py-2 text-[var(--theme-muted)]">{new Date(s.endDate).toLocaleDateString("es-ES")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-[var(--theme-muted)]">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-[var(--theme-foreground)]">{value}</dd>
    </div>
  );
}
