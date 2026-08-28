"use client";

import { useEffect, useState } from "react";
import {
  getInboxMessages,
  markEmailAsRead,
  type EmailMessage
} from "@/lib/inbox/inboxStore";

export default function InboxModal({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [showNegotiationToast, setShowNegotiationToast] = useState(false);

  useEffect(() => {
    const list = getInboxMessages();
    setMessages(list);
    if (list.length > 0) {
      setSelectedEmail(list[0]);
      if (!list[0].read) {
        markEmailAsRead(list[0].id);
      }
    }
  }, []);

  const handleSelectEmail = (msg: EmailMessage) => {
    setSelectedEmail(msg);
    if (!msg.read) {
      markEmailAsRead(msg.id);
      setMessages(getInboxMessages());
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-lg">
              📬
            </span>
            <div>
              <h2 className="text-lg font-bold">Sección de Correos</h2>
              <p className="text-xs text-slate-400">manager@northbridge-fc.com</p>
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

        {/* Mailbox Content Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel: Mail List */}
          <div className="w-1/3 min-w-[260px] border-r border-slate-200 bg-slate-50 overflow-y-auto">
            <div className="p-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Bandeja de entrada ({messages.length})
              </span>
            </div>
            <div className="divide-y divide-slate-200/80">
              {messages.map((msg) => {
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
                        <span className="font-bold text-slate-800 truncate">{msg.from.split("@")[0]}</span>
                        <span className="text-[10px] text-slate-400">{msg.date}</span>
                      </div>
                      <p className={`mt-0.5 text-xs truncate ${!msg.read ? "font-bold text-slate-900" : "text-slate-600"}`}>
                        {msg.subject}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Mail Reader */}
          <div className="flex-1 overflow-y-auto bg-white p-6">
            {selectedEmail ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {selectedEmail.subject}
                  </h3>
                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs text-slate-600 space-y-1">
                    <div>
                      <strong className="text-slate-800">De:</strong> {selectedEmail.from}
                    </div>
                    <div>
                      <strong className="text-slate-800">Para:</strong> {selectedEmail.to}
                    </div>
                    <div>
                      <strong className="text-slate-800">Fecha:</strong> {selectedEmail.date}
                    </div>
                  </div>
                </div>

                <div className="whitespace-pre-line text-sm leading-relaxed text-slate-800 border-t border-slate-100 pt-4">
                  {selectedEmail.body}
                </div>

                {selectedEmail.playerId !== "system" && (
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

      {/* Negotiation Toast/Modal */}
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
