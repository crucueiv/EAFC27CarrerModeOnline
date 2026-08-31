import { prisma } from "@/lib/prisma";

export type ManagerResult = {
  id: string;
  name: string;
  nationality: string | null;
  avatarUrl: string | null;
  apiSportsId: number | null;
  teamId: string;
};

type ApiSportsTeamResponse = {
  response: Array<{
    team: {
      id: number;
      name: string;
    };
  }>;
};

type ApiSportsCoachResponse = {
  response: Array<{
    id: number;
    name: string;
    firstname?: string;
    lastname?: string;
    nationality?: string;
    photo?: string;
    career?: Array<{
      team?: { id: number };
      start?: string;
      end?: string | null;
    }>;
  }>;
};

const FETCH_TIMEOUT_MS = 5000;

const GENERIC_AVATAR_URL =
  "https://res.cloudinary.com/oiugg8m6/image/upload/v1788133891/qvbsomljzzcmickbhyad.png";

const FIRST_NAMES = [
  "Carlos", "Javier", "Miguel", "Antonio", "Fernando", "Roberto", "Alberto", "Pablo",
  "Luis", "Manuel", "Francisco", "Pedro", "Juan", "José", "David", "Alejandro",
  "Diego", "Sergio", "Andrés", "Marcos", "Vicente", "Ricardo", "Eduardo", "Raúl",
  "Enrique", "Gabriel", "Rafael", "Tomás", "Adrián", "Héctor"
];

const LAST_NAMES = [
  "García", "Rodríguez", "Martínez", "López", "González", "Sánchez", "Pérez", "Gómez",
  "Fernández", "Torres", "Ruiz", "Ramírez", "Moreno", "Jiménez", "Morales", "Castillo",
  "Ortiz", "Vargas", "Flores", "Gutiérrez", "Reyes", "Cruz", "Herrera", "Medina",
  "Aguilar", "Vega", "Castro", "Romero", "Soler", "Molina"
];

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

function generateDeterministicName(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const absHash = Math.abs(hash);
  const firstName = FIRST_NAMES[absHash % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(absHash >> 8) % LAST_NAMES.length];
  return `${firstName} ${lastName}`;
}

async function saveFallbackManager(teamId: string, teamName?: string): Promise<ManagerResult> {
  const name = teamName ? generateDeterministicName(teamId) : "Director Técnico";

  if (!prisma) {
    return {
      id: `fallback-${teamId}`,
      name,
      nationality: null,
      avatarUrl: GENERIC_AVATAR_URL,
      apiSportsId: null,
      teamId,
    };
  }

  try {
    const saved = await prisma.manager.upsert({
      where: { teamId },
      update: {
        name,
        avatarUrl: GENERIC_AVATAR_URL,
        apiSportsId: null,
      },
      create: {
        teamId,
        name,
        avatarUrl: GENERIC_AVATAR_URL,
        apiSportsId: null,
      },
    });
    console.log(`[getOrFetchManager] ✅ fallback manager saved: ${saved.name} (id=${saved.id})`);
    return {
      id: saved.id,
      name: saved.name,
      nationality: null,
      avatarUrl: saved.avatarUrl,
      apiSportsId: null,
      teamId,
    };
  } catch (err) {
    console.error("[getOrFetchManager] failed to save fallback manager:", err);
    return {
      id: `fallback-${teamId}`,
      name,
      nationality: null,
      avatarUrl: GENERIC_AVATAR_URL,
      apiSportsId: null,
      teamId,
    };
  }
}

