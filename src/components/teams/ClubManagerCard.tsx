"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ManagerResult } from "@/lib/managers/getOrFetchManager";

export default function ClubManagerCard({
  teamId,
  initialManager
}: {
  teamId: string;
  initialManager?: ManagerResult;
}) {
  const [manager, setManager] = useState<ManagerResult | null>(initialManager || null);
  const [loading, setLoading] = useState(!initialManager);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    if (initialManager) return;
    let isMounted = true;
    setLoading(true);

    fetch(`/api/teams/${teamId}/manager`)
      .then((res) => res.json())
      .then((data: { manager: ManagerResult }) => {
        if (isMounted) {
          setManager(data.manager);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setManager({
            id: `fallback-${teamId}`,
            name: "Director Técnico",
            nationality: null,
            avatarUrl: null,
            apiSportsId: null,
            teamId
          });
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [teamId, initialManager]);

  if (loading) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse">
        <div className="h-16 w-16 rounded-full bg-slate-200" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-28 rounded bg-slate-200" />
          <div className="h-5 w-44 rounded bg-slate-200" />
          <div className="h-3 w-20 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  const avatar = manager?.avatarUrl;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      {/* Profile Picture */}
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border border-slate-100 bg-slate-100 shadow-inner">
        {avatar && !avatarFailed ? (
          <Image
            src={avatar}
            alt={manager.name}
            fill
            sizes="64px"
            className="object-cover"
            unoptimized
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-slate-200 text-slate-500 text-2xl font-bold">
            👤
          </div>
        )}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
          <span>👔</span>
          <span>Director Técnico / Mánager Actual</span>
        </div>
        <h3 className="mt-1 text-lg font-bold text-slate-900 truncate">
          {manager?.name || "Director Técnico"}
        </h3>
        {manager?.nationality && (
          <p className="text-xs font-medium text-slate-500">
            Nacionalidad: <span className="font-semibold text-slate-700">{manager.nationality}</span>
          </p>
        )}
      </div>
    </div>
  );
}
