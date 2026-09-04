"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense } from "react";

type TeamData = {
  id: string;
  eaId: string | null;
  name: string;
  shortName: string;
  imageUrl: string | null;
  squadSize: number;
  hasUserManager: boolean;
  currentManager: string | null;
  budget: number;
};

function TeamSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update: updateSession } = useSession();
  const leagueId = searchParams.get("leagueId");
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!leagueId) {
      router.push("/onboarding/league-selection");
      return;
    }
    fetchTeams();
  }, [leagueId]);

  const fetchTeams = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/leagues/${leagueId}/teams`);
      if (!res.ok) {
        setError("Error al cargar equipos");
        return;
      }
      const data = await res.json();
      setTeams(data);
    } catch {
      setError("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTeam = async (team: TeamData) => {
    if (team.hasUserManager) return;
    setIsSelecting(team.id);
    setIsFinalizing(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding/select-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al seleccionar equipo");
        setIsFinalizing(false);
        setIsSelecting(null);
        return;
      }

      try {
        const refreshRes = await fetch("/api/auth/refresh-team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clubTeamId: data.clubTeamId ?? team.id }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          await updateSession({
            clubTeamId: refreshData.clubTeamId ?? null,
            nationalTeamId: refreshData.nationalTeamId ?? null,
            username: refreshData.username ?? undefined,
            avatarUrl: refreshData.avatarUrl ?? undefined,
          });
        } else {
          console.error("refresh-team failed:", refreshRes.status, await refreshRes.text());
        }
      } catch (sessionErr) {
        console.error("Error refreshing session:", sessionErr);
      }

      window.location.assign("/dashboard");
    } catch (err) {
      console.error("Error selecting team:", err);
      setError("Error de conexión");
      setIsFinalizing(false);
      setIsSelecting(null);
    }
  };

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.shortName.toLowerCase().includes(search.toLowerCase())
  );

  if (!leagueId) return null;
  if (status === "loading") return null;
  if (session?.user?.clubTeamId) return null;

  return (
    <>
      {isFinalizing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)]/95 px-10 py-8 shadow-2xl">
            <div className="flex flex-col items-center gap-4">
              <svg className="h-14 w-14 text-emerald-400" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                <path
                  d="M22 12a10 10 0 0 1-10 10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                </path>
              </svg>
              <p className="text-xl font-bold text-white">Configurando tu club...</p>
              <p className="text-sm text-white/70">Te llevamos a tu dashboard en unos segundos</p>
            </div>
          </div>
        </div>
      )}
    <div className="min-h-screen bg-[var(--theme-background)] px-4 py-12">
      <div className="w-full max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-[var(--theme-primary)] mb-2">Elige tu equipo</h1>
          <p className="text-[var(--theme-muted)]">Paso 2 de 2: Selecciona el club que dirigirás</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-rose-100 border border-rose-300 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            {error}
          </div>
        )}

        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar equipo..."
            className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3 text-[var(--theme-foreground)] placeholder:text-[var(--theme-muted)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] transition"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <svg className="animate-spin h-10 w-10 text-[var(--theme-primary)] mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-[var(--theme-muted)]">Cargando equipos...</p>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="text-center py-20 text-[var(--theme-muted)]">
            No se encontraron equipos
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleSelectTeam(team)}
                disabled={team.hasUserManager || isSelecting === team.id}
                className={`p-5 rounded-2xl border-2 transition-all text-left group ${
                  team.hasUserManager
                    ? "border-[var(--theme-border)] bg-[var(--theme-card-alt)] opacity-60 cursor-not-allowed"
                    : "border-[var(--theme-border)] hover:border-[var(--theme-primary)] hover:bg-[var(--theme-accent-soft)]"
                } ${isSelecting === team.id ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-4">
                  {team.imageUrl ? (
                    <img
                      src={team.imageUrl}
                      alt={team.name}
                      className="w-14 h-14 rounded-lg object-cover bg-[var(--theme-card-alt)]"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-[var(--theme-accent-soft)] flex items-center justify-center text-[var(--theme-primary)] font-bold text-lg">
                      {team.shortName}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[var(--theme-primary)] truncate">{team.name}</div>
                    <div className="text-sm text-[var(--theme-muted)]">
                      {team.squadSize} jugadores
                      {team.currentManager && (
                        <span className="ml-1 text-[var(--theme-muted)] opacity-75">· {team.currentManager}</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--theme-muted)] mt-1">
                      Presupuesto: {team.budget ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(team.budget) : '0€'}
                    </div>
                  </div>
                  {isSelecting === team.id ? (
                    <svg className="animate-spin h-5 w-5 text-[var(--theme-primary)]" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : !team.hasUserManager ? (
                    <svg className="w-6 h-6 text-[var(--theme-muted)] group-hover:text-[var(--theme-primary)] transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  ) : (
                    <span className="text-xs text-[var(--theme-muted)] bg-[var(--theme-card-alt)] px-2 py-1 rounded-lg">Ocupado</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

export function TeamSelectionClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--theme-background)] flex items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-[var(--theme-primary)]" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    }>
      <TeamSelectionContent />
    </Suspense>
  );
}
