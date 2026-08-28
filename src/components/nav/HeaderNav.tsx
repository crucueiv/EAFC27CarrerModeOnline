"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUnreadCount } from "@/lib/inbox/inboxStore";
import InboxModal from "@/components/inbox/InboxModal";

const links = [
  ["Inicio", "/"],
  ["Calendario", "/calendar"],
  ["Plantilla", "/squad"],
  ["Traspasos", "/transfers"],
  ["Ratings", "/admin/ratings"]
] as const;

export default function HeaderNav() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [showProfileToast, setShowProfileToast] = useState(false);

  const updateUnread = () => {
    setUnreadCount(getUnreadCount());
  };

  useEffect(() => {
    updateUnread();
    const handleInboxUpdate = () => updateUnread();
    window.addEventListener("inbox-updated", handleInboxUpdate);
    return () => {
      window.removeEventListener("inbox-updated", handleInboxUpdate);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" className="text-xl font-black tracking-tight text-pitch">
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

            {/* Top Right Action Icons: Mail & Profile */}
            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
              {/* Mailbox Icon with Red Dot Badge */}
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

              {/* Profile Icon (Placeholder for Login/Auth) */}
              <button
                onClick={() => setShowProfileToast(true)}
                className="relative grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition"
                title="Perfil de usuario (Próximamente)"
                aria-label="Perfil de usuario"
              >
                <span className="text-lg">👤</span>
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Inbox Modal */}
      {isInboxOpen && (
        <InboxModal
          onClose={() => {
            setIsInboxOpen(false);
            updateUnread();
          }}
        />
      )}

      {/* Profile Toast / Notice */}
      {showProfileToast && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-700 text-2xl">
              👤
            </div>
            <h4 className="text-lg font-bold text-slate-900">Perfil de Usuario</h4>
            <p className="text-sm text-slate-600">
              Próximamente: Inicio de sesión, gestión de perfil de mánager y configuración de club.
            </p>
            <button
              onClick={() => setShowProfileToast(false)}
              className="mt-2 rounded-xl bg-slate-900 py-2.5 px-6 font-bold text-white hover:bg-slate-800"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
