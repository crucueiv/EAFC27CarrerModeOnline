"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Inbox, ChevronDown, LogOut, UserCircle, Wallet, Activity } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { getUnreadCount } from "@/lib/inbox/inboxStore";
import InboxModal from "@/components/inbox/InboxModal";
import { usePageTitle } from "@/components/providers/PageTitleProvider";

export default function HeaderNav() {
  const { data: session, status } = useSession();
  const { title } = usePageTitle();
  const avatarSrc = session?.user?.avatarUrl || session?.user?.image;
  const [unreadCount, setUnreadCount] = useState(0);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const count = await getUnreadCount();
        if (!cancelled) setUnreadCount(count);
      } catch {
        if (!cancelled) setUnreadCount(0);
      }
    };
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isInboxOpen]);

  useEffect(() => {
    const handler = () => setIsInboxOpen(true);
    window.addEventListener("open-inbox", handler);
    return () => window.removeEventListener("open-inbox", handler);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        {/* Fila 1 — Marca */}
        <div className="border-b border-[var(--border-subtle)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
            <Link href="/dashboard" className="group flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-subtle)] bg-gradient-to-br from-amber-400 to-emerald-500 text-base shadow-md">
                🏆
              </span>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-cyan)]">
                  Career Mode
                </span>
                <span className="font-display text-lg font-extrabold tracking-wide text-[var(--text-primary)]">
                  EAFC27 Online
                </span>
              </div>
            </Link>

            <div className="hidden sm:flex items-center gap-2">
              <div className="stat-cluster">
                <Activity className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
                <span className="stat-value">LIVE</span>
                <span className="stat-label">Temporada activa</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fila 2 — Título de página + stats + cuenta */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3.5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Sección
            </p>
            <h1 className="font-display truncate text-2xl font-extrabold tracking-wide text-[var(--text-primary)]">
              {title || "Inicio"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {status === "authenticated" && session?.user?.clubTeamId && (
              <div className="hidden md:flex items-center gap-2">
                <div className="stat-cluster">
                  <Wallet className="h-3.5 w-3.5 text-[var(--accent-green)]" />
                  <span className="stat-value">—</span>
                  <span className="stat-label">Presupuesto</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setIsInboxOpen(true)}
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-primary)] transition hover:border-[var(--accent-cyan)]/40"
              title="Sección de Correos"
              aria-label="Abrir sección de correos"
            >
              <Inbox className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-[var(--bg-surface)] animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {status === "authenticated" ? (
              <div className="relative">
                {session?.user?.email === "crucescuetoivan@gmail.com" && (
                  <Link
                    href="/admin"
                    className="mr-2 inline-flex items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-cyan)]/40"
                    title="Panel de administración"
                  >
                    Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((value) => !value)}
                  className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-cyan)]/40"
                  aria-label="Gestión de cuenta"
                >
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt="Avatar"
                      className="h-7 w-7 rounded-full object-cover ring-1 ring-[var(--border-subtle)]"
                    />
                  ) : (
                    <UserCircle className="h-5 w-5 text-[var(--text-secondary)]" />
                  )}
                  <span className="hidden sm:inline">Cuenta</span>
                  <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
                </button>

                {isAccountMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 shadow-2xl">
                    <div className="rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)]">
                      {session?.user?.name || "Manager"}
                    </div>
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--text-primary)] transition hover:bg-white/5"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/"
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-cyan)]/40"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </header>

      {isInboxOpen && <InboxModal onClose={() => setIsInboxOpen(false)} />}
    </>
  );
}
