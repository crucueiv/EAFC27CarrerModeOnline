import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const FEMALE_LEAGUE_KEYWORDS = ["Frauen", "Women", "Femení", "Femminile", "Féminin", "Dames"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const continent = searchParams.get("continent");
  const country = searchParams.get("country");

  try {
    const allLeagues = await prisma.league.findMany({
      include: { _count: { select: { teams: true } } },
      orderBy: { name: "asc" },
    });

    const playableLeagues = allLeagues.filter((league) => league._count.teams >= 10);

    if (!continent) {
      const countsByContinent = new Map<string, number>();
      for (const league of playableLeagues) {
        const current = countsByContinent.get(league.continent) ?? 0;
        countsByContinent.set(league.continent, current + 1);
      }

      return NextResponse.json(
        Array.from(countsByContinent.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    }

    if (!country) {
      const countries = Array.from(
        new Set(
          playableLeagues
            .filter((league) => league.continent === continent)
            .map((league) => league.country)
        )
      ).sort((a, b) => a.localeCompare(b));
      return NextResponse.json(countries.map((name) => ({ name })));
    }

    const leagues = playableLeagues.filter(
      (league) =>
        league.continent === continent &&
        league.country === country &&
        !FEMALE_LEAGUE_KEYWORDS.some((kw) =>
          league.name.toLowerCase().includes(kw.toLowerCase())
        )
    );

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

    return NextResponse.json(
      leaguesWithIcons.map(({ _count, ...rest }) => rest).sort((a, b) => a.name.localeCompare(b.name))
    );
  } catch (error) {
    console.error("Error fetching leagues:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}