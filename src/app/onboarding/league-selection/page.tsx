"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Continent = { name: string; count: number };
type Country = { name: string };
type League = {
  id: string;
  name: string;
  imageUrl: string | null;
  eaId: string | null;
  country: string;
  continent: string;
};

export default function LeagueSelectionPage() {
  const router = useRouter();
  const [step, setStep] = useState<"continent" | "country" | "league">("continent");
  const [continents, setContinents] = useState<Continent[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedContinent, setSelectedContinent] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchContinents();
  }, []);

  const fetchContinents = async () => {
    try {
      const res = await fetch("/api/leagues");
      const data = await res.json();
      setContinents(data);
    } catch {
      setError("Error al cargar continentes");
    }
  };

  const fetchCountries = async (continent: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/leagues?continent=${encodeURIComponent(continent)}`);
      const data = await res.json();
      setCountries(data);
      setSelectedContinent(continent);
      setStep("country");
    } catch {
      setError("Error al cargar países");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeagues = async (continent: string, country: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/leagues?continent=${encodeURIComponent(continent)}&country=${encodeURIComponent(country)}`);
      const data = await res.json();
      setLeagues(data);
      setSelectedCountry(country);
      setStep("league");
    } catch {
      setError("Error al cargar ligas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeagueSelect = (league: League) => {
    router.push(`/onboarding/team-selection?leagueId=${league.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 px-4 py-12">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-pitch mb-2">Elige tu liga</h1>
          <p className="text-slate-500">Paso 1 de 2: Selecciona continente, país y liga</p>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          <button
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              step === "continent"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            onClick={() => setStep("continent")}
            disabled={isLoading}
          >
            Continente
          </button>
          <span className="text-slate-300">/</span>
          <button
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              step === "country"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            onClick={() => selectedContinent && setStep("country")}
            disabled={isLoading || !selectedContinent}
          >
            País
          </button>
          <span className="text-slate-300">/</span>
          <button
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              step === "league"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            onClick={() => selectedCountry && setStep("league")}
            disabled={isLoading || !selectedCountry}
          >
            Liga
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {step === "continent" && (
          <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
            <h2 className="text-xl font-bold text-pitch mb-6">Selecciona un continente</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {continents.map((continent) => (
                <button
                  key={continent.name}
                  onClick={() => fetchCountries(continent.name)}
                  disabled={isLoading}
                  className="p-6 rounded-2xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left"
                >
                  <div className="text-4xl mb-2">🌍</div>
                  <div className="font-semibold text-pitch">{continent.name}</div>
                  <div className="text-sm text-slate-500">{continent.count} ligas</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "country" && (
          <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-pitch">Países en {selectedContinent}</h2>
              <button
                onClick={() => setStep("continent")}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                ← Cambiar continente
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {countries.map((country) => (
                <button
                  key={country.name}
                  onClick={() => fetchLeagues(selectedContinent, country.name)}
                  disabled={isLoading}
                  className="p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left"
                >
                  <div className="font-medium text-pitch">{country.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "league" && (
          <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-pitch">Ligas en {selectedCountry}</h2>
              <button
                onClick={() => setStep("country")}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                ← Cambiar país
              </button>
            </div>
            {leagues.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No hay ligas disponibles para este país
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {leagues.map((league) => (
                  <button
                    key={league.id}
                    onClick={() => handleLeagueSelect(league)}
                    disabled={isLoading}
                    className="p-4 rounded-2xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4">
                      {league.imageUrl && (
                        <img
                          src={league.imageUrl}
                          alt={league.name}
                          className="w-14 h-14 rounded-lg object-cover bg-slate-100"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-pitch truncate">{league.name}</div>
                        <div className="text-sm text-slate-500">{league.country}</div>
                      </div>
                      <svg className="w-6 h-6 text-slate-300 group-hover:text-emerald-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}