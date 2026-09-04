"use client";

import { signIn, useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    signIn("google", { callbackUrl: "/onboarding/profile" });
  };

  const handleContinue = () => {
    setIsLoading(true);
    if (session?.user?.clubTeamId) {
      router.push("/dashboard");
    } else {
      router.push("/onboarding/profile");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[var(--theme-background)] flex items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-[var(--theme-accent)]" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--theme-background)] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl text-center">
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-black text-[var(--theme-primary)] tracking-tight mb-6">
            EAFC27
            <span className="text-[var(--theme-accent)]"> Carrera Online</span>
          </h1>
          <p className="text-xl md:text-2xl text-[var(--theme-muted)] max-w-2xl mx-auto">
            Gestiona tu club, negocia fichajes, compite contra otros managers y lleva a tu equipo a la gloria.
          </p>
        </div>

        <div className="bg-[var(--theme-card)] rounded-3xl shadow-xl p-8 md:p-12 border border-[var(--theme-border)]">
          <div className="mb-8">
            <div className="mx-auto w-20 h-20 rounded-full bg-[var(--theme-accent-soft)] flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-[var(--theme-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[var(--theme-primary)] mb-2">Inicia tu carrera</h2>
            <p className="text-[var(--theme-muted)]">
              {session
                ? "Bienvenido de vuelta, continúa con tu perfil"
                : "Conecta con Google y crea tu perfil de manager en segundos"}
            </p>
          </div>

          {session ? (
            <button
              onClick={handleContinue}
              disabled={isLoading}
              className="w-full max-w-xs mx-auto flex items-center justify-center gap-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] transition py-4 px-8 text-slate-950 font-extrabold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? "Cargando..."
                : session.user?.clubTeamId
                ? "Ir a tu Dashboard →"
                : "Crear tu perfil de manager →"}
            </button>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full max-w-xs mx-auto flex items-center justify-center gap-3 rounded-xl bg-[var(--theme-foreground)] hover:opacity-90 active:scale-[0.98] transition py-4 px-8 text-[var(--theme-background)] font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isLoading ? "Conectando..." : "Iniciar sesión con Google"}
            </button>
          )}

          <p className="mt-6 text-sm text-[var(--theme-muted)]">
            Al continuar, aceptas nuestros{" "}
            <a href="#" className="underline hover:opacity-80">
              Términos de servicio
            </a>{" "}
            y{" "}
            <a href="#" className="underline hover:opacity-80">
              Política de privacidad
            </a>
          </p>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-6 text-center">
          <div className="p-4">
            <div className="mx-auto w-12 h-12 rounded-xl bg-[var(--theme-accent-soft)] flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-[var(--theme-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="font-semibold text-[var(--theme-primary)]">Fichajes reales</h3>
            <p className="text-sm text-[var(--theme-muted)] mt-1">Negocia con otros managers</p>
          </div>
          <div className="p-4">
            <div className="mx-auto w-12 h-12 rounded-xl bg-[var(--theme-accent-soft)] flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-[var(--theme-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-[var(--theme-primary)]">Multijugador</h3>
            <p className="text-sm text-[var(--theme-muted)] mt-1">Compite contra managers reales</p>
          </div>
          <div className="p-4">
            <div className="mx-auto w-12 h-12 rounded-xl bg-[var(--theme-accent-soft)] flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-[var(--theme-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="font-semibold text-[var(--theme-primary)]">Datos oficiales EA</h3>
            <p className="text-sm text-[var(--theme-muted)] mt-1">Ratings y plantillas actualizadas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
