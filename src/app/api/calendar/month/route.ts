import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type WindowDto = {
  id: string;
  kind: "SUMMER" | "WINTER" | "ONBOARDING_ONLY";
  status: "SCHEDULED" | "OPEN" | "CLOSED";
  opensAt: string;
  closesAt: string;
};

type MatchDto = {
  id: string;
  scheduledAt: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  isHome: boolean;
};

type CalendarMonthResponse = {
  hasClub: boolean;
  clubTeamId: string | null;
  clubTeamName: string | null;
  season: { id: string; name: string; startDate: string; endDate: string } | null;
  currentDate: string | null;
  maxAllowedDate: string | null;
  isLocked: boolean;
  lockReason: string | null;
  transferWindows: WindowDto[];
  matches: MatchDto[];
  userManagers: Array<{
    userId: string;
    name: string;
    avatarUrl: string | null;
    teamId: string;
    teamName: string;
    currentDate: string | null;
    isCurrentUser: boolean;
  }>;
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const yearParam = url.searchParams.get("year");
  const monthParam = url.searchParams.get("month");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      clubTeamId: true,
      clubTeam: {
        select: { id: true, name: true, managerId: true, league: { select: { careerGroupId: true } } },
      },
    },
  });

  const empty: CalendarMonthResponse = {
    hasClub: !!user?.clubTeam,
    clubTeamId: user?.clubTeamId ?? null,
    clubTeamName: user?.clubTeam?.name ?? null,
    season: null,
    currentDate: null,
    maxAllowedDate: null,
    isLocked: false,
    lockReason: null,
    transferWindows: [],
    matches: [],
    userManagers: [],
  };

  if (!user?.clubTeam) {
    return NextResponse.json(empty satisfies CalendarMonthResponse);
  }

  const season = await prisma.season.findFirst({
    where: { careerGroupId: user.clubTeam.league?.careerGroupId ?? "__none__", status: "ACTIVE" },
    select: { id: true, name: true, startDate: true, endDate: true },
    orderBy: { startDate: "desc" },
  });

  if (!season) {
    return NextResponse.json(empty satisfies CalendarMonthResponse);
  }

  const calendarForDefault = await prisma.teamCalendarState.findUnique({
    where: { teamId_seasonId: { teamId: user.clubTeam.id, seasonId: season.id } },
    select: { currentDate: true },
  });

  const now = new Date();
  const defaultDate =
    calendarForDefault?.currentDate ?? season.startDate ?? now;
  const defaultYear = yearParam ? Number(yearParam) : defaultDate.getUTCFullYear();
  const defaultMonth = monthParam ? Number(monthParam) : defaultDate.getUTCMonth() + 1;

  if (!Number.isInteger(defaultYear) || !Number.isInteger(defaultMonth) || defaultMonth < 1 || defaultMonth > 12) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const year = defaultYear;
  const month = defaultMonth;

  const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0));

  const [calendar, windows, matches, userManagedTeams] = await Promise.all([
    prisma.teamCalendarState.findUnique({
      where: { teamId_seasonId: { teamId: user.clubTeam!.id, seasonId: season.id } },
      select: { currentDate: true, maxAllowedDate: true, isLocked: true, lockReason: true },
    }),
    prisma.transferWindow.findMany({
      where: { seasonId: season.id },
      select: { id: true, kind: true, status: true, opensAt: true, closesAt: true },
      orderBy: { opensAt: "asc" },
    }),
    prisma.match.findMany({
      where: {
        seasonId: season.id,
        OR: [{ homeTeamId: user.clubTeam!.id }, { awayTeamId: user.clubTeam!.id }],
        scheduledAt: { gte: monthStart, lt: monthEnd },
      },
      orderBy: { scheduledAt: "asc" },
      include: { homeTeam: { select: { id: true, name: true } }, awayTeam: { select: { id: true, name: true } } },
    }),
    prisma.team.findMany({
      where: {
        managerId: { not: null },
        league: { careerGroupId: user.clubTeam.league?.careerGroupId ?? "__none__" },
      },
      select: {
        id: true,
        name: true,
        manager: { select: { id: true, name: true, username: true, avatarUrl: true, image: true } },
        calendarStates: {
          where: { seasonId: season.id },
          select: { currentDate: true },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const dto: CalendarMonthResponse = {
    hasClub: true,
    clubTeamId: user.clubTeam!.id,
    clubTeamName: user.clubTeam!.name,
    season: {
      id: season.id,
      name: season.name,
      startDate: season.startDate.toISOString(),
      endDate: season.endDate.toISOString(),
    },
    currentDate: calendar?.currentDate ? calendar.currentDate.toISOString() : season.startDate.toISOString(),
    maxAllowedDate: calendar?.maxAllowedDate ? calendar.maxAllowedDate.toISOString() : season.startDate.toISOString(),
    isLocked: calendar?.isLocked ?? false,
    lockReason: calendar?.lockReason ?? null,
    transferWindows: windows.map((w) => ({
      id: w.id,
      kind: w.kind,
      status: w.status,
      opensAt: w.opensAt.toISOString(),
      closesAt: w.closesAt.toISOString(),
    })),
    matches: matches.map((m) => ({
      id: m.id,
      scheduledAt: m.scheduledAt.toISOString(),
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeTeamName: m.homeTeam.name,
      awayTeamName: m.awayTeam.name,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      isHome: m.homeTeamId === user.clubTeam!.id,
    })),
    userManagers: userManagedTeams
      .filter((team) => team.manager)
      .map((team) => ({
        userId: team.manager!.id,
        name: team.manager!.name ?? team.manager!.username ?? "Manager",
        avatarUrl: team.manager!.avatarUrl ?? team.manager!.image ?? null,
        teamId: team.id,
        teamName: team.name,
        currentDate: team.calendarStates[0]?.currentDate?.toISOString() ?? null,
        isCurrentUser: team.manager!.id === session.user.id,
      })),
  };

  return NextResponse.json(dto);
}
