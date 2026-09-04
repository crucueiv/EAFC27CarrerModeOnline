"use client";

import type { LoanDuration } from "@/lib/transfers/loanNegotiationEngine";

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
