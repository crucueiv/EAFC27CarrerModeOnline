"use client";

import { useState, useEffect } from "react";
import { PhoneOff, PhoneCall, Send, AlertTriangle } from "lucide-react";
import { getManagerAction } from "@/app/api/managers/managers";
import {
  calculateLoanWageShare,
  calculateLoanWageCost,
  calculateLoanWeeks,
  computeLoanEndDate,
} from "@/lib/transfers/loanEngine";
import {
  type LoanDuration,
  type LoanNegotiationPhase,
  DURATION_LABELS,
} from "@/lib/transfers/loanNegotiationEngine";
import { RivalManagerCard } from "./RivalManagerCard";

export type { LoanDuration };

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
  initialIneligible?: boolean;
  schedule: {
    startsAt: string;
    endsAt: string;
    weeks: number;
    seasonEndAt?: string | null;
  };
  totalWageCost: number;
  weeklyWage?: number;
  buyerWeeklyWageCost?: number;
  buyOptionPrice?: number;
  totalLoanCost?: number;
  loanId: string;
  buyerFreeBudget?: number;
  buyerTotalBudget?: number;
  buyerCommittedBudget?: number;
  onClose: () => void;
  onCompleted: () => void;
};

const FALLBACK_AVATAR =
  "https://res.cloudinary.com/oiugg8m6/image/upload/v1788133891/qvbsomljzzcmickbhyad.png";

const phaseLabels: Record<LoanNegotiationPhase, string> = {
  DURATION: "Fase 1: Duración",
  BUY_OPTION: "Fase 2: Opción de Compra",
  WAGE: "Fase 3: Salario",
  BUY_OPTION_PRICE: "Fase 4: Precio Opción",
};

