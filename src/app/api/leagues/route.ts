import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const FEMALE_LEAGUE_KEYWORDS = ["Frauen", "Women", "Femení", "Femminile", "Féminin", "Dames"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const continent = searchParams.get("continent");
  const country = searchParams.get("country");

  try {
    if (!continent) {
      const continents = await prisma.league.groupBy({
        by: ["continent"],
        _count: { continent: true },
        orderBy: { continent: "asc" },
      });
      return NextResponse.json(
        continents.map((c) => ({ name: c.continent, count: c._count.continent }))
      );
    }

    if (!country) {
      const countries = await prisma.league.findMany({
        where: { continent },
        select: { country: true },
        distinct: ["country"],
        orderBy: { country: "asc" },
      });
      return NextResponse.json(
        countries.map((c) => ({ name: c.country }))
      );
    }

    const leagues = await prisma.league.findMany({
      where: {
        continent,
        country,
        NOT: FEMALE_LEAGUE_KEYWORDS.map((kw) => ({
          name: { contains: kw, mode: "insensitive" as const }
        }))
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        eaId: true,
        country: true,
        continent: true,
      },
      orderBy: { name: "asc" },
    });

    const leaguesWithIcons = await Promise.all(
      leagues.map(async (league) => {
        let imageUrl = league.imageUrl;
        if (league.eaId) {
          imageUrl = `https://assets.easysbc.io/fc26/leagues/${league.eaId}.png`;
        } else if (!imageUrl) {
          const randomTeam = await prisma.team.findFirst({
            where: { leagueId: league.id },
            select: { imageUrl: true },
          });
          imageUrl = randomTeam?.imageUrl ?? null;
        }
        return { ...league, imageUrl };
      })
    );

    return NextResponse.json(leaguesWithIcons);
  } catch (error) {
    console.error("Error fetching leagues:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}