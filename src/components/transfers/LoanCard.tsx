"use client";

import { useEffect, useState } from "react";
import type { LoanDuration } from "@/lib/transfers/loanNegotiationEngine";
import {
  calculateLoanFinancialBreakdown,
  calculateLoanWeeks,
} from "@/lib/transfers/loanEngine";

type LoanFinancial = {
  weeklyWage: number;
  wageShareBuyerPct: number;
  totalWeeks: number;
  remainingWeeks: number;
  buyerWeeklyWage: number;
  totalWageCost: number;
  buyOptionPrice: number;
  totalLoanCost: number;
  remainingWageCost: number;
};

type Props = {
  loan: {
    id: string;
    status: string;
    duration: LoanDuration;
    wageShareBuyerPct: number;
    hasBuyOption: boolean;
    buyOptionPrice: number | null;
    startsAt: string | Date;
    endsAt: string | Date;
    player: { name: string; overall: number; position: string };
    sellerTeam: { name: string };
    buyerTeam: { name: string };
  };
  onTriggerBuyOption?: (loanId: string) => void;
};

export default function LoanCard({ loan, onTriggerBuyOption }: Props) {
  const start = new Date(loan.startsAt);
  const end = new Date(loan.endsAt);
  const durationLabel = labelDuration(loan.duration);
  const [financial, setFinancial] = useState<LoanFinancial | null>(null);
  const [financialError, setFinancialError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFinancial(null);
    setFinancialError(null);
    fetch(`/api/loans/${loan.id}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`status ${res.status}`);
        }
        return (await res.json()) as { financial?: LoanFinancial };
      })
      .then((data) => {
        if (cancelled) return;
        if (data.financial) {
          setFinancial(data.financial);
        } else {
          setFinancialError("no-financial");
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback: recalcular en cliente con los datos del propio loan.
        const totalWeeks = calculateLoanWeeks(start, end);
        const remainingWeeks = calculateLoanWeeks(new Date(), end);
        // Si el servidor no devolvió weeklyWage, no tenemos forma de
        // calcular el coste. Mostramos 0€ pero el cálculo preciso lo
        // dará el endpoint.
        setFinancial({
          weeklyWage: 0,
          wageShareBuyerPct: loan.wageShareBuyerPct,
          totalWeeks,
          remainingWeeks,
          buyerWeeklyWage: 0,
          totalWageCost: 0,
          buyOptionPrice: loan.buyOptionPrice ?? 0,
          totalLoanCost: loan.buyOptionPrice ?? 0,
          remainingWageCost: 0,
        });
        setFinancialError("fallback");
      });
    return () => {
      cancelled = true;
    };
  }, [loan.id, loan.wageShareBuyerPct, loan.buyOptionPrice, start, end]);

  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-base font-bold text-[var(--theme-foreground)]">{loan.player.name}</div>
          <div className="text-xs text-[var(--theme-muted)]">
            {loan.player.position} · Overall {loan.player.overall}
          </div>
        </div>
        <span className="rounded-full bg-[var(--theme-accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--theme-accent)]">
          {loan.status}
        </span>
      </div>
      <div className="text-xs text-[var(--theme-muted)]">
        {loan.sellerTeam.name} → {loan.buyerTeam.name}
      </div>
      <div className="mt-2 text-xs text-[var(--theme-foreground)]">
        <div>Duración: {durationLabel}</div>
        <div>Cesionario paga {loan.wageShareBuyerPct}% del sueldo</div>
        {loan.hasBuyOption && (
          <div>Opción de compra: {loan.buyOptionPrice ? formatEuro(loan.buyOptionPrice) : "—"}</div>
        )}
        <div>
          {start.toLocaleDateString("es-ES")} → {end.toLocaleDateString("es-ES")}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] p-3 text-xs">
        <div className="mb-1 text-[10px] font-bold uppercase text-[var(--theme-muted)]">
          Coste de la cesión
        </div>
        {financial ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[var(--theme-muted)]">Sueldo semanal jugador:</span>
              <strong className="font-mono">{formatEuro(financial.weeklyWage)}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--theme-muted)]">Tu parte ({financial.wageShareBuyerPct}%):</span>
              <strong className="font-mono text-emerald-500">
                {formatEuro(financial.buyerWeeklyWage)}/sem
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--theme-muted)]">Coste salarial total ({financial.totalWeeks} sem):</span>
              <strong className="font-mono">{formatEuro(financial.totalWageCost)}</strong>
            </div>
            {financial.buyOptionPrice > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-[var(--theme-muted)]">Opción de compra:</span>
                <strong className="font-mono">{formatEuro(financial.buyOptionPrice)}</strong>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-[var(--theme-border)] pt-1">
              <span className="font-semibold text-[var(--theme-foreground)]">Coste total:</span>
              <strong className="font-mono text-emerald-500">
                {formatEuro(financial.totalLoanCost)}
              </strong>
            </div>
            {financial.remainingWeeks > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-[var(--theme-muted)]">
                  Restante ({financial.remainingWeeks} sem):
                </span>
                <strong className="font-mono text-amber-500">
                  {formatEuro(financial.remainingWageCost)}
                </strong>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-[var(--theme-muted)]">Calculando coste…</div>
        )}
        {financialError && financial ? (
          <p className="mt-1 text-[10px] italic text-[var(--theme-muted)]">
            (Cálculo aproximado — los datos detallados no están disponibles.)
          </p>
        ) : null}
      </div>

      {loan.status === "COMPLETED" && loan.hasBuyOption && onTriggerBuyOption && (
        <button
          onClick={() => onTriggerBuyOption(loan.id)}
          className="mt-3 w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          Ejercer opción de compra
        </button>
      )}
    </div>
  );
}

function labelDuration(d: LoanDuration) {
  if (d === "SHORT_TERM") return "Corto plazo";
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
