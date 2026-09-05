"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { TransferPlayerResult } from "@/lib/transfers/search";
import PlayerDetailModal from "@/components/transfers/PlayerDetailModal";
import LoanNegotiationModal from "@/components/transfers/LoanNegotiationModal";
import PlayerOverallBadge from "@/components/players/PlayerOverallBadge";

const statLabels = [
  ["pace", "PAC"],
  ["shooting", "SHO"],
  ["passing", "PAS"],
  ["dribbling", "DRI"],
  ["defending", "DEF"],
  ["physical", "PHY"]
] as const;

function formatPrice(price: number) {
  if (price >= 1_000_000) return `€${(price / 1_000_000).toFixed(price >= 10_000_000 ? 0 : 1)}M`;
  if (price >= 1_000) return `€${Math.round(price / 1000)}K`;
  return `€${Math.round(price)}`;
}

function formatSalary(salary: number) {
  return `${formatPrice(salary)}/sem`;
}

function formatCurrency(value: number) {
  return formatPrice(value);
}

export default function PlayerCardRow({ player, ownClubTeamId }: { player: TransferPlayerResult; ownClubTeamId?: string | null }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [loanInit, setLoanInit] = useState<{
    loanId: string;
    greeting: string;
    schedule: { startsAt: string; endsAt: string; weeks: number };
    totalWageCost: number;
    weeklyWage: number;
    buyerWeeklyWageCost: number;
  } | null>(null);
  const [loanBusy, setLoanBusy] = useState(false);
  const [loanError, setLoanError] = useState<string | null>(null);
  const [activeLoanId, setActiveLoanId] = useState<string | null>(null);

  const isOwnPlayer = Boolean(
    ownClubTeamId && player.currentTeam?.id === ownClubTeamId,
  );

  // BUG FIX (bug 1): si ya existe una cesión activa para este jugador
  // (estado PROPOSED/COUNTERED/ACCEPTED/COMPLETED), deshabilitamos el botón
  // de proponer cesión para impedir abrir una segunda negociación en paralelo.
  useEffect(() => {
    let cancelled = false;
    if (!player.id) return;
    const params = new URLSearchParams({ playerId: player.id });
    fetch(`/api/loans/active?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { hasActiveForPlayer?: boolean; playerLoanId?: string | null } | null) => {
        if (cancelled) return;
        if (data?.hasActiveForPlayer) {
          setActiveLoanId(data.playerLoanId ?? null);
        }
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [player.id]);

  const avatar = player.avatarUrl || (player.eaId
    ? `https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p${player.eaId}.png`
    : "/player-placeholder.svg");

  async function startLoanProposal() {
    if (activeLoanId) {
      setLoanError("Ya tienes una cesión activa para este jugador. Revisa tu Sección de Correos.");
      return;
    }
    setLoanBusy(true);
    setLoanError(null);
    try {
      const res = await fetch("/api/loans/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          duration: "ONE_YEAR",
          wageShareBuyerPct: 50,
          hasBuyOption: false,
          buyOptionPrice: null,
        }),
      });
      const data = await res.json();
      if (data.error === "loan-already-active") {
        setActiveLoanId(data.loanId ?? null);
        setLoanError(data.reason || "Ya tienes una cesión activa para este jugador.");
        return;
      }
      if (data.error) {
        setLoanError(data.error);
      } else {
        setLoanInit({
          loanId: data.loanId,
          greeting: data.greeting,
          schedule: data.schedule,
          totalWageCost: data.totalWageCost,
          weeklyWage: data.weeklyWage ?? 0,
          buyerWeeklyWageCost: data.buyerWeeklyWageCost ?? 0,
        });
        setIsLoanModalOpen(true);
      }
    } finally {
      setLoanBusy(false);
    }
  }

  return (
    <>
      <article
        onClick={() => setIsModalOpen(true)}
        className="grid gap-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 shadow-sm transition hover:border-[var(--theme-border)] hover:shadow-md md:grid-cols-[auto_1fr_auto] md:items-center cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsModalOpen(true);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 overflow-hidden rounded-full bg-[var(--theme-background)] ring-1 ring-[var(--theme-border)]">
            <Image
              src={avatarFailed ? "/player-placeholder.svg" : avatar}
              alt={`${player.name} avatar`}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
              onError={() => setAvatarFailed(true)}
            />
          </div>
          <PlayerOverallBadge overall={player.overall} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold text-[var(--theme-foreground)] transition group-hover:text-emerald-600">{player.name}</h2>
            <span className="rounded bg-[var(--theme-background)] px-2 py-0.5 text-xs font-semibold text-[var(--theme-muted)]">{player.position}</span>
            <span className="font-semibold text-emerald-600">{formatPrice(player.price)}</span>
            <span className="text-xs font-medium text-[var(--theme-muted)]">{formatSalary(player.salary)}</span>
            <span className="text-xs text-[var(--theme-muted)]">Cláusula {formatCurrency(player.releaseClause)}</span>
            {player.isLoanEligible && (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold uppercase text-emerald-800">
                Cesión posible
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--theme-muted)]">
            {player.currentTeam ? (
              player.currentTeam.eaId === "FREE_AGENTS" ? (
                <span className="flex items-center gap-1.5 font-medium text-amber-700">
                  <img src="https://www.fifacm.com/content/media/imgs/fifa21/teams/256/l111592.png" alt="" className="h-5 w-5 object-contain" />
                  Agente libre
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  {player.currentTeam.imageUrl ? <img src={player.currentTeam.imageUrl} alt="" className="h-5 w-5 object-contain" /> : <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--theme-background)] text-[9px] font-bold text-[var(--theme-foreground)]">{player.currentTeam.shortName.slice(0, 2)}</span>}
                  {player.currentTeam.name}
                  {player.currentTeam.league && <span className="ml-1 flex items-center gap-1"><span>·</span>{player.currentTeam.league.imageUrl && <img src={player.currentTeam.league.imageUrl} alt="" className="h-4 w-4 object-contain" />}{player.currentTeam.league.name}</span>}
                </span>
              )
            ) : <span>Agente libre</span>}
            <span>Rol: {player.role === "CLAVE" ? "Clave" : player.role === "IMPORTANTE" ? "Importante" : "Rotación"}</span>
            {player.nationality && <span className="flex items-center gap-1.5">{player.nationality.flagUrl ? <img src={player.nationality.flagUrl} alt="" className="h-4 w-6 object-cover" /> : <span>{player.nationality.code === "US" ? "🇺🇸" : player.nationality.code === "GB" ? "🇬🇧" : player.nationality.code === "DE" ? "🇩🇪" : "🌐"}</span>}{player.nationality.name}</span>}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-6">
            {statLabels.map(([key, label]) => (
              <div key={key} className="min-w-0">
                <div className="mb-1 flex justify-between text-[10px] font-semibold text-[var(--theme-muted)]"><span>{label}</span><span className="text-[var(--theme-foreground)]">{player.stats[key]}</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--theme-background)]"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, player.stats[key]))}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-right text-xs text-[var(--theme-muted)]">
          {isOwnPlayer ? (
            <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-2 py-1 text-[10px] font-bold uppercase text-indigo-800">
              Tu jugador
            </span>
          ) : (
            <>
              <span>Potencial</span>
              <strong className="ml-2 text-sm text-[var(--theme-foreground)]">{player.potential}</strong>
            </>
          )}
          {player.isLoanEligible && !isOwnPlayer && (
            <div className="mt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startLoanProposal();
                }}
                disabled={loanBusy || Boolean(activeLoanId) || isOwnPlayer}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {activeLoanId
                  ? "Cesión en curso"
                  : loanBusy
                    ? "Proponiendo..."
                    : "Proponer cesión"}
              </button>
              {loanError && (
                <div className="mt-1 max-w-[10rem] text-[10px] text-rose-700">
                  {loanError}
                </div>
              )}
            </div>
          )}
        </div>
      </article>

      {isModalOpen && (
        <PlayerDetailModal
          player={player}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {isLoanModalOpen && loanInit && player.currentTeam && (
        <LoanNegotiationModal
          open={isLoanModalOpen}
          playerName={player.name}
          sellerTeamName={player.currentTeam.name}
          sellerTeamId={player.currentTeam.id}
          initialMessage={loanInit.greeting}
          schedule={loanInit.schedule}
          totalWageCost={loanInit.totalWageCost}
          weeklyWage={loanInit.weeklyWage}
          loanId={loanInit.loanId}
          onClose={() => setIsLoanModalOpen(false)}
          onCompleted={() => {
            setIsLoanModalOpen(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
