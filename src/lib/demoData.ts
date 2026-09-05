import type { CalendarMatch } from "@/domain/calendar/canUserAdvance";

export const demoMatches: CalendarMatch[] = [
  { id: "m1", scheduledAt: new Date("2026-09-05T15:00:00Z"), status: "PENDING", homeManagerId: "demo-user" },
  { id: "m2", scheduledAt: new Date("2026-09-12T15:00:00Z"), status: "WAITING_PVP", homeManagerId: "demo-user" }
];

export const demoTeams = [
  { id: "northbridge", name: "Northbridge FC", shortName: "NBR", strength: 78 },
  { id: "riverside", name: "Riverside Athletic", shortName: "RSA", strength: 75 }
];

export const demoTransferPlayers = [
  {
    id: "demo-alex-morgan",
    eaId: 100001,
    avatarUrl: null,
    name: "Alex Morgan",
    position: "FWD",
    overall: 84,
    potential: 87,
    pace: 88,
    shooting: 86,
    passing: 79,
    dribbling: 91,
    defending: 38,
    physical: 74,
    marketValue: 18000000,
    currentTeam: { id: "northbridge", eaId: null, name: "Northbridge FC", shortName: "NBR", imageUrl: null, primaryColor: null, managerId: null, league: { id: "demo-league", name: "Demo Premier League", imageUrl: null, eaId: null } },
    nationality: { id: "usa", name: "United States", code: "US", flagUrl: null }
  },
  {
    id: "demo-sam-wright",
    eaId: 100002,
    avatarUrl: null,
    name: "Sam Wright",
    position: "MID",
    overall: 78,
    potential: 84,
    pace: 76,
    shooting: 71,
    passing: 88,
    dribbling: 80,
    defending: 65,
    physical: 70,
    marketValue: 8500000,
    currentTeam: { id: "riverside", eaId: null, name: "Riverside Athletic", shortName: "RSA", imageUrl: null, primaryColor: null, managerId: null, league: { id: "demo-league", name: "Demo Premier League", imageUrl: null, eaId: null } },
    nationality: { id: "gb", name: "United Kingdom", code: "GB", flagUrl: null }
  },
  {
    id: "demo-casey-smith",
    eaId: 100003,
    avatarUrl: null,
    name: "Casey Smith",
    position: "DEF",
    overall: 76,
    potential: 80,
    pace: 72,
    shooting: 42,
    passing: 68,
    dribbling: 58,
    defending: 86,
    physical: 82,
    marketValue: 5000000,
    currentTeam: { id: "free-agents", eaId: "FREE_AGENTS", name: "Agentes Libres", shortName: "AGENT", imageUrl: "https://www.fifacm.com/content/media/imgs/fifa21/teams/256/l111592.png", primaryColor: null, managerId: null, league: null },
    nationality: { id: "de", name: "Germany", code: "DE", flagUrl: null }
  }
];
