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
      className="inline-flex items-center gap-1.5 text-xs font-bold text-white rounded px-2.5 py-1"
      title={`Cedido por ${sellerTeamName}`}
    >
      <span aria-hidden className="text-base leading-none">←</span>
      <RivalTeamCrest
        imageUrl={sellerTeamCrestUrl}
        altText={sellerTeamName}
        primaryColor={sellerTeamPrimaryColor}
        shortName={sellerTeamShortName}
        size={30}
      />
      <span className="ml-1">
        {weeks === 0 ? "Cesión finalizada" : `${weeks} sem restantes`}
      </span>
    </span>
  );
}
