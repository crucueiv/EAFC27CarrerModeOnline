"use client";

import { signIn, useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Users, TrendingUp } from "lucide-react";
import { PageTitle } from "@/components/providers/PageTitleProvider";

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <svg
          className="h-10 w-10 animate-spin text-[var(--accent-cyan)]"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  return (
    <PageTitle title="Inicio">
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-3xl text-center">
          <div className="mb-10">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-cyan)]">
              Modo Carrera Online
            </p>
            <h1 className="font-display text-5xl font-extrabold tracking-wide text-[var(--text-primary)] md:text-7xl">
              EAFC27
              <span className="text-[var(--accent-cyan)]"> Carrera Online</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-[var(--text-secondary)] md:text-lg">
              Gestiona tu club, negocia fichajes, compite contra otros managers y lleva a tu
              equipo a la gloria.
            </p>
          </div>

          <div className="bento-card mx-auto max-w-xl p-8 text-center md:p-12">
            <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--accent-cyan-soft)]">
              <svg
                className="h-9 w-9 text-[var(--accent-cyan)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-extrabold tracking-wide text-[var(--text-primary)]">
              Inicia tu carrera
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {session
                ? "Bienvenido de vuelta, continúa con tu perfil"
                : "Conecta con Google y crea tu perfil de manager en segundos"}
            </p>

            {session ? (
              <button
                onClick={handleContinue}
                disabled={isLoading}
                className="btn-primary-gaming mx-auto mt-7 w-full max-w-xs"
                style={{ color: "#001016" }}
              >
                {isLoading
                  ? "Cargando..."
                  : session.user?.clubTeamId
                    ? "Ir a tu Dashboard"
                    : "Crear tu perfil de manager"}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="btn-primary-gaming mx-auto mt-7 w-full max-w-xs"
                style={{ color: "#001016" }}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
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

            <p className="mt-6 text-xs text-[var(--text-secondary)]">
              Al continuar, aceptas nuestros{" "}
              <Link href="#" className="text-[var(--accent-cyan)] hover:underline">
                Términos de servicio
              </Link>{" "}
              y{" "}
              <Link href="#" className="text-[var(--accent-cyan)] hover:underline">
                Política de privacidad
              </Link>
              .
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 text-center sm:grid-cols-3">
            <FeatureCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="Fichajes reales"
              description="Negocia con otros managers"
            />
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="Multijugador"
              description="Compite contra managers reales"
            />
            <FeatureCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="Datos oficiales EA"
              description="Ratings y plantillas actualizadas"
            />
          </div>
        </div>
      </div>
    </PageTitle>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bento-card text-left">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--accent-cyan-soft)] text-[var(--accent-cyan)]">
        {icon}
      </div>
      <h3 className="font-display text-base font-extrabold tracking-wide text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}
