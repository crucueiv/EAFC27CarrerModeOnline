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
      end?: string | null;
    }>;
  }>;
};

export async function getOrFetchManager(teamId: string): Promise<ManagerResult> {
  if (!prisma) {
    return {
      id: `fallback-${teamId}`,
      name: "Director Técnico",
      nationality: null,
      avatarUrl: null,
      apiSportsId: null,
      teamId
    };
  }

  try {
    // 1. Primary Query: Check PostgreSQL database first
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { managerProfile: true }
    });

    if (!team) {
      return {
        id: `fallback-${teamId}`,
        name: "Director Técnico",
        nationality: null,
        avatarUrl: null,
        apiSportsId: null,
        teamId
      };
    }

    // If manager is already hydrated in local DB, return directly (0 API calls!)
    if (team.managerProfile && team.managerProfile.name) {
      return {
        id: team.managerProfile.id,
        name: team.managerProfile.name,
        nationality: team.managerProfile.nationality,
        avatarUrl: team.managerProfile.avatarUrl,
        apiSportsId: team.managerProfile.apiSportsId,
        teamId
      };
    }

    // 2. On-demand API-Sports Fallback (only when DB has no saved manager)
    const apiKey = process.env.API_SPORTS_KEY;
    if (!apiKey) {
      return {
        id: `fallback-${teamId}`,
        name: `Mánager de ${team.name}`,
        nationality: null,
        avatarUrl: null,
        apiSportsId: null,
        teamId
      };
    }

    let apiSportsTeamId = team.apiSportsId;

    // Step A: Find team's apiSportsId if missing
    if (!apiSportsTeamId) {
      const searchName = team.normalizedName || team.name;
      const teamRes = await fetch(
        `https://v3.football.api-sports.io/teams?name=${encodeURIComponent(searchName)}`,
        {
          headers: {
            "x-apisports-key": apiKey
          },
          next: { revalidate: 86400 }
        }
      );

      if (teamRes.ok) {
        const teamData = (await teamRes.json()) as ApiSportsTeamResponse;
        if (teamData.response && teamData.response.length > 0) {
          apiSportsTeamId = teamData.response[0].team.id;
          await prisma.team.update({
            where: { id: teamId },
            data: { apiSportsId: apiSportsTeamId }
          });
        }
      }
    }

    // Step B: Query coach for the team
    if (apiSportsTeamId) {
      const coachRes = await fetch(
        `https://v3.football.api-sports.io/coachs?team=${apiSportsTeamId}`,
        {
          headers: {
            "x-apisports-key": apiKey
          },
          next: { revalidate: 86400 }
        }
      );

      if (coachRes.ok) {
        const coachData = (await coachRes.json()) as ApiSportsCoachResponse;
        if (coachData.response && coachData.response.length > 0) {
          // Find current/active coach or fallback to first
          const coach =
            coachData.response.find(
              (c) => c.career && c.career.some((car) => car.team?.id === apiSportsTeamId && !car.end)
            ) || coachData.response[0];

          const coachName =
            coach.name || `${coach.firstname || ""} ${coach.lastname || ""}`.trim() || `Mánager de ${team.name}`;
          const photoUrl = coach.photo || `https://media.api-sports.io/football/coachs/${coach.id}.png`;

          // 3. Persist in PostgreSQL
          const savedManager = await prisma.manager.upsert({
            where: { teamId },
            update: {
              name: coachName,
              nationality: coach.nationality || null,
              avatarUrl: photoUrl,
              apiSportsId: coach.id
            },
            create: {
              teamId,
              name: coachName,
              nationality: coach.nationality || null,
              avatarUrl: photoUrl,
              apiSportsId: coach.id
            }
          });

          return {
            id: savedManager.id,
            name: savedManager.name,
            nationality: savedManager.nationality,
            avatarUrl: savedManager.avatarUrl,
            apiSportsId: savedManager.apiSportsId,
            teamId
          };
        }
      }
    }

    // If API didn't return a coach, create a fallback entry in DB to avoid repeated API calls
    const fallbackManager = await prisma.manager.upsert({
      where: { teamId },
      update: {},
      create: {
        teamId,
        name: `Entrenador Principal (${team.name})`,
        nationality: null,
        avatarUrl: null
      }
    });

    return {
      id: fallbackManager.id,
      name: fallbackManager.name,
      nationality: fallbackManager.nationality,
      avatarUrl: fallbackManager.avatarUrl,
      apiSportsId: fallbackManager.apiSportsId,
      teamId
    };
  } catch (error) {
    console.error("Error in getOrFetchManager:", error);
    return {
      id: `fallback-${teamId}`,
      name: "Director Técnico",
      nationality: null,
      avatarUrl: null,
      apiSportsId: null,
      teamId
    };
  }
}
