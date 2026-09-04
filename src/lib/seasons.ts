import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

type SeasonResult = {
  id: string;
  name: string;
  status: string;
  careerGroupId: string;
  leagueId: string | null;
};

/**
 * Devuelve la season ACTIVE del CareerGroup al que pertenece el usuario.
 *
 * Si el usuario aún no tiene CareerGroup, se crea uno automáticamente junto con
 * una season 1. Esto permite que el flujo de traspasos funcione sin que el
 * usuario haya iniciado manualmente una temporada.
 */
export async function getOrCreateActiveSeason(
  userId: string,
  leagueId: string | null
): Promise<SeasonResult> {
  if (!prisma) {
    throw new Error("Prisma no está disponible");
  }

  // 1. Buscar membership + season ACTIVE.
  const membership = await prisma.careerGroupMember.findFirst({
    where: { userId },
    include: {
      careerGroup: {
        include: {
          seasons: {
            where: { status: "ACTIVE" },
            orderBy: { startDate: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (membership?.careerGroup.seasons?.[0]) {
    return membership.careerGroup.seasons[0];
  }

  // 2. Si pertenece a un CareerGroup pero no tiene season ACTIVE, crear una nueva.
  let careerGroupId = membership?.careerGroupId;
  if (!careerGroupId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, username: true, email: true },
    });
    const ownerName =
      user?.username || user?.name || user?.email?.split("@")[0] || "Manager";
    const group = await prisma.careerGroup.create({
      data: {
        name: `Carrera de ${ownerName}`,
        inviteCode: `auto-${randomBytes(8).toString("hex")}`,
      },
    });
    await prisma.careerGroupMember.create({
      data: {
        userId,
        careerGroupId: group.id,
        role: "OWNER",
      },
    });
    careerGroupId = group.id;
  }

  // 3. Crear la nueva season ACTIVE.
  const now = new Date();
  const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const newSeason = await prisma.season.create({
    data: {
      name: "Temporada 1",
      status: "ACTIVE",
      startDate: now,
      endDate: oneYearLater,
      careerGroupId,
      leagueId,
      currentWeek: 1,
      isTransferWindowOpen: true,
    },
  });

  return newSeason;
}
