"use client";

import { useEffect, useState, useCallback } from "react";
import { getInboxMessages, markEmailAsRead, type EmailMessage } from "@/lib/inbox/inboxStore";

export default function InboxModal({ onClose }: { onClose: () => void }) {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [showNegotiationToast, setShowNegotiationToast] = useState(false);

  const loadEmails = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getInboxMessages();
      setEmails(data);
    } catch (err) {
      console.error("Error loading emails:", err);
      setEmails([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  useEffect(() => {
    if (emails.length > 0 && !selectedEmail) {
      setSelectedEmail(emails[0]);
    }
  }, [emails, selectedEmail]);

  const handleSelectEmail = (msg: EmailMessage) => {
    setSelectedEmail(msg);
    if (!msg.read) {
      markEmailAsRead(msg.id).then(() => {
        setEmails((prev) => prev.map((e) => (e.id === msg.id ? { ...e, read: true } : e)));
      });
    }
  };

  const unreadCount = emails.filter((e) => !e.read).length;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("es-ES", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return dateStr;
    }
  };

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case "CLUB_NEGOTIATION":
        return "🤝";
      case "RELEASE_CLAUSE":
        return "⚠️";
      case "MATCH_RESULT":
        return "⚽";
      default:
        return "📧";
    }
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case "CLUB_NEGOTIATION":
        return "bg-emerald-100 text-emerald-700";
      case "RELEASE_CLAUSE":
        return "bg-rose-100 text-rose-700";
      case "MATCH_RESULT":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-lg">
              📬
            </span>
            <div>
              <h2 className="text-lg font-bold">Sección de Correos</h2>
              <p className="text-xs text-slate-400">
                {unreadCount > 0 ? `${unreadCount} sin leer` : "Todo leído"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/3 min-w-[260px] border-r border-slate-200 bg-slate-50 overflow-y-auto">
            <div className="p-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Bandeja de entrada ({emails.length})
              </span>
            </div>
            {isLoading ? (
              <div className="p-6 text-center text-sm text-slate-400">Cargando...</div>
            ) : (
              <div className="divide-y divide-slate-200/80">
                {emails.map((msg) => {
                  const isSelected = selectedEmail?.id === msg.id;
                  return (
                    <button
                      key={msg.id}
                      onClick={() => handleSelectEmail(msg)}
                      className={`w-full text-left p-3.5 transition flex items-start gap-2.5 ${
                        isSelected
                          ? "bg-indigo-50 border-l-4 border-indigo-600"
                          : "hover:bg-slate-100/80 bg-white"
                      }`}
                    >
                      {!msg.read && (
                        <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-rose-500 shadow-sm" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 truncate flex items-center gap-1">
                            <span className="text-sm">{getTypeIcon(msg.metadata?.type || null)}</span>
                            {msg.from.split("@")[0]}
                          </span>
                          <span className="text-[10px] text-slate-400">{formatDate(msg.createdAt)}</span>
                        </div>
                        <p className={`mt-0.5 text-xs truncate ${!msg.read ? "font-bold text-slate-900" : "text-slate-600"}`}>
                          {msg.subject}
                        </p>
                        {msg.metadata?.type && (
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${getTypeColor(msg.metadata.type)}`}>
                            {msg.metadata.type === "CLUB_NEGOTIATION" ? "Negociación" : msg.metadata.type === "RELEASE_CLAUSE" ? "Cláusula" : msg.metadata.type}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {emails.length === 0 && (
                  <div className="p-6 text-center text-sm text-slate-400">
                    No hay correos aún
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-white p-6">
            {selectedEmail ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {selectedEmail.metadata?.type && (
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getTypeColor(selectedEmail.metadata.type)}`}>
                        {getTypeIcon(selectedEmail.metadata.type)} {selectedEmail.metadata.type === "CLUB_NEGOTIATION" ? "Negociación de traspaso" : selectedEmail.metadata.type === "RELEASE_CLAUSE" ? "Cláusula de rescisión" : selectedEmail.metadata.type}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {selectedEmail.subject}
                  </h3>
                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs text-slate-600 space-y-1">
                    <div>
                      <strong className="text-slate-800">De:</strong> {selectedEmail.from}
                    </div>
                    <div>
                      <strong className="text-slate-800">Fecha:</strong> {formatDate(selectedEmail.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="whitespace-pre-line text-sm leading-relaxed text-slate-800 border-t border-slate-100 pt-4">
                  {selectedEmail.body}
                </div>

                {selectedEmail.metadata?.playerName && selectedEmail.metadata.playerName !== "Sistema" && (
                  <div className="border-t border-slate-100 pt-4">
                    <button
                      onClick={() => setShowNegotiationToast(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:scale-98 transition"
                    >
                      📝 Iniciar negociaciones de contrato
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid h-full place-items-center text-sm text-slate-400">
                Selecciona un correo para leerlo
              </div>
            )}
          </div>
        </div>
      </div>

      {showNegotiationToast && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-indigo-100 text-indigo-600 text-xl">
              📋
            </div>
            <h4 className="text-lg font-bold text-slate-900">Negociación de Contrato</h4>
            <p className="text-sm text-slate-600">
              Próximamente: Sistema interactivo de negociación contractual con el agente del jugador para acordar salario, años de contrato y cláusulas adicionales.
            </p>
            <button
              onClick={() => setShowNegotiationToast(false)}
              className="mt-2 rounded-xl bg-slate-900 py-2.5 px-6 font-bold text-white hover:bg-slate-800"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
