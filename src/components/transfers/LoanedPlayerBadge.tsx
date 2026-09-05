"use client";
import { useEffect, useState } from "react";
import { RivalTeamCrest } from "./RivalTeamCrest";

export interface LoanedPlayerBadgeProps {
  sellerTeamName: string;
  sellerTeamCrestUrl: string | null;
  sellerTeamPrimaryColor: string | null;
  sellerTeamShortName: string | null;
  endsAtIso: string;
}

function weeksBetween(now: Date, endsAt: Date): number {
  const ms = endsAt.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / (7 * 24 * 60 * 60 * 1000)));
}

export function LoanedPlayerBadge({
  sellerTeamName,
  sellerTeamCrestUrl,
  sellerTeamPrimaryColor,
  sellerTeamShortName,
  endsAtIso,
}: LoanedPlayerBadgeProps) {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const handler = () => setNow(new Date());
    window.addEventListener("calendar-advanced", handler);
    return () => window.removeEventListener("calendar-advanced", handler);
  }, []);
  const endsAt = new Date(endsAtIso);
  const weeks = weeksBetween(now, endsAt);
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-900/30 border border-amber-700/40 rounded px-1.5 py-0.5"
      title={`Cedido por ${sellerTeamName}`}
    >
      <span aria-hidden>←</span>
      <RivalTeamCrest
        imageUrl={sellerTeamCrestUrl}
        altText={sellerTeamName}
        primaryColor={sellerTeamPrimaryColor}
        shortName={sellerTeamShortName}
        size={14}
      />
      <span className="ml-1">
        {weeks === 0 ? "Cesión finalizada" : `${weeks} sem restantes`}
      </span>
    </span>
  );
}
