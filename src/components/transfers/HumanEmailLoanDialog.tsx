"use client";

import { useState } from "react";
import { NegotiationEmailComposer } from "./NegotiationEmailComposer";
import type { NegotiationEmailContext } from "@/lib/transfers/emailTemplates";

export type HumanEmailLoanDuration = "SHORT_TERM" | "ONE_YEAR" | "TWO_YEARS";

export interface HumanEmailLoanDialogProps {
  context: NegotiationEmailContext;
  onCancel: () => void;
  onSend: (args: {
    duration: HumanEmailLoanDuration;
    wageShareBuyerPct: number;
    hasBuyOption: boolean;
    buyOptionPrice: number | null;
  }) => Promise<void> | void;
  sending: boolean;
  errorMessage: string | null;
}

const DURATION_LABELS: Record<HumanEmailLoanDuration, string> = {
  SHORT_TERM: "Resto de temporada",
  ONE_YEAR: "1 temporada (1 año)",
  TWO_YEARS: "2 temporadas (2 años)",
};

export function HumanEmailLoanDialog({
  context,
  onCancel,
  onSend,
  sending,
  errorMessage,
}: HumanEmailLoanDialogProps) {
  const [duration, setDuration] = useState<HumanEmailLoanDuration>("ONE_YEAR");
  const [wageShareBuyerPct, setWageShareBuyerPct] = useState<number>(50);
  const [hasBuyOption, setHasBuyOption] = useState<boolean>(false);
  const [buyOptionPrice, setBuyOptionPrice] = useState<number>(1_000_000);

  const durationLabel = DURATION_LABELS[duration];
  const wageLabel = `${wageShareBuyerPct}%`;
  const buyOptionLabel = hasBuyOption
    ? `${(buyOptionPrice / 1_000_000).toFixed(1)}M €`
    : "Sin opción de compra";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <h4 className="text-lg font-bold text-[var(--theme-foreground)]">
          Proponer cesión a {context.targetTeamName}
        </h4>
        <p className="text-xs text-[var(--theme-muted)]">
          Estás negociando una cesión con un club gestionado por otra persona.
          Define las condiciones y envía tu propuesta por correo.
        </p>

        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
            Duración de la cesión
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value as HumanEmailLoanDuration)}
            disabled={sending}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="SHORT_TERM">{DURATION_LABELS.SHORT_TERM}</option>
            <option value="ONE_YEAR">{DURATION_LABELS.ONE_YEAR}</option>
            <option value="TWO_YEARS">{DURATION_LABELS.TWO_YEARS}</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
            Porcentaje de sueldo que asume {context.sourceTeamName}: <strong className="text-emerald-400">{wageLabel}</strong>
          </label>
          <input
            type="range"
            min={20}
            max={80}
            step={5}
            value={wageShareBuyerPct}
            onChange={(e) => setWageShareBuyerPct(Number(e.target.value))}
            disabled={sending}
            className="w-full accent-emerald-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
            ¿Opción de compra?
          </label>
          <div className="flex items-center gap-4 mb-2">
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="radio"
                checked={hasBuyOption}
                onChange={() => setHasBuyOption(true)}
                disabled={sending}
                className="accent-emerald-500"
              />
              Sí
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="radio"
                checked={!hasBuyOption}
                onChange={() => setHasBuyOption(false)}
                disabled={sending}
                className="accent-emerald-500"
              />
              No
            </label>
          </div>
          {hasBuyOption ? (
            <input
              type="number"
              min={100_000}
              step={250_000}
              value={buyOptionPrice}
              onChange={(e) => setBuyOptionPrice(Number(e.target.value) || 0)}
              disabled={sending}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white font-mono"
              placeholder="Precio de la opción (€)"
            />
          ) : null}
        </div>

        <NegotiationEmailComposer
          context={{
            ...context,
            durationLabel,
            wageShare: wageLabel,
            buyOptionPrice: hasBuyOption ? buyOptionPrice.toString() : undefined,
          }}
          onSend={async () => {
            await onSend({
              duration,
              wageShareBuyerPct,
              hasBuyOption,
              buyOptionPrice: hasBuyOption ? buyOptionPrice : null,
            });
          }}
          disabled={sending}
        />

        {errorMessage ? (
          <p className="text-xs text-rose-400">{errorMessage}</p>
        ) : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
