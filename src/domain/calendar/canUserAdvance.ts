export type CalendarMatchStatus = "PENDING" | "WAITING_PVP" | "COMPLETED" | "SIMULATED";

export interface CalendarMatch {
  id: string;
  scheduledAt: Date;
  status: CalendarMatchStatus;
  homeManagerId?: string;
  awayManagerId?: string;
  dependencyIds?: readonly string[];
}

export interface CalendarDependency {
  id: string;
  status: CalendarMatchStatus;
}

export interface AdvanceDecision {
  allowed: boolean;
  reason: "NO_MATCHES" | "WAITING_FOR_PVP" | "WAITING_FOR_DEPENDENCY" | "READY";
  nextMatch?: CalendarMatch;
  blockingMatchId?: string;
}

export function canUserAdvance(
  userId: string,
  now: Date,
  matches: readonly CalendarMatch[],
  dependencies: readonly CalendarDependency[] = []
): AdvanceDecision {
  const upcoming = matches
    .filter((match) => {
      const isParticipant = match.homeManagerId === userId || match.awayManagerId === userId;
      return isParticipant && match.scheduledAt.getTime() >= now.getTime() && match.status !== "COMPLETED" && match.status !== "SIMULATED";
    })
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  const nextMatch = upcoming[0];
  if (!nextMatch) return { allowed: false, reason: "NO_MATCHES" };
  if (nextMatch.status === "WAITING_PVP") {
    return { allowed: false, reason: "WAITING_FOR_PVP", nextMatch };
  }
  const blockingDependency = (nextMatch.dependencyIds ?? [])
    .map((id) => dependencies.find((dependency) => dependency.id === id))
    .find((dependency) => dependency && dependency.status !== "COMPLETED" && dependency.status !== "SIMULATED");
  if (blockingDependency) {
    return { allowed: false, reason: "WAITING_FOR_DEPENDENCY", nextMatch, blockingMatchId: blockingDependency.id };
  }
  return { allowed: true, reason: "READY", nextMatch };
}
