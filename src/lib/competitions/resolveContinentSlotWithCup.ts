export type ContinentSlotInput = {
  leagueStandings: Array<{ rank: number; teamId: string }>;
  cupWinnerTeamId: string | null;
  slotLeagueRank: number;
};

export type ContinentSlotResult = {
  teamId: string;
  source: "LEAGUE" | "CUP" | "PROMOTED_LEAGUE";
};

export function resolveContinentSlotWithCup(input: ContinentSlotInput): ContinentSlotResult {
  const fromLeague = input.leagueStandings.find((s) => s.rank === input.slotLeagueRank);
  if (!fromLeague) {
    return { teamId: "", source: "LEAGUE" };
  }
  if (!input.cupWinnerTeamId) {
    return { teamId: fromLeague.teamId, source: "LEAGUE" };
  }
  const cupWinnerInLeague = input.leagueStandings.some((s) => s.teamId === input.cupWinnerTeamId);
  if (!cupWinnerInLeague) {
    return { teamId: fromLeague.teamId, source: "LEAGUE" };
  }
  const nextLeague = input.leagueStandings.find((s) => s.rank > input.slotLeagueRank);
  if (nextLeague) {
    return { teamId: nextLeague.teamId, source: "PROMOTED_LEAGUE" };
  }
  return { teamId: input.cupWinnerTeamId, source: "CUP" };
}
