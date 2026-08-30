"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUnreadCount } from "@/lib/inbox/inboxStore";
import InboxModal from "@/components/inbox/InboxModal";

const links = [
  ["Dashboard", "/dashboard"],
  ["Calendario", "/calendar"],
  ["Plantilla", "/squad"],
  ["Traspasos", "/transfers"],
  ["Ratings", "/admin/ratings"],
] as const;

export default function HeaderNav() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isInboxOpen, setIsInboxOpen] = useState(false);

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
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/dashboard" className="text-xl font-black tracking-tight text-pitch">
            EAFC27 Online
          </Link>

          <div className="flex items-center gap-6">
            <div className="hidden flex-wrap items-center gap-5 text-sm font-medium text-slate-600 sm:flex">
              {links.map(([label, href]) => (
                <Link key={href} href={href} className="transition hover:text-pitch">
                  {label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
              <button
                onClick={() => setIsInboxOpen(true)}
                className="relative grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition"
                title="Sección de Correos"
                aria-label="Abrir sección de correos"
              >
                <span className="text-lg">📬</span>
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {isInboxOpen && (
        <InboxModal onClose={() => setIsInboxOpen(false)} />
      )}
    </>
  );
}
