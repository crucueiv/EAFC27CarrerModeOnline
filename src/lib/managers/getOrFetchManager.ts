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
  console.log(`🔍 Buscando mánager para el equipo ID: ${teamId}`);
  if (!prisma) {
    console.warn("⚠️ El cliente de Prisma no está disponible (prisma es undefined/null).");
    return {
      id: `fallback-${teamId}`,
      name: "Director Técnico",
      nationality: null,
      avatarUrl: null,
      apiSportsId: null,
      teamId,
    };
  }

  try {
    // El teamId que llega desde el front puede ser el id interno (cuid) de nuestra
    // base de datos O el id externo de API-Sports (numérico), según de dónde venga
    // el objeto `player` (ficha propia vs. resultado de búsqueda de transferencias).
    // Contemplamos ambos casos al buscar el equipo para no fallar en silencio.
    const isNumericId = /^\d+$/.test(teamId);

    // 1. Consulta en PostgreSQL
    const team = await prisma.team.findFirst({
      where: isNumericId
        ? { OR: [{ id: teamId }, { apiSportsId: Number(teamId) }] }
        : { id: teamId },
      include: { managerProfile: true },
    });

    if (!team) {
      // Si ves este warning repetidamente, esta es la causa más probable de que
      // nunca se llegue a mostrar el mánager real: el teamId recibido no
      // corresponde a ningún equipo existente en la tabla `Team`.
      console.warn(
        `⚠️ No se encontró ningún equipo en la base de datos para teamId="${teamId}" ` +
          `(buscado por id interno${isNumericId ? " y apiSportsId" : ""}). Se devuelve un mánager genérico.`
      );
      return {
        id: `fallback-${teamId}`,
        name: "Director Técnico",
        nationality: null,
        avatarUrl: null,
        apiSportsId: null,
        teamId,
      };
    }

    // A partir de aquí trabajamos siempre con el id interno real del equipo,
    // aunque nos hayan pasado el apiSportsId como teamId.
    const internalTeamId = team.id;

    // CORRECCIÓN 1: Solo retornar directamente si YA TIENE un apiSportsId asignado
    // Si es un fallback anterior (apiSportsId es null), permitimos que intente buscar de nuevo en la API
    if (team.managerProfile && team.managerProfile.apiSportsId) {
      return {
        id: team.managerProfile.id,
        name: team.managerProfile.name,
        nationality: team.managerProfile.nationality,
        avatarUrl: team.managerProfile.avatarUrl,
        apiSportsId: team.managerProfile.apiSportsId,
        teamId: internalTeamId,
      };
    }

    // 2. Consulta a API-Sports
    const apiKey = process.env.API_SPORTS_KEY;
    if (!apiKey) {
      console.warn("⚠️ API_SPORTS_KEY no está definida en el entorno (.env)");
      return {
        id: team.managerProfile?.id || `fallback-${internalTeamId}`,
        name: team.managerProfile?.name || `Mánager de ${team.name}`,
        nationality: null,
        avatarUrl: null,
        apiSportsId: null,
        teamId: internalTeamId,
      };
    }

    let apiSportsTeamId = team.apiSportsId;

    // Buscar ID del equipo en API-Sports si no lo tenemos
    if (!apiSportsTeamId) {
      // Limpiar prefijos/sufijos habituales para mejorar coincidencia (ej: FC, CF, Real)
      const queryName = team.normalizedName || team.name;

      // CORRECCIÓN 2: Usar ?search= en lugar de ?name= para coincidencia parcial
      const teamRes = await fetch(
        `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(queryName)}`,
        {
          headers: { "x-apisports-key": apiKey },
          cache: "no-store", // No cachear para poder reintentar si falla
        }
      );

      if (teamRes.ok) {
        const teamData = (await teamRes.json()) as ApiSportsTeamResponse;
        if (teamData.response && teamData.response.length > 0) {
          apiSportsTeamId = teamData.response[0].team.id;

          // Guardar apiSportsId en el equipo para futuras consultas rápidas
          await prisma.team.update({
            where: { id: internalTeamId },
            data: { apiSportsId: apiSportsTeamId },
          });
          console.log(`✅ ID API-Sports encontrado para ${team.name}: ${apiSportsTeamId}`);
        } else {
          console.warn(`⚠️ No se encontró el equipo "${queryName}" en API-Sports.`);
        }
      } else {
        console.error(`❌ Error HTTP API-Sports Teams: ${teamRes.status}`);
      }
    }

    // Consultar el entrenador del equipo si tenemos el ID de API-Sports
    if (apiSportsTeamId) {
      const coachRes = await fetch(
        `https://v3.football.api-sports.io/coachs?team=${apiSportsTeamId}`,
        {
          headers: { "x-apisports-key": apiKey },
          cache: "no-store",
        }
      );

      if (coachRes.ok) {
        const coachData = (await coachRes.json()) as ApiSportsCoachResponse;
        if (coachData.response && coachData.response.length > 0) {
          // Seleccionar el entrenador actual (sin fecha de fin) o el primero de la lista
          const coach =
            coachData.response.find(
              (c) => c.career && c.career.some((car) => car.team?.id === apiSportsTeamId && !car.end)
            ) || coachData.response[0];

          const coachName =
            coach.name || `${coach.firstname || ""} ${coach.lastname || ""}`.trim() || `Entrenador de ${team.name}`;
          const photoUrl = coach.photo || `https://media.api-sports.io/football/coachs/${coach.id}.png`;

          // Persistir o actualizar en PostgreSQL con el apiSportsId válido
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

          console.log(`✅ Mánager guardado correctamente: ${savedManager.name}`);

          return {
            id: savedManager.id,
            name: savedManager.name,
            nationality: savedManager.nationality,
            avatarUrl: savedManager.avatarUrl,
            apiSportsId: savedManager.apiSportsId,
            teamId: internalTeamId,
          };
        } else {
          console.warn(`⚠️ No se encontraron entrenadores para el equipo ID ${apiSportsTeamId}`);
        }
      } else {
        console.error(`❌ Error HTTP API-Sports Coachs: ${coachRes.status}`);
      }
    }

    // Fallback temporal (sin apiSportsId) para que vuelva a intentarlo en la próxima apertura si se soluciona el problema de la API
    return {
      id: team.managerProfile?.id || `fallback-${internalTeamId}`,
      name: team.managerProfile?.name || `Entrenador de ${team.name}`,
      nationality: team.managerProfile?.nationality || null,
      avatarUrl: team.managerProfile?.avatarUrl || null,
      apiSportsId: null,
      teamId: internalTeamId,
    };
  } catch (error) {
    console.error("Error en getOrFetchManager:", error);
    return {
      id: `fallback-${teamId}`,
      name: "Director Técnico",
      nationality: null,
      avatarUrl: null,
      apiSportsId: null,
      teamId,
    };
  }
}