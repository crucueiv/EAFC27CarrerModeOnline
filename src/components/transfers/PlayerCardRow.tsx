"use client";

import Image from "next/image";
import { useState } from "react";
import type { TransferPlayerResult } from "@/lib/transfers/search";
import PlayerDetailModal from "@/components/transfers/PlayerDetailModal";

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

function overallStyle(overall: number) {
  if (overall >= 90) return { color: "#A855F7", background: "bg-gradient-to-br from-amber-200 via-purple-100 to-indigo-200", elite: true };
  if (overall > 85) return { color: "#EAB308", background: "bg-yellow-500/10" };
  if (overall >= 75) return { color: "#94A3B8", background: "bg-slate-300/20" };
  return { color: "#B45309", background: "bg-amber-700/10" };
}

export default function PlayerCardRow({ player }: { player: TransferPlayerResult }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const avatar = player.avatarUrl || (player.eaId
    ? `https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p${player.eaId}.png`
    : "/player-placeholder.svg");
  const overall = Math.max(0, Math.min(99, player.overall));
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - overall / 99);
  const style = overallStyle(overall);
  const eliteRingId = `elite-ring-${player.id}`;

  return (
    <>
      <article
        onClick={() => setIsModalOpen(true)}
        className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md md:grid-cols-[auto_1fr_auto] md:items-center cursor-pointer"
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
          <div className="relative h-16 w-16 overflow-hidden rounded-full bg-slate-100">
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
          <div className={`relative h-16 w-16 overflow-hidden rounded-full ${style.background} ${style.elite ? "elite-rating-ring" : ""}`} role="img" aria-label={`Overall ${player.overall}`}>
            <svg className="-rotate-90 h-16 w-16" viewBox="0 0 64 64" aria-hidden="true">
              {style.elite && (
                <defs>
                  <linearGradient id={eliteRingId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="25%" stopColor="#A855F7" />
                    <stop offset="50%" stopColor="#EC4899" />
                    <stop offset="75%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              )}
              <circle cx="32" cy="32" r={radius} fill="none" className="stroke-slate-200/60" strokeWidth="4" />
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                stroke={style.elite ? `url(#${eliteRingId})` : style.color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <span className="absolute inset-0 z-20 grid place-items-center text-xl font-black text-black select-none">{player.overall}</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold text-ink group-hover:text-emerald-600 transition">{player.name}</h2>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{player.position}</span>
            <span className="font-semibold text-pitch">{formatPrice(player.price)}</span>
            <span className="text-xs font-medium text-slate-500">{formatSalary(player.salary)}</span>
            <span className="text-xs text-slate-500">Cláusula {formatCurrency(player.releaseClause)}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {player.currentTeam ? (
              <span className="flex items-center gap-1.5">
                {player.currentTeam.imageUrl ? <img src={player.currentTeam.imageUrl} alt="" className="h-5 w-5 object-contain" /> : <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-200 text-[9px] font-bold">{player.currentTeam.shortName.slice(0, 2)}</span>}
                {player.currentTeam.name}
                {player.currentTeam.league && <span className="ml-1 flex items-center gap-1"><span>·</span>{player.currentTeam.league.imageUrl && <img src={player.currentTeam.league.imageUrl} alt="" className="h-4 w-4 object-contain" />}{player.currentTeam.league.name}</span>}
              </span>
            ) : <span>Agente libre</span>}
            <span>Rol: {player.role === "CLAVE" ? "Clave" : player.role === "IMPORTANTE" ? "Importante" : "Rotación"}</span>
            {player.nationality && <span className="flex items-center gap-1.5">{player.nationality.flagUrl ? <img src={player.nationality.flagUrl} alt="" className="h-4 w-6 object-cover" /> : <span>{player.nationality.code === "US" ? "🇺🇸" : player.nationality.code === "GB" ? "🇬🇧" : player.nationality.code === "DE" ? "🇩🇪" : "🌐"}</span>}{player.nationality.name}</span>}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-6">
            {statLabels.map(([key, label]) => (
              <div key={key} className="min-w-0">
                <div className="mb-1 flex justify-between text-[10px] font-semibold text-slate-500"><span>{label}</span><span>{player.stats[key]}</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-pitch" style={{ width: `${Math.max(0, Math.min(100, player.stats[key]))}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-right text-xs text-slate-500"><span>Potencial</span><strong className="ml-2 text-sm text-ink">{player.potential}</strong></div>
      </article>

      {isModalOpen && (
        <PlayerDetailModal
          player={player}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