const phaseSubmitLabels: Record<LoanNegotiationPhase, string> = {
  DURATION: "Proponer Duración",
  BUY_OPTION: "Confirmar Opción",
  WAGE: "Proponer Salario",
  BUY_OPTION_PRICE: "Proponer Precio",
};

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
  initialIneligible = false,
  schedule,
  weeklyWage = 0,
  buyerWeeklyWageCost = 0,
  buyOptionPrice: initialBuyOptionPrice = 0,
  totalLoanCost: initialTotalLoanCost = 0,
  loanId,
  buyerFreeBudget,
  buyerTotalBudget,
  buyerCommittedBudget,
  onClose,
  onCompleted,
}: Props) {
  const [proposal, setProposal] = useState<LoanProposal>({
    duration: "ONE_YEAR",
    wageShareBuyerPct: 50,
    hasBuyOption: false,
    buyOptionPrice: 1_000_000,
  });
  const [currentPhase, setCurrentPhase] = useState<LoanNegotiationPhase>("DURATION");
  const [lastManagerMessage, setLastManagerMessage] = useState<string>(initialMessage);
  const [tension, setTension] = useState(initialIneligible ? 100 : 20);
  const [status, setStatus] = useState<string>(initialIneligible ? "REJECTED" : "PROPOSED");
  const [busy, setBusy] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  const [managerCounter, setManagerCounter] = useState<{
    counterDuration?: LoanDuration | null;
    counterWageShareBuyerPct?: number | null;
    counterBuyOptionPrice?: number | null;
    managerPrefersBuyOption?: boolean | null;
  } | null>(null);

  const [managerName, setManagerName] = useState<string>(
    initialManagerName || "Cargando Mánager...",
  );
  const [managerAvatar, setManagerAvatar] = useState<string | null>(
    initialManagerAvatarUrl || null,
  );
  const [isLoadingManager, setIsLoadingManager] = useState(false);

  const isCallFinished =
    status === "ACCEPTED" ||
    status === "COMPLETED" ||
    status === "AGREED_PENDING_WINDOW" ||
    status === "REJECTED" ||
    status === "CANCELLED";

  useEffect(() => {
    if (!open || isCallFinished) return;
    const timer = setInterval(() => setSecondsElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [open, isCallFinished]);

  useEffect(() => {
    if (!open) return;
    setCurrentPhase("DURATION");
    setLastManagerMessage(initialMessage);
    if (initialIneligible) {
      setStatus("REJECTED");
      setTension(100);
    } else {
      setStatus("PROPOSED");
      setTension(20);
    }
    setManagerCounter(null);

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
  }, [
    open,
    sellerTeamId,
    initialManagerName,
    initialManagerAvatarUrl,
    sellerTeamName,
    initialMessage,
    initialIneligible,
  ]);

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

  // El salario base es independiente del porcentaje que asume el club
  // comprador y debe permanecer estable durante toda la negociación.
  const currentStartsAt = new Date(schedule.startsAt);
  const currentEndsAt = computeLoanEndDate({
    startsAt: currentStartsAt,
    duration: proposal.duration,
    seasonEndDate: schedule.seasonEndAt
      ? new Date(schedule.seasonEndAt)
      : new Date(schedule.endsAt),
  });
  const currentWeeks = Math.max(
    1,
    calculateLoanWeeks(currentStartsAt, currentEndsAt),
  );
  const playerWeeklyWage = Math.max(0, weeklyWage);
  const buyerWeeklyWage = calculateLoanWageShare(
    playerWeeklyWage,
    proposal.wageShareBuyerPct,
  );
  const buyerTotalWage = calculateLoanWageCost(
    playerWeeklyWage,
    proposal.wageShareBuyerPct,
    currentWeeks,
  );
  const currentBuyOptionPrice =
    proposal.hasBuyOption && proposal.buyOptionPrice && proposal.buyOptionPrice > 0
      ? proposal.buyOptionPrice
      : 0;
  const currentLoanTotalCost = buyerTotalWage;
  const hasBudgetCap = typeof buyerFreeBudget === "number";
  const exceedsBudget = hasBudgetCap && currentLoanTotalCost > (buyerFreeBudget as number);

  async function handleSendPhaseProposal() {
    if (busy || isCallFinished) return;
    if (currentPhase === "WAGE" && exceedsBudget) {
      setLastManagerMessage(
        `El coste salarial (${formatEuro(currentLoanTotalCost)}) supera tu presupuesto libre (${formatEuro(buyerFreeBudget as number)}). Ajusta el porcentaje.`,
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/loans/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId,
          action: "COUNTER",
          phase: currentPhase,
          counterDuration: currentPhase === "DURATION" ? proposal.duration : undefined,
          counterHasBuyOption: currentPhase === "BUY_OPTION" ? proposal.hasBuyOption : undefined,
          counterWageShareBuyerPct: currentPhase === "WAGE" ? proposal.wageShareBuyerPct : undefined,
          counterBuyOptionPrice:
            currentPhase === "BUY_OPTION_PRICE" && proposal.hasBuyOption
              ? proposal.buyOptionPrice
              : undefined,
        }),
      });
      const data = await res.json();

      if (data.error === "loan-finalized") {
        setStatus("CANCELLED");
        setLastManagerMessage("La llamada ya ha finalizado.");
        return;
      }

      if (data.error) {
        setLastManagerMessage(`Error: ${data.error}`);
        return;
      }

      setTension(data.tension ?? tension);
      setLastManagerMessage(data.message ?? "");

      if (data.proposed) {
        setManagerCounter({
          counterDuration: data.proposed.counterDuration ?? null,
          counterWageShareBuyerPct: data.proposed.counterWageShareBuyerPct ?? null,
          counterBuyOptionPrice: data.proposed.counterBuyOptionPrice ?? null,
          managerPrefersBuyOption: data.proposed.managerPrefersBuyOption ?? null,
        });
      }

      const nextStatusValue = data.status ?? status;
      setStatus(nextStatusValue);

      if (data.currentPhase && data.currentPhase !== currentPhase) {
        setCurrentPhase(data.currentPhase);
        setManagerCounter(null);
      }

      const terminalStatuses = [
        "ACCEPTED",
        "COMPLETED",
        "AGREED_PENDING_WINDOW",
        "REJECTED",
        "CANCELLED",
      ];
      if (terminalStatuses.includes(nextStatusValue)) {
        if (nextStatusValue === "COMPLETED" || nextStatusValue === "AGREED_PENDING_WINDOW") {
          setTimeout(() => { window.dispatchEvent(new Event('loan-completed')); onCompleted(); }, 2000);
        }
      }
    } catch (err) {
      console.error("[LoanNegotiationModal] error:", err);
      setLastManagerMessage("Error de conexión durante la llamada.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAcceptCounter() {
    if (busy || isCallFinished) return;
    setBusy(true);
    try {
      if (currentPhase === "DURATION" && managerCounter?.counterDuration) {
        setProposal((prev) => ({ ...prev, duration: managerCounter.counterDuration! }));
      } else if (
        currentPhase === "BUY_OPTION" &&
        typeof managerCounter?.managerPrefersBuyOption === "boolean"
      ) {
        setProposal((prev) => ({
          ...prev,
          hasBuyOption: managerCounter.managerPrefersBuyOption!,
        }));
      } else if (
        currentPhase === "WAGE" &&
        typeof managerCounter?.counterWageShareBuyerPct === "number"
      ) {
        setProposal((prev) => ({
          ...prev,
          wageShareBuyerPct: managerCounter.counterWageShareBuyerPct!,
        }));
      } else if (
        currentPhase === "BUY_OPTION_PRICE" &&
        typeof managerCounter?.counterBuyOptionPrice === "number"
      ) {
        setProposal((prev) => ({
          ...prev,
          buyOptionPrice: managerCounter.counterBuyOptionPrice!,
        }));
      }

      const res = await fetch("/api/loans/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId,
          action: "ACCEPT",
          phase: currentPhase,
          counterDuration: managerCounter?.counterDuration ?? proposal.duration,
          counterHasBuyOption:
            typeof managerCounter?.managerPrefersBuyOption === "boolean"
              ? managerCounter.managerPrefersBuyOption
              : proposal.hasBuyOption,
          counterWageShareBuyerPct:
            managerCounter?.counterWageShareBuyerPct ?? proposal.wageShareBuyerPct,
          counterBuyOptionPrice:
            managerCounter?.counterBuyOptionPrice ?? proposal.buyOptionPrice,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setLastManagerMessage(`Error: ${data.error}`);
        return;
      }

      setTension(data.tension ?? tension);
      setLastManagerMessage(data.message ?? "");

      if (data.proposed) {
        setManagerCounter({
          counterDuration: data.proposed.counterDuration ?? null,
          counterWageShareBuyerPct: data.proposed.counterWageShareBuyerPct ?? null,
          counterBuyOptionPrice: data.proposed.counterBuyOptionPrice ?? null,
          managerPrefersBuyOption: data.proposed.managerPrefersBuyOption ?? null,
        });
      }

      const nextStatusValue = data.status ?? status;
      setStatus(nextStatusValue);

      if (data.currentPhase && data.currentPhase !== currentPhase) {
        setCurrentPhase(data.currentPhase);
        setManagerCounter(null);
      }

      const terminalStatuses = [
        "ACCEPTED",
        "COMPLETED",
        "AGREED_PENDING_WINDOW",
        "REJECTED",
        "CANCELLED",
      ];
      if (terminalStatuses.includes(nextStatusValue)) {
        if (nextStatusValue === "COMPLETED" || nextStatusValue === "AGREED_PENDING_WINDOW") {
          setTimeout(() => { window.dispatchEvent(new Event('loan-completed')); onCompleted(); }, 2000);
        }
      }
    } catch (err) {
      console.error("[LoanNegotiationModal] accept counter error:", err);
      setLastManagerMessage("Error de conexión durante la llamada.");
    } finally {
      setBusy(false);
    }
  }

  async function handleHangup() {
    if (busy || isCallFinished) return;
    setBusy(true);
    try {
      await fetch("/api/loans/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId, action: "HANGUP" }),
      });
    } catch (err) {
      console.error("[LoanNegotiationModal] hangup error:", err);
    } finally {
      setStatus("CANCELLED");
      setTension(100);
      setLastManagerMessage("Has colgado la llamada. La cesión ha finalizado sin acuerdo.");
      setBusy(false);
    }
  }

  const activePhases: LoanNegotiationPhase[] = proposal.hasBuyOption
    ? ["DURATION", "BUY_OPTION", "WAGE", "BUY_OPTION_PRICE"]
    : ["DURATION", "BUY_OPTION", "WAGE"];

  const currentPhaseIndex = activePhases.indexOf(currentPhase);

  const hasCounterForCurrentPhase =
    (currentPhase === "DURATION" &&
      Boolean(
        managerCounter?.counterDuration &&
          managerCounter.counterDuration !== proposal.duration,
      )) ||
    (currentPhase === "BUY_OPTION" &&
      Boolean(
        typeof managerCounter?.managerPrefersBuyOption === "boolean" &&
          managerCounter.managerPrefersBuyOption !== proposal.hasBuyOption,
      )) ||
    (currentPhase === "WAGE" &&
      Boolean(
        typeof managerCounter?.counterWageShareBuyerPct === "number" &&
          managerCounter.counterWageShareBuyerPct !== proposal.wageShareBuyerPct,
      )) ||
    (currentPhase === "BUY_OPTION_PRICE" &&
      Boolean(
        typeof managerCounter?.counterBuyOptionPrice === "number" &&
          managerCounter.counterBuyOptionPrice !== proposal.buyOptionPrice,
      ));

  const getCounterButtonLabel = () => {
    if (currentPhase === "DURATION" && managerCounter?.counterDuration) {
      return `Aceptar ${DURATION_LABELS[managerCounter.counterDuration]}`;
    }
    if (
      currentPhase === "BUY_OPTION" &&
      typeof managerCounter?.managerPrefersBuyOption === "boolean"
    ) {
      return managerCounter.managerPrefersBuyOption ? "Aceptar Opción" : "Aceptar Sin Opción";
    }
    if (
      currentPhase === "WAGE" &&
      typeof managerCounter?.counterWageShareBuyerPct === "number"
    ) {
      return `Aceptar ${managerCounter.counterWageShareBuyerPct}%`;
    }
    if (
      currentPhase === "BUY_OPTION_PRICE" &&
      typeof managerCounter?.counterBuyOptionPrice === "number"
    ) {
      return `Aceptar ${formatEuro(managerCounter.counterBuyOptionPrice)}`;
    }
    return "Aceptar propuesta";
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
            isLive={!isCallFinished}
            isFinished={isCallFinished}
            secondsElapsed={secondsElapsed}
            subtitle={`Cesión de ${playerName}`}
          />
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-semibold text-emerald-400">
            <PhoneCall size={13} className={!isCallFinished ? "animate-pulse" : ""} />
            <span>{!isCallFinished ? formatTimer(secondsElapsed) : "Llamada Finalizada"}</span>
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
          {activePhases.map((p, idx) => (
            <span
              key={p}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentPhaseIndex
                  ? "w-8 bg-emerald-500"
                  : idx < currentPhaseIndex
                    ? "w-4 bg-emerald-700"
                    : "w-4 bg-slate-700"
              }`}
              aria-label={phaseLabels[p]}
            />
          ))}
          <span className="ml-2 text-[10px] uppercase font-bold text-slate-400">
            {phaseLabels[currentPhase]}
          </span>
        </div>

        <div className="p-4 min-h-[100px] flex items-center justify-center bg-slate-900/60 border-b border-slate-800 text-xs">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 text-slate-200 leading-relaxed text-center w-full shadow-inner">
            &quot;{lastManagerMessage}&quot;
          </div>
        </div>

        <div className="p-4 bg-slate-950/80 space-y-3">
          {currentPhase === "DURATION" && (
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Duración de la cesión
              </label>
              <select
                value={proposal.duration}
                onChange={(e) =>
                  setProposal({ ...proposal, duration: e.target.value as LoanDuration })
                }
                disabled={busy || isCallFinished}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-50"
              >
                <option value="SHORT_TERM">Resto de temporada</option>
                <option value="ONE_YEAR">1 temporada (1 año)</option>
                <option value="TWO_YEARS">2 temporadas (2 años)</option>
              </select>
              {managerCounter?.counterDuration && !isCallFinished && (
                <p className="text-[11px] text-amber-400 mt-2 flex items-center gap-1 font-medium">
                  💡 El mánager sugiere: {DURATION_LABELS[managerCounter.counterDuration]}
                </p>
              )}
            </div>
          )}

          {currentPhase === "BUY_OPTION" && (
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-2">
                ¿Incluir opción de compra al finalizar la cesión?
              </label>
              <div className="flex items-center gap-4">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={proposal.hasBuyOption}
                    onChange={() =>
                      setProposal({
                        ...proposal,
                        hasBuyOption: true,
                        buyOptionPrice: proposal.buyOptionPrice ?? 1_000_000,
                      })
                    }
                    disabled={busy || isCallFinished}
                    className="accent-emerald-500"
                  />
                  Sí, pactar opción
                </label>
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!proposal.hasBuyOption}
                    onChange={() => setProposal({ ...proposal, hasBuyOption: false })}
                    disabled={busy || isCallFinished}
                    className="accent-emerald-500"
                  />
                  No, cesión simple
                </label>
              </div>
              {typeof managerCounter?.managerPrefersBuyOption === "boolean" && !isCallFinished && (
                <p className="text-[11px] text-amber-400 mt-2 flex items-center gap-1 font-medium">
                  💡 El mánager insiste en:{" "}
                  {managerCounter.managerPrefersBuyOption
                    ? "Con opción de compra"
                    : "Cesión simple sin opción"}
                </p>
              )}
            </div>
          )}

          {currentPhase === "WAGE" && (
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Porcentaje de sueldo que asume tu club:{" "}
                <strong className="text-emerald-400">{proposal.wageShareBuyerPct}%</strong>
              </label>
              <input
                type="range"
                min={20}
                max={80}
                step={5}
                value={proposal.wageShareBuyerPct}
                onChange={(e) =>
                  setProposal({ ...proposal, wageShareBuyerPct: Number(e.target.value) })
                }
                disabled={busy || isCallFinished}
                className="w-full accent-emerald-500 mt-2 disabled:opacity-50"
              />
              {managerCounter?.counterWageShareBuyerPct && !isCallFinished && (
                <p className="text-[11px] text-amber-400 mt-2 flex items-center gap-1 font-medium">
                  💡 El mánager pide que asumas al menos el{" "}
                  {managerCounter.counterWageShareBuyerPct}% del sueldo.
                </p>
              )}
            </div>
          )}

          {currentPhase === "BUY_OPTION_PRICE" && (
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Precio Opción de Compra (€)
              </label>
              <input
                type="number"
                min={100_000}
                step={250_000}
                value={proposal.buyOptionPrice ?? 0}
                onChange={(e) =>
                  setProposal({ ...proposal, buyOptionPrice: Number(e.target.value) })
                }
                disabled={busy || isCallFinished}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none font-mono disabled:opacity-50"
              />
              {managerCounter?.counterBuyOptionPrice && !isCallFinished && (
                <p className="text-[11px] text-amber-400 mt-2 flex items-center gap-1 font-medium">
                  💡 El mánager pide al menos{" "}
                  {formatEuro(managerCounter.counterBuyOptionPrice)} por la opción.
                </p>
              )}
            </div>
          )}

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Salario semanal del jugador:</span>
              <strong className="font-mono">{formatEuro(playerWeeklyWage)}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tu parte semanal ({proposal.wageShareBuyerPct}%):</span>
              <strong className="font-mono text-emerald-400">{formatEuro(buyerWeeklyWage)}/sem</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Coste salarial ({currentWeeks} sem):</span>
              <strong className="font-mono text-white">{formatEuro(buyerTotalWage)}</strong>
            </div>
            {currentBuyOptionPrice > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Opción de compra (futura):</span>
                <strong className="font-mono text-white">{formatEuro(currentBuyOptionPrice)}</strong>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-slate-800 pt-1.5">
              <span className="text-slate-400">Coste reservado:</span>
              <strong
                className={`font-mono ${exceedsBudget ? "text-rose-400" : "text-emerald-300"}`}
              >
                {formatEuro(currentLoanTotalCost)}
              </strong>
            </div>
            {hasBudgetCap ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Presupuesto libre de tu club:</span>
                  <strong className="font-mono text-emerald-400">
                    {formatEuro(buyerFreeBudget as number)}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Restante tras esta cesión:</span>
                  <strong
                    className={`font-mono ${
                      exceedsBudget ? "text-rose-400" : "text-slate-200"
                    }`}
                  >
                    {formatEuro((buyerFreeBudget as number) - currentLoanTotalCost)}
                  </strong>
                </div>
                {typeof buyerTotalBudget === "number" &&
                typeof buyerCommittedBudget === "number" ? (
                  <p className="text-[10px] text-slate-500 pt-1">
                    Total: {formatEuro(buyerTotalBudget)} · Comprometido:{" "}
                    {formatEuro(buyerCommittedBudget)}
                  </p>
                ) : null}
                {exceedsBudget ? (
                  <p className="text-[10px] text-rose-400 pt-1 font-semibold">
                    El coste salarial supera el presupuesto libre de tu club. Ajusta la propuesta.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        {isCallFinished ? (
          <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
            <div
              className={`p-3 rounded-xl text-sm font-semibold text-center ${
                status === "ACCEPTED" ||
                status === "COMPLETED" ||
                status === "AGREED_PENDING_WINDOW"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
            >
              {status === "ACCEPTED" ||
              status === "COMPLETED" ||
              status === "AGREED_PENDING_WINDOW"
                ? "Acuerdo alcanzado. El jugador se incorporará según lo pactado."
                : "La llamada ha finalizado sin acuerdo."}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-rose-900/30"
              title="Colgar llamada"
            >
              <PhoneOff size={16} />
              Colgar llamada y cerrar
            </button>
          </div>
        ) : (
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
            <button
              onClick={handleSendPhaseProposal}
              disabled={busy || (currentPhase === "WAGE" && exceedsBudget)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-900/20"
            >
              <Send size={14} />
              {phaseSubmitLabels[currentPhase]}
            </button>

            {hasCounterForCurrentPhase && (
              <button
                onClick={handleAcceptCounter}
                disabled={busy}
                className="flex items-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-emerald-900/20"
                title="Aceptar sugerencia del mánager"
              >
                <PhoneCall size={14} />
                {getCounterButtonLabel()}
              </button>
            )}

            <button
              onClick={handleHangup}
              disabled={busy}
              className="p-2.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white transition"
              title="Colgar llamada"
              aria-label="Colgar"
            >
              <PhoneOff size={14} />
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
