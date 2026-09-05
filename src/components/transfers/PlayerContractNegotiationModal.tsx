"use client";

import { useState, useEffect } from "react";
import { PhoneCall, PhoneOff, CheckCircle2, X } from "lucide-react";

type Props = {
  open: boolean;
  playerName: string;
  playerId: string;
  negotiationId: string | null;
  weeklyWage?: number;
  defaultYears?: number;
  onClose: () => void;
  onSigned: () => void;
};

export default function PlayerContractNegotiationModal({
  open,
  playerName,
  playerId,
  negotiationId,
  weeklyWage = 0,
  defaultYears = 4,
  onClose,
  onSigned,
}: Props) {
  const [years, setYears] = useState<number>(defaultYears);
  const [wage, setWage] = useState<number>(Math.max(weeklyWage, 5000));
  const [signingBonus, setSigningBonus] = useState<number>(250000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    if (!open) return;
    setWage((current) => Math.max(current, weeklyWage, 5000));
    const timer = setInterval(() => setSecondsElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [open, weeklyWage]);

  if (!open) return null;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const totalContractValue = wage * 52 * years + signingBonus;

  async function signContract() {
    if (!negotiationId) {
      setError("No hay una negociación asociada. Abre la negociación desde el correo.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/transfers/sign-player-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ negotiationId, weeklyWage: wage, contractYears: years, signingBonus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message ?? data.error ?? "No se pudo firmar el contrato.");
        return;
      }
      onSigned();
    } catch (e) {
      setError("Error de red durante la firma.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-3">
          <h3 className="text-base font-bold text-white">Negociar contrato · {playerName}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 bg-slate-950/40 text-center">
          <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
            <PhoneCall size={24} className="animate-pulse" />
          </div>
          <p className="text-xs font-mono text-emerald-300">{formatTimer(secondsElapsed)}</p>
          <p className="mt-1 text-sm text-slate-300">Hablando con el agente del jugador</p>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Años de contrato</label>
            <input
              type="number"
              min={1}
              max={10}
              value={years}
              onChange={(e) => setYears(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Sueldo semanal ofrecido (€)</label>
            <input
              type="number"
              min={500}
              step={500}
              value={wage}
              onChange={(e) => setWage(Math.max(500, Number(e.target.value) || 0))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
            {weeklyWage > 0 && (
              <p className="mt-1 text-[10px] text-slate-500">Sueldo actual estimado: {weeklyWage.toLocaleString("es-ES")} €/sem</p>
            )}
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400">Prima de fichaje (€)</label>
            <input
              type="number"
              min={0}
              step={10000}
              value={signingBonus}
              onChange={(e) => setSigningBonus(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">
            <div className="flex justify-between"><span>Años</span><strong>{years}</strong></div>
            <div className="flex justify-between"><span>Sueldo</span><strong>{wage.toLocaleString("es-ES")} €/sem</strong></div>
            <div className="flex justify-between border-t border-slate-800 pt-1.5 mt-1.5">
              <span>Valor total contrato</span>
              <strong className="text-emerald-300">{totalContractValue.toLocaleString("es-ES")} €</strong>
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-rose-600/90 hover:bg-rose-600 py-2.5 text-xs font-bold text-white"
            >
              <PhoneOff size={14} className="inline -mt-0.5 mr-1" /> Colgar
            </button>
            <button
              onClick={signContract}
              disabled={busy}
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white disabled:opacity-50"
            >
              <CheckCircle2 size={14} className="inline -mt-0.5 mr-1" />
              {busy ? "Firmando..." : "Aceptar y firmar"}
            </button>
          </div>
        </div>
        <p className="px-5 pb-4 text-[10px] text-slate-500">
          El jugador se incorporará a tu plantilla solo tras aceptar el contrato. Jugador: <code className="text-slate-400">{playerId}</code>
        </p>
      </div>
    </div>
  );
}
