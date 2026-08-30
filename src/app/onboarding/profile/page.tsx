"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const AvatarUpload = dynamic(() => import("@/components/onboarding/AvatarUpload").then(m => m.AvatarUpload), {
  ssr: false,
  loading: () => (
    <div className="w-full rounded-xl bg-slate-100 py-3 px-4 text-center text-slate-400">
      Cargando...
    </div>
  ),
});

export default function ProfileOnboardingPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  const validateUsername = (value: string) => {
    if (value.length < 3) {
      setUsernameError("Mínimo 3 caracteres");
      return false;
    }
    if (value.length > 20) {
      setUsernameError("Máximo 20 caracteres");
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      setUsernameError("Solo letras, números, _ y -");
      return false;
    }
    setUsernameError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUsername(username)) return;
    if (isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, avatarUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al guardar el perfil");
        return;
      }

      if (update) {
        await update({
          username: username.trim(),
          avatarUrl: avatarUrl || null,
          clubTeamId: null,
          nationalTeamId: null,
        });
      }

      router.push("/onboarding/league-selection");
      router.refresh();
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-pitch mb-2">Crea tu perfil</h1>
          <p className="text-slate-500">Paso 1 de 3: Nombre de manager y foto</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
                Nombre de manager <span className="text-rose-500">*</span>
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  validateUsername(e.target.value);
                }}
                className={`w-full rounded-xl border px-4 py-3 text-slate-900 placeholder-slate-400 transition ${
                  usernameError ? "border-rose-400 focus:ring-rose-400" : "border-slate-200 focus:ring-emerald-400"
                }`}
                placeholder="Ej: GuardiolaFan23"
                maxLength={20}
                autoComplete="username"
                disabled={isLoading}
              />
              {usernameError && (
                <p className="mt-1 text-sm text-rose-500">{usernameError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Foto de perfil <span className="text-slate-400">(opcional)</span>
              </label>
              <AvatarUpload onUpload={setAvatarUrl} />
            </div>

            <button
              type="submit"
              disabled={isLoading || !username.trim() || !!usernameError}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition py-3.5 px-6 text-white font-bold text-lg shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Guardando...
                </>
              ) : (
                "Continuar →"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}