export async function getOrFetchManager(teamId: string): Promise<ManagerResult> {
  console.log(`[getOrFetchManager] ▶ start teamId="${teamId}"`);
  if (!prisma) {
    console.warn("[getOrFetchManager] ⚠️ prisma unavailable, returning fallback");
    return saveFallbackManager(teamId);
  }

  try {
    const isNumericId = /^\d+$/.test(teamId);
    const team = await prisma.team.findFirst({
      where: isNumericId
        ? { OR: [{ id: teamId }, { apiSportsId: Number(teamId) }] }
        : { id: teamId },
      include: { managerProfile: true },
    });

    if (!team) {
      console.warn(`[getOrFetchManager] ⚠️ team "${teamId}" not found in DB`);
      return saveFallbackManager(teamId);
    }
    console.log(`[getOrFetchManager] team found: name="${team.name}", apiSportsId=${team.apiSportsId}, managerProfile=${team.managerProfile ? `{name: "${team.managerProfile.name}", apiSportsId: ${team.managerProfile.apiSportsId}}` : "null"}`);

    const internalTeamId = team.id;

    if (team.managerProfile && team.managerProfile.apiSportsId) {
      console.log(`[getOrFetchManager] ✓ returning cached manager: ${team.managerProfile.name}`);
      return {
        id: team.managerProfile.id,
        name: team.managerProfile.name,
        nationality: team.managerProfile.nationality,
        avatarUrl: team.managerProfile.avatarUrl,
        apiSportsId: team.managerProfile.apiSportsId,
        teamId: internalTeamId,
      };
    }

    if (team.managerProfile && !team.managerProfile.apiSportsId) {
      console.log(`[getOrFetchManager] ✓ returning cached fallback manager: ${team.managerProfile.name}`);
      return {
        id: team.managerProfile.id,
        name: team.managerProfile.name,
        nationality: team.managerProfile.nationality,
        avatarUrl: team.managerProfile.avatarUrl,
        apiSportsId: null,
        teamId: internalTeamId,
      };
    }

    const apiKey = process.env.API_SPORTS_KEY;
    if (!apiKey) {
      console.warn(`[getOrFetchManager] ⚠️ API_SPORTS_KEY not defined in .env`);
      return saveFallbackManager(internalTeamId, team.name);
    }

    let apiSportsTeamId = team.apiSportsId;

    if (!apiSportsTeamId) {
      const queryName = team.normalizedName || team.name;
      const teamUrl = `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(queryName)}`;
      console.log(`[getOrFetchManager] → API-Sports search team: ${teamUrl}`);

      try {
        const teamRes = await fetchWithTimeout(teamUrl, {
          headers: { "x-apisports-key": apiKey },
          cache: "no-store",
        }, FETCH_TIMEOUT_MS);

        if (teamRes.ok) {
          const teamData = (await teamRes.json()) as ApiSportsTeamResponse;
          if (teamData.response && teamData.response.length > 0) {
            apiSportsTeamId = teamData.response[0].team.id;
            await prisma.team.update({
              where: { id: internalTeamId },
              data: { apiSportsId: apiSportsTeamId },
            });
            console.log(`[getOrFetchManager] ✓ API-Sports team id: ${apiSportsTeamId} (saved to DB)`);
          } else {
            console.warn(`[getOrFetchManager] ⚠️ no results from API-Sports for "${queryName}"`);
          }
        } else {
          console.error(`[getOrFetchManager] ❌ API-Sports Teams HTTP ${teamRes.status}`);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (err instanceof Error && err.name === 'AbortError') {
          console.warn(`[getOrFetchManager] ⏱ timeout fetching team for "${queryName}"`);
        } else {
          console.error(`[getOrFetchManager] ❌ error fetching team: ${errMsg}`);
        }
      }
    } else {
      console.log(`[getOrFetchManager] reusing cached apiSportsId: ${apiSportsTeamId}`);
    }

    if (apiSportsTeamId) {
      const coachUrl = `https://v3.football.api-sports.io/coachs?team=${apiSportsTeamId}`;
      console.log(`[getOrFetchManager] → API-Sports coachs: ${coachUrl}`);

      try {
        const coachRes = await fetchWithTimeout(coachUrl, {
          headers: { "x-apisports-key": apiKey },
          cache: "no-store",
        }, FETCH_TIMEOUT_MS);

        if (coachRes.ok) {
          const coachData = (await coachRes.json()) as ApiSportsCoachResponse;
          if (coachData.response && coachData.response.length > 0) {
            const activeCoaches = coachData.response
              .filter((c) => c.career?.some((car) => car.team?.id === apiSportsTeamId && !car.end))
              .sort((a, b) => {
                const aStart = a.career?.find((car) => car.team?.id === apiSportsTeamId && !car.end)?.start ?? "";
                const bStart = b.career?.find((car) => car.team?.id === apiSportsTeamId && !car.end)?.start ?? "";
                return bStart.localeCompare(aStart);
              });
            const coach = activeCoaches[0] || coachData.response[0];

            const coachName =
              coach.name || `${coach.firstname || ""} ${coach.lastname || ""}`.trim() || `Entrenador de ${team.name}`;
            const photoUrl = coach.photo || `https://media.api-sports.io/football/coachs/${coach.id}.png`;

            const savedManager = await prisma.manager.upsert({
              where: { teamId: internalTeamId },
              update: {
                name: coachName,
                nationality: coach.nationality || null,
                avatarUrl: photoUrl,
                apiSportsId: coach.id,
              },
              create: {
                teamId: internalTeamId,
                name: coachName,
                nationality: coach.nationality || null,
                avatarUrl: photoUrl,
                apiSportsId: coach.id,
              },
            });
            console.log(`[getOrFetchManager] ✅ manager saved: ${savedManager.name} (id=${savedManager.id})`);
            return {
              id: savedManager.id,
              name: savedManager.name,
              nationality: savedManager.nationality,
              avatarUrl: savedManager.avatarUrl,
              apiSportsId: savedManager.apiSportsId,
              teamId: internalTeamId,
            };
          } else {
            console.warn(`[getOrFetchManager] ⚠️ no coachs for team id ${apiSportsTeamId}`);
          }
        } else {
          console.error(`[getOrFetchManager] ❌ API-Sports Coachs HTTP ${coachRes.status}`);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (err instanceof Error && err.name === 'AbortError') {
          console.warn(`[getOrFetchManager] ⏱ timeout fetching coachs for team ${apiSportsTeamId}`);
        } else {
          console.error(`[getOrFetchManager] ❌ error fetching coachs: ${errMsg}`);
        }
      }
    }

    console.log(`[getOrFetchManager] ⚠️ no real manager found, saving fallback for ${team.name}`);
    return saveFallbackManager(internalTeamId, team.name);
  } catch (error) {
    console.error(`[getOrFetchManager] ❌ unexpected error:`, error);
    return saveFallbackManager(teamId);
  }
}
