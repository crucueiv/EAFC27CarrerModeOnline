"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  ClipboardList,
  Trophy,
  ArrowLeftRight,
  Star,
  Settings,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  label: string;
  short: string;
  href: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", short: "Dash", href: "/dashboard", icon: LayoutDashboard },
  { label: "Calendario", short: "Cal", href: "/calendar", icon: Calendar },
  { label: "Plantilla", short: "Plan", href: "/squad", icon: Users },
  { label: "Alineación", short: "Alin", href: "/lineup", icon: ClipboardList },
  { label: "Competiciones", short: "Comp", href: "/competitions", icon: Trophy },
  { label: "Traspasos", short: "Tras", href: "/transfers", icon: ArrowLeftRight },
  { label: "Ratings", short: "Rate", href: "/admin/ratings", icon: Star },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();
  const { status } = useSession();
  const isAuthed = status === "authenticated";

  return (
    <>
      {/* Sidebar fija en desktop / tablet */}
      <aside
        className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-[72px] flex-col items-center border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] py-5"
        aria-label="Navegación principal"
      >
        <Link
          href="/dashboard"
          className="mb-6 grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-subtle)] bg-gradient-to-br from-amber-400 to-emerald-500 text-lg shadow-md"
          title="EAFC27 Online"
        >
          🏆
        </Link>

        <nav className="flex w-full flex-1 flex-col items-stretch gap-1 px-2">
          {isAuthed &&
            NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "group relative flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 transition",
                    active
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  ].join(" ")}
                  title={item.label}
                  aria-current={active ? "page" : undefined}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent-cyan)] shadow-[0_0_10px_rgba(0,229,255,0.6)]"
                    />
                  )}
                  <Icon
                    className={[
                      "h-[18px] w-[18px] transition",
                      active ? "stroke-[2.25]" : "stroke-[1.6]",
                    ].join(" ")}
                  />
                  <span
                    className={[
                      "text-[10px] font-semibold tracking-wider uppercase",
                      active ? "opacity-100 font-bold" : "opacity-70",
                    ].join(" ")}
                  >
                    {item.short}
                  </span>
                </Link>
              );
            })}

          {!isAuthed && (
            <Link
              href="/"
              className="mt-2 flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <LayoutDashboard className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                Inicio
              </span>
            </Link>
          )}
        </nav>

        <Link
          href="/admin"
          className={[
            "mt-auto flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 transition",
            isActive(pathname, "/admin") && pathname !== "/admin/ratings"
              ? "text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          ].join(" ")}
          title="Ajustes"
        >
          <Settings className="h-[18px] w-[18px]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
            Ajustes
          </span>
        </Link>
      </aside>

      {/* Bottom bar en móvil */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-2 py-2 backdrop-blur"
        aria-label="Navegación inferior"
      >
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5",
                active ? "text-[var(--accent-cyan)]" : "text-[var(--text-secondary)]",
              ].join(" ")}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] font-semibold uppercase tracking-wider">
                {item.short}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
