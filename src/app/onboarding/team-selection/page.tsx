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
  const { update: updateSession, data: session, status } = useSession();
  const leagueId = searchParams.get("leagueId");
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!leagueId) {
      router.push("/onboarding/league-selection");
      return;
    }
    fetchTeams();
  }, [leagueId]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.clubTeamId) {
      router.replace("/dashboard");
    }
  }, [status, session?.user?.clubTeamId, router]);

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
        return;
      }

      try {
        await updateSession({ clubTeamId: data.clubTeamId ?? team.id });
      } catch (sessionErr) {
        console.error("Error updating session:", sessionErr);
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
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
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 px-4 py-12">
      <div className="w-full max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-pitch mb-2">Elige tu equipo</h1>
          <p className="text-slate-500">Paso 2 de 2: Selecciona el club que dirigirás</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar equipo..."
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <svg className="animate-spin h-10 w-10 text-emerald-600 mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-slate-500">Cargando equipos...</p>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
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
                    ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
                    : "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50"
                } ${isSelecting === team.id ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-4">
                  {team.imageUrl ? (
                    <img
                      src={team.imageUrl}
                      alt={team.name}
                      className="w-14 h-14 rounded-lg object-cover bg-slate-100"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg">
                      {team.shortName}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-pitch truncate">{team.name}</div>
                    <div className="text-sm text-slate-500">
                      {team.squadSize} jugadores
                      {team.currentManager && (
                        <span className="ml-1 text-slate-400">· {team.currentManager}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Presupuesto: {team.budget ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(team.budget) : '0€'}
                    </div>
                  </div>
                  {isSelecting === team.id ? (
                    <svg className="animate-spin h-5 w-5 text-emerald-600" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : !team.hasUserManager ? (
                    <svg className="w-6 h-6 text-slate-300 group-hover:text-emerald-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  ) : (
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">Ocupado</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamSelectionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 flex items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-emerald-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    }>
      <TeamSelectionContent />
    </Suspense>
  );
}
