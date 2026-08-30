import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getOrFetchManager } from "@/lib/managers/getOrFetchManager";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = params.id;

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { id: true, name: true, eaId: true },
    });

    if (!league) {
      return NextResponse.json({ error: "Liga no encontrada" }, { status: 404 });
    }

    const teams = await prisma.team.findMany({
      where: { leagueId },
      include: {
        manager: { select: { id: true, username: true, avatarUrl: true } },
        managerProfile: { select: { id: true, name: true, avatarUrl: true, apiSportsId: true } },
        rosters: { where: { isActive: true }, select: { id: true } },
      },
      orderBy: { name: "asc" },
    });

    const result = await Promise.all(
      teams.map(async (team) => {
        const realManager = await getOrFetchManager(team.id);
        return {
          id: team.id,
          eaId: team.eaId,
          name: team.name,
          shortName: team.shortName,
          imageUrl: team.imageUrl,
          squadSize: team.rosters.length,
          hasUserManager: !!team.manager,
          currentManager: team.manager?.username
            ? `${realManager.name} (${team.manager.username})`
            : realManager.name,
          budget: team.budget,
        };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
