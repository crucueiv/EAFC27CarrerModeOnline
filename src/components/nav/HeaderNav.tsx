"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Inbox, ChevronDown, LogOut, UserCircle } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { getUnreadCount } from "@/lib/inbox/inboxStore";
import InboxModal from "@/components/inbox/InboxModal";
import { useTheme } from "@/components/theme/ThemeProvider";

const links = [
  ["Dashboard", "/dashboard"],
  ["Calendario", "/calendar"],
  ["Plantilla", "/squad"],
  ["Alineación", "/lineup"],
  ["Competiciones", "/competitions"],
  ["Traspasos", "/transfers"],
  ["Ratings", "/admin/ratings"],
] as const;

export default function HeaderNav() {
  const { mode, toggleMode, primaryColor, secondaryColor } = useTheme();
  const { status, data: session } = useSession();
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

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md shadow-sm">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/dashboard" className="group flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-3 py-1.5 shadow-lg transition group-hover:border-emerald-500/50">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-emerald-500 text-sm font-black text-slate-950 shadow-md">
                🏆
              </span>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  CAREER MODE
                </span>
                <span className="text-sm font-black tracking-tight text-white">
                  EAFC27 ONLINE
                </span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {status === "authenticated" && session?.user?.clubTeamId && (
              <div className="hidden flex-wrap items-center gap-5 text-sm font-bold text-slate-300 sm:flex">
                {links.map(([label, href]) => (
                  <Link key={href} href={href} className="transition hover:text-emerald-400">
                    {label}
                  </Link>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 border-l border-[var(--theme-border)] pl-4">
              <button
                type="button"
                onClick={toggleMode}
                className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] text-[var(--theme-foreground)] transition hover:opacity-90"
                title={mode === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
                aria-label={mode === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
              >
                {mode === "dark" ? "☀️" : "🌙"}
              </button>

              <button
                onClick={() => setIsInboxOpen(true)}
                className="relative grid h-10 w-10 place-items-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] text-[var(--theme-foreground)] transition hover:opacity-90"
                title="Sección de Correos"
                aria-label="Abrir sección de correos"
              >
                <Inbox className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-[var(--theme-surface)] animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {status === "authenticated" ? (
                <div className="relative">
                  {session?.user?.email === "crucescuetoivan@gmail.com" && (
                    <Link
                      href="/admin"
                      className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm font-medium text-[var(--theme-foreground)] transition hover:opacity-90"
                      title="Panel de administración"
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAccountMenuOpen((value) => !value)}
                    className="flex items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm font-medium text-[var(--theme-foreground)] transition hover:opacity-90"
                    aria-label="Gestión de cuenta"
                  >
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="Avatar" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <UserCircle className="h-5 w-5" />
                    )}
                    <span className="hidden sm:inline">Cuenta</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {isAccountMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-2 shadow-lg">
                      <div className="rounded-lg px-3 py-2 text-sm text-[var(--theme-muted)]">
                        {session?.user?.name || "Manager"}
                      </div>
                      <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--theme-foreground)] transition hover:bg-[var(--theme-background)]"
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
                  className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm font-medium text-[var(--theme-foreground)] transition hover:opacity-90"
                >
                  Iniciar sesión
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {isInboxOpen && <InboxModal onClose={() => setIsInboxOpen(false)} />}
    </>
  );
}
