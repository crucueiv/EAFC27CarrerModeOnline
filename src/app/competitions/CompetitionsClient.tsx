"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LeagueOption = {
  id: string;
  name: string;
  country: string;
  continent: string;
  teamCount: number;
};

export default function CompetitionsClient({
  leagues,
  initialLeagueId,
}: {
  leagues: LeagueOption[];
  initialLeagueId: string | null;
}) {
  const router = useRouter();

  const initial = useMemo(
    () => leagues.find((l) => l.id === initialLeagueId) ?? leagues[0] ?? null,
    [leagues, initialLeagueId]
  );

  const [step, setStep] = useState<"continent" | "country" | "league">("continent");
  const [selectedContinent, setSelectedContinent] = useState<string>(initial?.continent ?? "");
  const [selectedCountry, setSelectedCountry] = useState<string>(initial?.country ?? "");

  const continents = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of leagues) {
      map.set(l.continent, (map.get(l.continent) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }, [leagues]);

  const countries = useMemo(() => {
    if (!selectedContinent) return [];
    const map = new Map<string, number>();
    for (const l of leagues.filter((x) => x.continent === selectedContinent)) {
      map.set(l.country, (map.get(l.country) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }, [leagues, selectedContinent]);

  const filteredLeagues = useMemo(() => {
    if (!selectedContinent || !selectedCountry) return [];
    return leagues.filter((l) => l.continent === selectedContinent && l.country === selectedCountry);
  }, [leagues, selectedContinent, selectedCountry]);

  const handleContinentClick = (continentName: string) => {
    setSelectedContinent(continentName);
    const availableCountries = Array.from(
      new Set(leagues.filter((l) => l.continent === continentName).map((l) => l.country))
    );
    if (availableCountries.length > 0) {
      setSelectedCountry(availableCountries[0]);
    }
    setStep("country");
  };

  const handleCountryClick = (countryName: string) => {
    setSelectedCountry(countryName);
    setStep("league");
  };

  const handleLeagueSelect = (leagueId: string) => {
    router.replace(`/competitions?league=${leagueId}`);
  };

  if (leagues.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Barra de progreso de pasos / Breadcrumbs estilo Onboarding */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep("continent")}
            className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
              step === "continent"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            }`}
          >
            1. Continente {selectedContinent ? `(${selectedContinent})` : ""}
          </button>

          <span className="text-slate-600 font-bold">/</span>

          <button
            onClick={() => selectedContinent && setStep("country")}
            disabled={!selectedContinent}
            className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition disabled:opacity-40 ${
              step === "country"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            }`}
          >
            2. País {selectedCountry ? `(${selectedCountry})` : ""}
          </button>

          <span className="text-slate-600 font-bold">/</span>

          <button
            onClick={() => selectedCountry && setStep("league")}
            disabled={!selectedCountry}
            className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition disabled:opacity-40 ${
              step === "league"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            }`}
          >
            3. Liga Jugable
          </button>
        </div>

        {initialLeagueId && (
          <div className="text-xs text-slate-400 font-medium">
            Mostrando liga activa: <strong className="text-emerald-400">{leagues.find(l => l.id === initialLeagueId)?.name}</strong>
          </div>
        )}
      </div>

      {/* Vista de Pasos Interactivas estilo Onboarding */}
      {step === "continent" && (
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-bold text-white">Selecciona un continente</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {continents.map((continent) => (
              <button
                key={continent.name}
                onClick={() => handleContinentClick(continent.name)}
                className={`group flex flex-col justify-between rounded-2xl border-2 p-5 text-left transition-all ${
                  selectedContinent === continent.name
                    ? "border-emerald-500 bg-emerald-950/30 text-white"
                    : "border-slate-800 bg-slate-900/60 hover:border-emerald-500/60 hover:bg-slate-800/80"
                }`}
              >
                <div className="mb-3 text-3xl">🌍</div>
                <div>
                  <div className="font-bold text-white text-base group-hover:text-emerald-400 transition">
                    {continent.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {continent.count} {continent.count === 1 ? "liga jugable" : "ligas jugables"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "country" && (
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              Países con ligas jugables en <span className="text-emerald-400">{selectedContinent}</span>
            </h2>
            <button
              onClick={() => setStep("continent")}
              className="text-xs font-bold text-slate-400 hover:text-white transition"
            >
              ← Cambiar continente
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {countries.map((c) => (
              <button
                key={c.name}
                onClick={() => handleCountryClick(c.name)}
                className={`group flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${
                  selectedCountry === c.name
                    ? "border-emerald-500 bg-emerald-950/30 text-white"
                    : "border-slate-800 bg-slate-900/60 hover:border-emerald-500/60 hover:bg-slate-800/80"
                }`}
              >
                <div>
                  <div className="font-bold text-white text-sm group-hover:text-emerald-400 transition">
                    {c.name}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {c.count} {c.count === 1 ? "liga jugable" : "ligas jugables"}
                  </div>
                </div>
                <span className="text-slate-500 group-hover:text-emerald-400 transition">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "league" && (
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              Ligas jugables en <span className="text-emerald-400">{selectedCountry}</span>
            </h2>
            <button
              onClick={() => setStep("country")}
              className="text-xs font-bold text-slate-400 hover:text-white transition"
            >
              ← Cambiar país
            </button>
          </div>
          {filteredLeagues.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              No hay ligas jugables disponibles para este país.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLeagues.map((l) => (
                <button
                  key={l.id}
                  onClick={() => handleLeagueSelect(l.id)}
                  className={`group flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                    initialLeagueId === l.id
                      ? "border-emerald-500 bg-emerald-950/40 text-white ring-2 ring-emerald-500/30"
                      : "border-slate-800 bg-slate-900/60 hover:border-emerald-500/60 hover:bg-slate-800/80"
                  }`}
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-800 font-bold text-emerald-400 text-lg">
                    ⚽
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-white text-base group-hover:text-emerald-400 transition">
                      {l.name}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {l.teamCount} equipos compitiendo
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
