export type MatchStatus = "PENDING" | "WAITING_PVP" | "COMPLETED" | "SIMULATED";

export interface SimulationTeam {
  id: string;
  name: string;
  strength: number;
}

export interface SimulationPlayer {
  id: string;
  teamId: string;
  name: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  overall: number;
}

export type MatchEventType = "GOAL" | "ASSIST" | "YELLOW_CARD" | "RED_CARD" | "INJURY";

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  teamId: string;
  playerId?: string;
  detail?: string;
}

export interface PlayerMatchStats {
  playerId: string;
  teamId: string;
  minutes: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passAccuracy: number;
  tackles: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  rating: number;
}

export interface SimulatedMatch {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  status: Extract<MatchStatus, "SIMULATED">;
  mvpPlayerId?: string;
  events: MatchEvent[];
  stats: PlayerMatchStats[];
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export function simulateMatch(
  home: SimulationTeam,
  away: SimulationTeam,
  players: readonly SimulationPlayer[],
  seed = 1
): SimulatedMatch {
  const homePlayers = players.filter((player) => player.teamId === home.id);
  const awayPlayers = players.filter((player) => player.teamId === away.id);
  const random = (salt: number): number => {
    const value = Math.sin(seed * 999 + salt * 77.7) * 10000;
    return value - Math.floor(value);
  };
  const expectedHome = clamp(1.15 + (home.strength - away.strength) / 35, 0.15, 3.8);
  const expectedAway = clamp(0.85 + (away.strength - home.strength) / 40, 0.1, 3.2);
  const goals = (expected: number, salt: number): number => {
    let score = Math.floor(expected * 0.35);
    for (let i = 0; i < 4; i += 1) if (random(salt + i) < expected / 6) score += 1;
    return clamp(score, 0, 6);
  };
  const homeScore = goals(expectedHome, 1);
  const awayScore = goals(expectedAway, 9);
  const events: MatchEvent[] = [];
  const goalScorers: string[] = [];
  const addGoals = (team: SimulationTeam, squad: readonly SimulationPlayer[], count: number, salt: number) => {
    const attackers = squad.filter((player) => player.position === "FWD" || player.position === "MID");
    for (let index = 0; index < count; index += 1) {
      const weightedAttackers = attackers.length > 0 ? attackers : squad;
      const player = weightedAttackers[(index + Math.floor(random(salt + index) * Math.max(1, weightedAttackers.length))) % Math.max(1, weightedAttackers.length)];
      if (player) {
        goalScorers.push(player.id);
        events.push({ minute: 8 + Math.floor(random(salt + 20 + index) * 82), type: "GOAL", teamId: team.id, playerId: player.id });
      }
    }
  };
  addGoals(home, homePlayers, homeScore, 20);
  addGoals(away, awayPlayers, awayScore, 40);
  goalScorers.forEach((scorerId, index) => {
    if (index % 2 === 0) {
      const scorer = players.find((player) => player.id === scorerId);
      const teammates = players.filter((player) => player.teamId === scorer?.teamId && player.id !== scorerId && (player.position === "FWD" || player.position === "MID"));
      const assister = teammates[index % Math.max(1, teammates.length)];
      if (assister) {
        events.push({ minute: 8 + Math.floor(random(400 + index) * 82), type: "ASSIST", teamId: scorer?.teamId ?? "", playerId: assister.id, detail: `Assist for ${scorer?.name ?? "goal"}` });
      }
    }
  });
  events.sort((a, b) => a.minute - b.minute);
  const makeStats = (squad: readonly SimulationPlayer[], teamId: string, isHome: boolean): PlayerMatchStats[] =>
    squad.map((player, index) => {
      const goalsForPlayer = events.filter((event) => event.playerId === player.id && event.type === "GOAL").length;
      const assistsForPlayer = events.filter((event) => event.playerId === player.id && event.type === "ASSIST").length;
      const shots = (player.position === "FWD" ? 2 : 1) + Math.floor(random(index + (isHome ? 50 : 90)) * 4);
      return {
        playerId: player.id,
        teamId,
        minutes: 90,
        goals: goalsForPlayer,
        assists: assistsForPlayer,
        shots,
        shotsOnTarget: goalsForPlayer + Math.floor(random(index + 130) * Math.max(1, shots)),
        passes: 18 + Math.floor(random(index + 160) * 45),
        passAccuracy: Math.round((72 + random(index + 190) * 24) * 10) / 10,
        tackles: player.position === "DEF" ? 1 + Math.floor(random(index + 220) * 5) : Math.floor(random(index + 220) * 3),
        fouls: Math.floor(random(index + 250) * 3),
        yellowCards: random(index + 280) > 0.93 ? 1 : 0,
        redCards: 0,
        rating: Math.round((6.2 + goalsForPlayer * 1.2 + random(index + 310) * 1.3) * 10) / 10
      };
    });
  const stats = [...makeStats(homePlayers, home.id, true), ...makeStats(awayPlayers, away.id, false)];
  const mvp = [...stats].sort((a, b) => b.rating - a.rating)[0];
  return { homeTeamId: home.id, awayTeamId: away.id, homeScore, awayScore, status: "SIMULATED", mvpPlayerId: mvp?.playerId, events, stats };
}
