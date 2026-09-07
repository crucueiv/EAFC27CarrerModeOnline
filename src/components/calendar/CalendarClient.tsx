"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";

const TRANSFER_ICON_URL =
  "https://res.cloudinary.com/oiugg8m6/image/upload/v1788544606/ku1k7n81srprwsew3pnl.png";

type WindowDto = {
  id: string;
  kind: "SUMMER" | "WINTER" | "ONBOARDING_ONLY";
  status: "SCHEDULED" | "OPEN" | "CLOSED";
  opensAt: string;
  closesAt: string;
};

type MatchDto = {
  id: string;
  scheduledAt: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  isHome: boolean;
};

type MonthResponse = {
  hasClub: boolean;
  clubTeamId: string | null;
  clubTeamName: string | null;
  season: { id: string; name: string; startDate: string; endDate: string } | null;
  currentDate: string | null;
  maxAllowedDate: string | null;
  isLocked: boolean;
  lockReason: string | null;
  transferWindows: WindowDto[];
  matches: MatchDto[];
  userManagers: Array<{
    userId: string;
    name: string;
    avatarUrl: string | null;
    teamId: string;
    teamName: string;
    currentDate: string | null;
    isCurrentUser: boolean;
  }>;
};

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function isSameUtcDay(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function inWindowRange(date: Date, opensAt: string, closesAt: string) {
  const t = date.getTime();
  return t >= new Date(opensAt).getTime() && t < new Date(closesAt).getTime();
}

function buildMonthGrid(year: number, month: number): Array<{ date: Date | null; iso: string | null }> {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weekday = (firstOfMonth.getUTCDay() + 6) % 7;
  const cells: Array<{ date: Date | null; iso: string | null }> = [];
  for (let i = 0; i < weekday; i++) cells.push({ date: null, iso: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(Date.UTC(year, month - 1, d));
    cells.push({ date: dt, iso: `${year}-${pad2(month)}-${pad2(d)}` });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, iso: null });
  return cells;
}

export default function CalendarClient() {
  const today = new Date();
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth() + 1);
  const [data, setData] = useState<MonthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [userNavigated, setUserNavigated] = useState(false);

  const fetchMonth = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendar/month?year=${y}&month=${m}`, { cache: "no-store" });
      if (!res.ok) {
        setError("No se pudo cargar el calendario");
        return;
      }
      const json: MonthResponse = await res.json();
      setData(json);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonth(year, month);
  }, [year, month, fetchMonth]);

  useEffect(() => {
    if (!data?.currentDate || userNavigated) return;
    const d = new Date(data.currentDate);
    const ny = d.getUTCFullYear();
    const nm = d.getUTCMonth() + 1;
    if (ny !== year || nm !== month) {
      setYear(ny);
      setMonth(nm);
    }
  }, [data?.currentDate, userNavigated, year, month]);

  const grid = buildMonthGrid(year, month);
  const currentDate = data?.currentDate ? new Date(data.currentDate) : null;
  const maxAllowed = data?.maxAllowedDate ? new Date(data.maxAllowedDate) : null;
  const matchesByIso = new Map<string, MatchDto[]>();
  if (data) {
    for (const m of data.matches) {
      const d = new Date(m.scheduledAt);
      const iso = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
      const arr = matchesByIso.get(iso) ?? [];
      arr.push(m);
      matchesByIso.set(iso, arr);
    }
  }
  const managersByIso = new Map<string, MonthResponse["userManagers"]>();
  if (data) {
    for (const manager of data.userManagers) {
      if (manager.isCurrentUser || !manager.currentDate) continue;
      const date = new Date(manager.currentDate);
      if (Number.isNaN(date.getTime())) continue;
      const iso = `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
      const managers = managersByIso.get(iso) ?? [];
      managers.push(manager);
      managersByIso.set(iso, managers);
    }
  }

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));

  const canGoBack = data?.season ? monthStart.getTime() > new Date(data.season.startDate).getTime() - 30 * 86400000 : true;
  const canGoForward = data?.season ? monthEnd.getTime() < new Date(data.season.endDate).getTime() : true;

  const goPrev = () => {
    setUserNavigated(true);
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const goNext = () => {
    setUserNavigated(true);
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    if (data?.currentDate) {
      const d = new Date(data.currentDate);
      setYear(d.getUTCFullYear());
      setMonth(d.getUTCMonth() + 1);
      setUserNavigated(false);
    } else {
      const t = new Date();
      setYear(t.getUTCFullYear());
      setMonth(t.getUTCMonth() + 1);
    }
  };

  const advance = async () => {
    if (!data?.maxAllowedDate) return;
    setAdvancing(true);
    try {
      const res = await fetch("/api/calendar/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        if (data.currentDate) {
          const d = new Date(data.currentDate);
          setYear(d.getUTCFullYear());
          setMonth(d.getUTCMonth() + 1);
          setUserNavigated(false);
        }
      }
    } finally {
      setAdvancing(false);
    }
  };

  if (!data) {
    return (
      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 text-sm text-[var(--theme-muted)]">
        {loading ? "Cargando calendario..." : error ?? "Cargando..."}
      </div>
    );
  }

  if (!data.hasClub) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-10 text-center shadow-sm">
        <h1 className="text-3xl font-black text-[var(--theme-primary)]">Sin equipo</h1>
        <p className="mt-2 text-[var(--theme-muted)]">Selecciona un club para acceder al calendario.</p>
        <Link
          href="/onboarding/league-selection"
          className="mt-6 inline-block rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 shadow transition hover:bg-emerald-400"
        >
          Elegir equipo
        </Link>
      </div>
    );
  }

  if (!data.season) {
    return (
      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 text-sm text-[var(--theme-muted)]">
        No hay temporada activa en tu carrera.
      </div>
    );
  }

  const isCurrentMonth =
    currentDate &&
    currentDate.getUTCFullYear() === year &&
    currentDate.getUTCMonth() + 1 === month;

  const seasonStart = new Date(data.season.startDate);
  const seasonEnd = new Date(data.season.endDate);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[var(--theme-primary)]">Calendario</h1>
          <p className="text-xs text-[var(--theme-muted)]">
            {data.season.name} · {data.clubTeamName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={!canGoBack}
            className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] text-[var(--theme-foreground)] transition hover:opacity-90 disabled:opacity-40"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[160px] text-center text-lg font-bold text-[var(--theme-foreground)]">
            {MONTHS_ES[month - 1]} {year}
          </div>
          <button
            onClick={goNext}
            disabled={!canGoForward}
            className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] text-[var(--theme-foreground)] transition hover:opacity-90 disabled:opacity-40"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={goToday}
            className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm font-medium text-[var(--theme-foreground)] transition hover:opacity-90"
          >
            Hoy
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-3 text-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-muted)]">Fecha actual</p>
          <p className="mt-1 font-bold text-[var(--theme-foreground)]">
            {currentDate
              ? currentDate.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-3 text-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-muted)]">Máx. permitido</p>
          <p className="mt-1 font-bold text-[var(--theme-foreground)]">
            {maxAllowed
              ? maxAllowed.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-3 text-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-muted)]">Estado</p>
          <p className="mt-1 flex items-center gap-2 font-bold text-[var(--theme-foreground)]">
            {data.isLocked ? (
              <>
                <Lock className="h-3.5 w-3.5 text-amber-500" /> Bloqueado
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Libre
              </>
            )}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 shadow-sm">
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--theme-muted)]">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((cell, i) => {
            if (!cell.date || !cell.iso) {
              return <div key={i} className="h-24 rounded-lg bg-[var(--theme-background)] opacity-30" />;
            }
            const isToday = currentDate ? isSameUtcDay(cell.date, currentDate) : false;
            const isPast = currentDate ? cell.date.getTime() < currentDate.getTime() : false;
            const isInSeason = cell.date.getTime() >= seasonStart.getTime() && cell.date.getTime() <= seasonEnd.getTime();
            const isWindowOpen = data.transferWindows.some((w) => inWindowRange(cell.date!, w.opensAt, w.closesAt));
            const dayMatches = matchesByIso.get(cell.iso) ?? [];
            const dayManagers = managersByIso.get(cell.iso) ?? [];

            return (
              <div
                key={i}
                className={`relative h-24 overflow-hidden rounded-lg border p-1.5 text-left transition ${
                  isToday
                    ? "border-[var(--theme-primary)] bg-[var(--theme-accent-soft)] ring-2 ring-[var(--theme-primary)]"
                    : isInSeason
                    ? "border-[var(--theme-border)] bg-[var(--theme-background)]"
                    : "border-[var(--theme-border)] bg-[var(--theme-card-alt)] opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`text-xs font-bold ${
                      isToday
                        ? "text-[var(--theme-primary)]"
                        : isPast
                        ? "text-[var(--theme-muted)]"
                        : "text-[var(--theme-foreground)]"
                    }`}
                  >
                    {cell.date.getUTCDate()}
                  </span>
                  {isWindowOpen && (
                    <img
                      src={TRANSFER_ICON_URL}
                      alt="Ventana de fichajes abierta"
                      title="Ventana de fichajes abierta"
                      className="h-4 w-4 object-contain"
                    />
                  )}
                </div>
                <div className="mt-1 space-y-0.5">
                  {dayMatches.slice(0, 2).map((m) => {
                    const isPlayed = m.status === "COMPLETED" || m.status === "SIMULATED";
                    return (
                      <Link
                        key={m.id}
                        href={`/match/${m.id}`}
                        className="block truncate rounded px-1 py-0.5 text-[10px] font-medium hover:bg-[var(--theme-accent-soft)]"
                        title={`${m.homeTeamName} vs ${m.awayTeamName}`}
                      >
                        <span className="text-[var(--theme-muted)]">{m.isHome ? "vs" : "@"}</span>{" "}
                        <span className="text-[var(--theme-foreground)]">
                          {isPlayed
                            ? `${m.homeScore ?? 0}–${m.awayScore ?? 0}`
                            : m.isHome
                            ? m.awayTeamName
                            : m.homeTeamName}
                        </span>
                      </Link>
                    );
                  })}
                  {dayMatches.length > 2 && (
                    <p className="text-[10px] text-[var(--theme-muted)]">+{dayMatches.length - 2} más</p>
                  )}
                </div>
                  {dayManagers.length > 0 && (
                    <div className="absolute bottom-1 left-1 flex max-w-[calc(100%-0.5rem)] items-center gap-1">
                      {dayManagers.map((manager) => (
                        <img
                          key={manager.userId}
                          src={manager.avatarUrl ?? "/default-avatar.svg"}
                          alt={`${manager.name} · ${manager.teamName}`}
                          title={`${manager.name} · ${manager.teamName}`}
                          className="h-6 w-6 rounded-full border-2 border-[var(--theme-card)] object-cover shadow-sm"
                          onError={(event) => {
                            event.currentTarget.src = "/default-avatar.svg";
                          }}
                        />
                      ))}
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-3 text-xs text-[var(--theme-muted)]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <img src={TRANSFER_ICON_URL} className="h-3.5 w-3.5" alt="" />
            Ventana de fichajes abierta
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded border-2 border-[var(--theme-primary)] bg-[var(--theme-accent-soft)]" />
            Día actual
          </span>
        </div>
        <button
          onClick={advance}
          disabled={advancing || data.isLocked || !isCurrentMonth}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 shadow transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {advancing ? "Avanzando..." : "Avanzar al siguiente día disponible"}
        </button>
      </div>

      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 text-sm">
        <h2 className="font-bold text-[var(--theme-foreground)]">Ventanas de traspasos</h2>
        <ul className="mt-2 space-y-1 text-[var(--theme-muted)]">
          {data.transferWindows.map((w) => (
            <li key={w.id} className="flex items-center justify-between text-xs">
              <span>
                {w.kind === "SUMMER" ? "Verano" : w.kind === "WINTER" ? "Invierno" : "Onboarding"} ·{" "}
                {new Date(w.opensAt).toLocaleDateString("es-ES")} → {new Date(w.closesAt).toLocaleDateString("es-ES")}
              </span>
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
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
