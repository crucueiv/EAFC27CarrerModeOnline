export type MaxAllowedReason =
  | "NEXT_MATCH"
  | "TRANSFER_WINDOW_SYNC"
  | "SEASON_END"
  | "TOURNAMENT_PHASE"
  | "FREE";

export type MaxAllowedInput = {
  now: Date;
  seasonEndDate: Date;
  currentDate: Date;
  nextPendingMatch?: {
    id: string;
    scheduledAt: Date;
    mode: "CPU_VS_CPU" | "PLAYER_VS_CPU" | "PLAYER_VS_PLAYER";
    opponentManagerId?: string;
  } | null;
  nextTransferWindowOpensAt?: Date | null;
  pendingTournamentStageName?: string | null;
  pendingTournamentMinDate?: Date | null;
};

export type MaxAllowedResult = {
  maxAllowedDate: Date;
  reason: MaxAllowedReason;
  blockingDetails?: {
    matchId?: string;
    pendingUsers?: string[];
    tournamentName?: string;
    transferWindowOpensAt?: string;
  };
};

function effectiveCap(now: Date, candidate: Date): Date {
  if (candidate.getTime() < now.getTime()) return now;
  return candidate;
}

export function calculateMaxAllowedDatePure(input: MaxAllowedInput): MaxAllowedResult {
  const { now, seasonEndDate, currentDate, nextPendingMatch, nextTransferWindowOpensAt, pendingTournamentStageName, pendingTournamentMinDate } = input;

  if (now.getTime() >= seasonEndDate.getTime()) {
    return { maxAllowedDate: now, reason: "SEASON_END" };
  }

  const caps: Array<{ date: Date; reason: MaxAllowedReason; details?: MaxAllowedResult["blockingDetails"] }> = [];
  const effectiveSeasonEnd = effectiveCap(now, seasonEndDate);
  caps.push({ date: effectiveSeasonEnd, reason: "SEASON_END" });

  if (nextPendingMatch) {
    const matchCap = effectiveCap(now, nextPendingMatch.scheduledAt);
    if (nextPendingMatch.mode === "PLAYER_VS_PLAYER") {
      const opponent = nextPendingMatch.opponentManagerId ? [nextPendingMatch.opponentManagerId] : [];
      caps.push({
        date: matchCap,
        reason: "NEXT_MATCH",
        details: { matchId: nextPendingMatch.id, pendingUsers: opponent },
      });
    } else {
      caps.push({ date: matchCap, reason: "NEXT_MATCH", details: { matchId: nextPendingMatch.id } });
    }
  }

  if (nextTransferWindowOpensAt && nextTransferWindowOpensAt.getTime() > now.getTime()) {
    const dayBefore = new Date(nextTransferWindowOpensAt.getTime());
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
    const cap = effectiveCap(now, dayBefore);
    caps.push({
      date: cap,
      reason: "TRANSFER_WINDOW_SYNC",
      details: { transferWindowOpensAt: nextTransferWindowOpensAt.toISOString() },
    });
  }

  if (pendingTournamentStageName && pendingTournamentMinDate) {
    const cap = effectiveCap(now, pendingTournamentMinDate);
    caps.push({
      date: cap,
      reason: "TOURNAMENT_PHASE",
      details: { tournamentName: pendingTournamentStageName },
    });
  }

  const reasonPriority: Record<MaxAllowedReason, number> = {
    TOURNAMENT_PHASE: 0,
    TRANSFER_WINDOW_SYNC: 1,
    NEXT_MATCH: 2,
    SEASON_END: 3,
    FREE: 4,
  };
  caps.sort((a, b) => {
    const cmp = a.date.getTime() - b.date.getTime();
    if (cmp !== 0) return cmp;
    return reasonPriority[a.reason] - reasonPriority[b.reason];
  });
  const winner = caps[0]!;

  const finalDate = winner.date.getTime() < currentDate.getTime() ? currentDate : winner.date;

  return {
    maxAllowedDate: finalDate,
    reason: winner.reason,
    blockingDetails: winner.details,
  };
}
