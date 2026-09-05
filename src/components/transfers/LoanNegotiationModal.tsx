"use client";

import { useState, useEffect } from "react";
import { PhoneOff, PhoneCall, Send, AlertTriangle } from "lucide-react";
import { getManagerAction } from "@/app/api/managers/managers";
import { calculateLoanWageShare, calculateLoanWageCost } from "@/lib/transfers/loanEngine";

export type LoanDuration = "SHORT_TERM" | "ONE_YEAR" | "TWO_YEARS";

type LoanProposal = {
  duration: LoanDuration;
  wageShareBuyerPct: number;
  hasBuyOption: boolean;
  buyOptionPrice: number | null;
};

type Props = {
  open: boolean;
  playerName: string;
  sellerTeamName: string;
  sellerTeamId?: string;
  managerName?: string;
  managerAvatarUrl?: string;
  initialMessage: string;
  schedule: {
    startsAt: string;
    endsAt: string;
    weeks: number;
  };
  totalWageCost: number;
  weeklyWage?: number;
  loanId: string;
  onClose: () => void;
  onCompleted: () => void;
};

const FALLBACK_AVATAR = "https://res.cloudinary.com/oiugg8m6/image/upload/v1788133891/qvbsomljzzcmickbhyad.png";

export default function LoanNegotiationModal({
  open,
  playerName,
  sellerTeamName,
  sellerTeamId,
  managerName: initialManagerName,
  managerAvatarUrl: initialManagerAvatarUrl,
  initialMessage,
  schedule,
  totalWageCost,
  weeklyWage = 0,
  loanId,
  onClose,
  onCompleted,
}: Props) {
  const [proposal, setProposal] = useState<LoanProposal>({
    duration: "ONE_YEAR",
    wageShareBuyerPct: 50,
    hasBuyOption: false,
    buyOptionPrice: null,
  });
  const [messages, setMessages] = useState<{ from: "manager" | "me"; text: string }[]>([
    { from: "manager", text: initialMessage },
  ]);
  const [tension, setTension] = useState(20);
  const [status, setStatus] = useState<string>("PROPOSED");
  const [busy, setBusy] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // BUG FIX (bug 3): resolver el mánager rival real con la misma estrategia
  // que ClubNegotiationModal. Antes el modal siempre caía al literal
  // "Mánager rival" porque no se consultaba el endpoint.
  const [managerName, setManagerName] = useState<string>(
    initialManagerName || "Cargando Mánager...",
  );
  const [managerAvatar, setManagerAvatar] = useState<string | null>(
    initialManagerAvatarUrl || null,
  );
  const [isLoadingManager, setIsLoadingManager] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setSecondsElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setManagerName(initialManagerName || "Cargando Mánager...");
    setManagerAvatar(initialManagerAvatarUrl || null);
    setIsLoadingManager(true);
    if (!sellerTeamId) {
      setManagerName(
        initialManagerName || `Cuerpo técnico de ${sellerTeamName}`,
      );
      setManagerAvatar(initialManagerAvatarUrl || FALLBACK_AVATAR);
      setIsLoadingManager(false);
      return () => {
        cancelled = true;
      };
    }
    getManagerAction(sellerTeamId)
      .then((mgr) => {
        if (cancelled) return;
        setManagerName(mgr.name);
        setManagerAvatar(mgr.avatarUrl);
      })
      .catch(() => {
        if (cancelled) return;
        setManagerName(
          initialManagerName || `Cuerpo técnico de ${sellerTeamName}`,
        );
        setManagerAvatar(initialManagerAvatarUrl || FALLBACK_AVATAR);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingManager(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, sellerTeamId, initialManagerName, initialManagerAvatarUrl, sellerTeamName]);

  if (!open) return null;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const getTensionColor = () => {
    if (tension < 40) return "bg-emerald-500";
    if (tension < 75) return "bg-amber-500";
    return "bg-rose-600";
  };

  const currentWeeklyWage = weeklyWage > 0
    ? weeklyWage
    : schedule.weeks > 0
      ? Math.round((totalWageCost / schedule.weeks) / (proposal.wageShareBuyerPct / 100 || 1))
      : 0;
  const currentBuyerWeekly = calculateLoanWageShare(currentWeeklyWage, proposal.wageShareBuyerPct);
  const currentTotalWage = calculateLoanWageCost(currentWeeklyWage, proposal.wageShareBuyerPct, schedule.weeks);

  async function send(action: "COUNTER" | "ACCEPT" | "REJECT" | "HANGUP") {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/loans/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId,
          action,
          counterDuration: action === "COUNTER" ? proposal.duration : undefined,
          counterWageShareBuyerPct: action === "COUNTER" ? proposal.wageShareBuyerPct : undefined,
          counterHasBuyOption: action === "COUNTER" ? proposal.hasBuyOption : undefined,
          counterBuyOptionPrice:
            action === "COUNTER" && proposal.hasBuyOption ? proposal.buyOptionPrice : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages((m) => [...m, { from: "me", text: `Error: ${data.error}` }]);
      } else {
        setTension(data.tension ?? tension);
        setStatus(data.status ?? status);
        setMessages((m) => [
          ...m,
          { from: "me", text: describeProposal(data.proposed || proposal) },
          { from: "manager", text: data.message ?? "He analizado tu propuesta." },
        ]);
        if (data.status === "ACCEPTED" || data.status === "REJECTED" || data.status === "CANCELLED") {
          setTimeout(() => onCompleted(), 1500);
        }
      }
    } catch {
      setMessages((m) => [...m, { from: "me", text: "Error de red durante la llamada." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Cabecera visual de llamada estilo Smartphone */}
        <div className="bg-slate-950 p-5 flex flex-col items-center border-b border-slate-800/80 relative">
          <div className="relative mb-3">
            <img
              src={managerAvatar || FALLBACK_AVATAR}
              alt={managerName}
              className={`w-20 h-20 rounded-full border-4 border-slate-700 object-cover shadow-lg transition-opacity duration-300 ${
                isLoadingManager ? "opacity-50 animate-pulse" : "opacity-100"
              }`}
              onError={(e) => {
                const el = e.currentTarget;
                if (!el.src.includes("qvbsomljzzcmickbhyad")) {
                  el.src = FALLBACK_AVATAR;
                }
              }}
            />
            <span className="absolute bottom-1 right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
            </span>
          </div>

          <h3 className="text-lg font-bold text-white tracking-wide">{managerName}</h3>
          <p className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">{sellerTeamName}</p>
          <p className="text-xs text-slate-400 mt-0.5">Cesión de {playerName}</p>

          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-semibold text-emerald-400">
            <PhoneCall size={13} className="animate-pulse" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>
        </div>

        {/* Barra de Tensión */}
        <div className="bg-slate-950/50 px-6 py-2 border-b border-slate-800 flex items-center justify-between gap-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle size={12} className={tension > 60 ? "text-amber-400" : "text-slate-500"} />
            Tensión de Negociación
          </span>
          <div className="flex-1 max-w-[140px] h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getTensionColor()}`}
              style={{ width: `${tension}%` }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-white">{tension}%</span>
        </div>

        {/* Historial de Mensajes / Diálogo */}
        <div className="p-4 space-y-2.5 max-h-48 overflow-y-auto bg-slate-900/60 border-b border-slate-800 text-xs">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl border ${
                m.from === "manager"
                  ? "bg-slate-800/90 border-slate-700 text-slate-200"
                  : "bg-emerald-950/40 border-emerald-800/60 text-emerald-100 ml-4"
              }`}
            >
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                {m.from === "manager" ? sellerTeamName : "Tu Propuesta"}
              </div>
              <p className="leading-relaxed font-medium">{m.text}</p>
            </div>
          ))}
        </div>

        {/* Formulario de Contraoferta */}
        <div className="p-4 bg-slate-950/80 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Duración</label>
              <select
                value={proposal.duration}
                onChange={(e) => setProposal({ ...proposal, duration: e.target.value as LoanDuration })}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="SHORT_TERM">Resto de temporada</option>
                <option value="ONE_YEAR">1 temporada (1 año)</option>
                <option value="TWO_YEARS">2 temporadas (2 años)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Sueldo asumes: <strong className="text-emerald-400">{proposal.wageShareBuyerPct}%</strong>
              </label>
              <input
                type="range"
                min={20}
                max={80}
                step={5}
                value={proposal.wageShareBuyerPct}
                onChange={(e) => setProposal({ ...proposal, wageShareBuyerPct: Number(e.target.value) })}
                className="w-full accent-emerald-500 mt-2"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="hasBuyOption"
              checked={proposal.hasBuyOption}
              onChange={(e) =>
                setProposal({
                  ...proposal,
                  hasBuyOption: e.target.checked,
                  buyOptionPrice: e.target.checked ? proposal.buyOptionPrice ?? 1_000_000 : null,
                })
              }
              className="accent-emerald-500 rounded"
            />
            <label htmlFor="hasBuyOption" className="text-xs font-semibold text-slate-300">
              Incluir opción de compra futura
            </label>
          </div>

          {proposal.hasBuyOption && (
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Precio Opción de Compra (€)</label>
              <input
                type="number"
                min={100_000}
                step={250_000}
                value={proposal.buyOptionPrice ?? 0}
                onChange={(e) => setProposal({ ...proposal, buyOptionPrice: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
              />
            </div>
          )}

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Sueldo semanal jugador:</span>
              <strong className="font-mono">{formatEuro(currentWeeklyWage)}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tú pagas ({proposal.wageShareBuyerPct}%):</span>
              <strong className="font-mono text-emerald-400">{formatEuro(currentBuyerWeekly)}/sem</strong>
            </div>
            <div className="flex items-center justify-between border-t border-slate-800 pt-1.5">
              <span className="text-slate-400">Coste total cesión ({schedule.weeks} sem):</span>
              <strong className="font-mono text-white">{formatEuro(currentTotalWage)}</strong>
            </div>
          </div>
        </div>

        {/* Botones de acción de llamada */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <button
            onClick={() => {
              send("HANGUP");
              onClose();
            }}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition"
          >
            <PhoneOff size={14} />
            Colgar
          </button>

          <button
            onClick={() => send("COUNTER")}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition"
          >
            <Send size={14} />
            Enviar Oferta
          </button>

          <button
            onClick={() => send("ACCEPT")}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition"
          >
            <PhoneCall size={14} />
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

function describeProposal(p: {
  duration?: string;
  wageShareBuyerPct?: number;
  counterWageShareBuyerPct?: number | null;
  hasBuyOption?: boolean;
  buyOptionPrice?: number | null;
  counterBuyOptionPrice?: number | null;
}) {
  const parts: string[] = [];
  if (p.duration) parts.push(durationLabel(p.duration as LoanDuration));
  if (typeof p.wageShareBuyerPct === "number") {
    parts.push(`Ofrezco ${p.wageShareBuyerPct}% del sueldo`);
    if (typeof p.counterWageShareBuyerPct === "number") {
      parts.push(`(el club pide ${p.counterWageShareBuyerPct}%)`);
    }
  }
  if (p.hasBuyOption) {
    parts.push(
      `Opción de compra: ${
        p.buyOptionPrice ? formatEuro(p.buyOptionPrice) : "acordada"
      }${
        p.counterBuyOptionPrice
          ? ` (el club pide ${formatEuro(p.counterBuyOptionPrice)})`
          : ""
      }`,
    );
  } else {
    parts.push("Sin opción de compra");
  }
  return parts.join(" · ");
}

function durationLabel(d: LoanDuration) {
  if (d === "SHORT_TERM") return "Resto de temporada";
  if (d === "ONE_YEAR") return "1 año";
  return "2 años";
}

function formatEuro(v: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, v));
}
