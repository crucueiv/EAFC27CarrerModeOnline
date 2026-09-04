import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: Request) {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;
  if (!prisma) return NextResponse.json({ error: "Prisma no disponible" }, { status: 500 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ error: "q requerido (mín. 2 caracteres)" }, { status: 400 });
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { id: { equals: q } },
      ],
    },
    take: 10,
    include: {
      clubTeam: {
        select: {
          id: true,
          name: true,
          shortName: true,
          league: { select: { id: true, name: true } },
        },
      },
      memberships: {
        include: { careerGroup: { select: { id: true, name: true } } },
      },
    },
  });

  if (users.length === 0) {
    return NextResponse.json({ user: null, calendarStates: [], matches: [], transfers: [], seasons: [] });
  }

  const userId = users[0].id;
  const user = users[0];

  const [calendarStates, matches, transfers, seasons] = await Promise.all([
    prisma.teamCalendarState.findMany({
      where: { team: { managerId: userId } },
      include: { season: { select: { id: true, name: true, status: true } } },
      orderBy: { lastAdvanceAt: "desc" },
    }),
    prisma.match.findMany({
      where: { OR: [{ homeTeam: { managerId: userId } }, { awayTeam: { managerId: userId } }] },
      orderBy: { scheduledAt: "desc" },
      take: 10,
      include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
    }),
    prisma.transfer.findMany({
      where: { OR: [{ sellerId: userId }, { buyerId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { player: { select: { name: true } } },
    }),
    prisma.season.findMany({
      where: { careerGroup: { members: { some: { userId } } } },
      orderBy: { startDate: "desc" },
      take: 5,
      include: { careerGroup: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      clubTeam: user.clubTeam,
      memberships: user.memberships.map((m) => ({ id: m.id, role: m.role, careerGroup: m.careerGroup })),
      createdAt: user.createdAt.toISOString(),
    },
    calendarStates: calendarStates.map((c) => ({
      id: c.id,
      teamId: c.teamId,
      seasonId: c.seasonId,
      seasonName: c.season.name,
      seasonStatus: c.season.status,
      currentDate: c.currentDate.toISOString(),
      maxAllowedDate: c.maxAllowedDate.toISOString(),
      isLocked: c.isLocked,
      lockReason: c.lockReason,
      version: c.version,
      lastAdvanceAt: c.lastAdvanceAt.toISOString(),
    })),
    matches: matches.map((m) => ({
      id: m.id,
      scheduledAt: m.scheduledAt.toISOString(),
      homeTeam: m.homeTeam.name,
      awayTeam: m.awayTeam.name,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
    })),
    transfers: transfers.map((t) => ({
      id: t.id,
      player: t.player.name,
      status: t.status,
      fee: t.fee,
      createdAt: t.createdAt.toISOString(),
    })),
    seasons: seasons.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      careerGroup: s.careerGroup.name,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate.toISOString(),
    })),
  });
}
