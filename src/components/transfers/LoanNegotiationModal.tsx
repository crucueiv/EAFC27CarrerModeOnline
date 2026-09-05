"use client";

import { useState, useEffect } from "react";
import { PhoneOff, PhoneCall, Send, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { getManagerAction } from "@/app/api/managers/managers";
import { calculateLoanWageShare, calculateLoanWageCost } from "@/lib/transfers/loanEngine";
import { RivalManagerCard } from "./RivalManagerCard";

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
  sellerTeamCrestUrl?: string | null;
  sellerTeamPrimaryColor?: string | null;
  sellerTeamShortName?: string | null;
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
  sellerTeamCrestUrl,
  sellerTeamPrimaryColor,
  sellerTeamShortName,
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
  const [lastManagerMessage, setLastManagerMessage] = useState<string>(initialMessage);
  const [tension, setTension] = useState(20);
  const [status, setStatus] = useState<string>("PROPOSED");
  const [busy, setBusy] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

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
    setCurrentStep(1);
    setLastManagerMessage(initialMessage);
    let cancelled = false;
    setManagerName(initialManagerName || "Cargando Mánager...");
    setManagerAvatar(initialManagerAvatarUrl || null);
    setIsLoadingManager(true);
    if (!sellerTeamId) {
      setManagerName(initialManagerName || `Cuerpo técnico de ${sellerTeamName}`);
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
        setManagerName(initialManagerName || `Cuerpo técnico de ${sellerTeamName}`);
        setManagerAvatar(initialManagerAvatarUrl || FALLBACK_AVATAR);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingManager(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, sellerTeamId, initialManagerName, initialManagerAvatarUrl, sellerTeamName, initialMessage]);

  if (!open) return null;

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
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
      if (data.error === "loan-finalized" ||
          data.status === "ACCEPTED" ||
          data.status === "REJECTED" ||
          data.status === "CANCELLED") {
        const finalStatus =
          data.status === "ACCEPTED" ||
          data.status === "REJECTED" ||
          data.status === "CANCELLED"
            ? data.status
            : "REJECTED";
        setStatus(finalStatus);
        setLastManagerMessage(
          data.message ?? "La cesión ya ha finalizado. Puedes colgar la llamada.",
        );
        return;
      }
      if (data.error) {
        setLastManagerMessage(`Error: ${data.error}`);
      } else {
        setTension(data.tension ?? tension);
        const nextStatusValue = data.status ?? status;
        setStatus(nextStatusValue);
        let managerMsg = data.message ?? "He analizado tu propuesta.";
        if (action === "HANGUP" && nextStatusValue === "CANCELLED") {
          managerMsg = "Has colgado la llamada. La cesión ha finalizado sin acuerdo.";
        } else if (action === "REJECT" && nextStatusValue === "REJECTED") {
          managerMsg = "Has rechazado la propuesta. La cesión ha finalizado sin acuerdo.";
        } else if (nextStatusValue === "ACCEPTED") {
          managerMsg = data.message ?? "Acuerdo alcanzado. Cerrando...";
        }
        setLastManagerMessage(managerMsg);
        if (nextStatusValue === "ACCEPTED" || nextStatusValue === "REJECTED" || nextStatusValue === "CANCELLED") {
          setTimeout(() => onCompleted(), 1500);
        }
      }
    } catch {
      setLastManagerMessage("Has colgado la llamada. La cesión ha finalizado sin acuerdo.");
      setStatus("CANCELLED");
      setTimeout(() => onCompleted(), 1500);
    } finally {
      setBusy(false);
    }
  }

  const stepLabels: Record<1 | 2 | 3 | 4, string> = {
    1: "Duración",
    2: "¿Opción de compra?",
    3: "% de sueldo",
    4: "Importe traspaso",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-slate-950 p-4 border-b border-slate-800/80">
          <RivalManagerCard
            managerName={managerName}
            managerAvatarUrl={managerAvatar}
            teamName={sellerTeamName}
            teamCrestUrl={sellerTeamCrestUrl ?? null}
            teamPrimaryColor={sellerTeamPrimaryColor ?? null}
            teamShortName={sellerTeamShortName ?? null}
            isLive={status === "PROPOSED" || status === "COUNTERED"}
            isFinished={status === "ACCEPTED" || status === "REJECTED" || status === "CANCELLED"}
            secondsElapsed={secondsElapsed}
            subtitle={`Cesión de ${playerName}`}
          />
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-semibold text-emerald-400">
            <PhoneCall size={13} className={status === "PROPOSED" || status === "COUNTERED" ? "animate-pulse" : ""} />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>
        </div>

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

        <div className="px-4 pt-3 pb-2 flex items-center justify-center gap-1.5">
          {([1, 2, 3, 4] as const).map((n) => (
            <span
              key={n}
              className={`h-1.5 rounded-full transition-all ${
                n === currentStep ? "w-8 bg-emerald-500" : n < currentStep ? "w-4 bg-emerald-700" : "w-4 bg-slate-700"
              }`}
              aria-label={`Paso ${n}: ${stepLabels[n]}`}
            />
          ))}
          <span className="ml-2 text-[10px] uppercase font-bold text-slate-400">
            Paso {currentStep}/4 — {stepLabels[currentStep]}
          </span>
        </div>

        <div className="p-4 min-h-[100px] flex items-center justify-center bg-slate-900/60 border-b border-slate-800 text-xs">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 text-slate-200 leading-relaxed text-center w-full">
            &quot;{lastManagerMessage}&quot;
          </div>
        </div>

        <div className="p-4 bg-slate-950/80 space-y-3">
          {currentStep === 1 ? (
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Duración de la cesión</label>
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
          ) : null}

          {currentStep === 2 ? (
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <input
                  type="radio"
                  checked={proposal.hasBuyOption}
                  onChange={() => setProposal({ ...proposal, hasBuyOption: true, buyOptionPrice: proposal.buyOptionPrice ?? 1_000_000 })}
                  className="accent-emerald-500"
                />
                Sí
              </label>
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <input
                  type="radio"
                  checked={!proposal.hasBuyOption}
                  onChange={() => setProposal({ ...proposal, hasBuyOption: false, buyOptionPrice: null })}
                  className="accent-emerald-500"
                />
                No
              </label>
            </div>
          ) : null}

          {currentStep === 3 ? (
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
          ) : null}

          {currentStep === 4 && proposal.hasBuyOption ? (
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Precio Opción de Compra (€)
              </label>
              <input
                type="number"
                min={100_000}
                step={250_000}
                value={proposal.buyOptionPrice ?? 0}
                onChange={(e) => setProposal({ ...proposal, buyOptionPrice: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
              />
            </div>
          ) : null}

          {currentStep === 4 && !proposal.hasBuyOption ? (
            <p className="text-[11px] text-slate-500 italic">Sin opción de compra — pasamos directamente al envío.</p>
          ) : null}

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

        {status === "REJECTED" || status === "CANCELLED" || status === "ACCEPTED" ? (
          <div className="p-3 bg-slate-950 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-rose-900/30"
              title="Colgar llamada y cerrar"
              aria-label="Colgar llamada y cerrar"
            >
              <PhoneOff size={16} />
              Colgar llamada y cerrar
            </button>
          </div>
        ) : (
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <button
              onClick={() => setCurrentStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))}
              disabled={currentStep === 1 || busy}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white"
              aria-label="Paso anterior"
            >
              <ChevronLeft size={16} />
            </button>
            {currentStep < 4 ? (
              <button
                onClick={() => {
                  if (currentStep === 2 && !proposal.hasBuyOption) {
                    setCurrentStep(3);
                    return;
                  }
                  setCurrentStep((s) => (s < 4 ? ((s + 1) as 1 | 2 | 3 | 4) : s));
                }}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition"
              >
                Siguiente <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => send("COUNTER")}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition"
              >
                <Send size={14} />
                Enviar Oferta
              </button>
            )}
            <button
              onClick={() => {
                void send("HANGUP");
              }}
              disabled={busy}
              className="p-2.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white"
              title="Colgar"
              aria-label="Colgar"
            >
              <PhoneOff size={14} />
            </button>
            <button
              onClick={() => send("ACCEPT")}
              disabled={busy}
              className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
              title="Aceptar"
              aria-label="Aceptar"
            >
              <PhoneCall size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
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
