"use client";
import { useState } from "react";
import { RivalTeamCrest } from "./RivalTeamCrest";

const FALLBACK_AVATAR = "/default-avatar.svg";

export interface RivalManagerCardProps {
  managerName: string;
  managerAvatarUrl: string | null;
  teamName: string;
  teamCrestUrl?: string | null;
  teamPrimaryColor?: string | null;
  teamShortName?: string | null;
  phoneNumber?: string | null;
  isLive?: boolean;
  isFinished?: boolean;
  secondsElapsed?: number;
  subtitle?: string;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

export function RivalManagerCard(props: RivalManagerCardProps) {
  const [avatarSrc, setAvatarSrc] = useState<string | null>(props.managerAvatarUrl);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarSrc ?? FALLBACK_AVATAR}
          alt={props.managerName}
          onError={() => setAvatarSrc(FALLBACK_AVATAR)}
          style={{
            width: 96,
            height: 96,
            objectFit: "cover",
            borderRadius: 12,
            border: "4px solid rgba(15,23,42,0.85)",
            background: "#0f172a",
          }}
        />
        {props.isLive ? (
          <span
            className="absolute"
            style={{
              right: 6,
              bottom: 6,
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#22c55e",
              boxShadow: "0 0 0 0 rgba(34,197,94,0.6)",
              animation: "pulse 1.4s infinite",
            }}
          />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-slate-100 truncate">{props.managerName}</h3>
        <div className="flex items-center gap-2 mt-1">
          <RivalTeamCrest
            imageUrl={props.teamCrestUrl ?? null}
            altText={props.teamName}
            primaryColor={props.teamPrimaryColor ?? "#2563eb"}
            shortName={props.teamShortName ?? props.teamName}
            size={20}
          />
          <span className="text-xs text-slate-400 truncate">{props.teamName}</span>
        </div>
        {props.subtitle ? (
          <p className="text-xs text-slate-500 mt-1 truncate">{props.subtitle}</p>
        ) : null}
        <div className="flex items-center gap-2 mt-1">
          {props.phoneNumber ? (
            <span className="text-[10px] font-mono text-slate-500">{props.phoneNumber}</span>
          ) : null}
          {props.isFinished ? (
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Llamada finalizada</span>
          ) : typeof props.secondsElapsed === "number" ? (
            <span className="text-[10px] font-mono text-slate-400">{formatTime(props.secondsElapsed)}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
