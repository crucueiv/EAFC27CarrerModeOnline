import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { translatePosition } from "@/lib/constants/position-translation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      clubTeam: {
        include: {
          league: true,
          managerProfile: true,
          rosters: { where: { isActive: true }, include: { player: true } },
        },
      },
    },
  });

  if (!user || !user.clubTeam) redirect("/onboarding/profile");

  const clubTeamId = user.clubTeam.id;

  const [lastMatches, leagueTeams] = await Promise.all([
    prisma.match.findMany({
      where: { OR: [{ homeTeamId: clubTeamId }, { awayTeamId: clubTeamId }] },
      orderBy: { scheduledAt: "desc" },
      take: 5,
      include: { homeTeam: true, awayTeam: true },
    }),
    user.clubTeam.leagueId
      ? prisma.team.findMany({
          where: { leagueId: user.clubTeam.leagueId },
          select: { id: true, name: true, shortName: true },
        })
      : [],
  ]);

  const squadSize = user.clubTeam.rosters.length;
  const avgOverall = squadSize > 0
    ? Math.round(user.clubTeam.rosters.reduce((sum, r) => sum + r.player.overall, 0) / squadSize)
    : 0;

  const topPlayers = [...user.clubTeam.rosters]
    .sort((a, b) => b.player.overall - a.player.overall)
    .slice(0, 5);

  function overallColor(o: number) {
    if (o >= 90) return "#A855F7";
    if (o > 85) return "#EAB308";
    if (o >= 75) return "#94A3B8";
    return "#B45309";
  }

  function overallBg(o: number) {
    if (o >= 90) return "bg-gradient-to-br from-amber-200 via-purple-100 to-indigo-200";
    if (o > 85) return "bg-yellow-500/10";
    if (o >= 75) return "bg-slate-300/20";
    return "bg-amber-700/10";
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-pitch p-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm uppercase tracking-widest text-emerald-200">Tu club</p>
            <div className="mt-2 flex items-center gap-3">
              {user.clubTeam.imageUrl && (
                <img src={user.clubTeam.imageUrl} alt="" className="h-10 w-10 rounded-lg object-contain bg-white/10 p-0.5" />
              )}
              <h1 className="text-4xl font-bold">{user.clubTeam.name}</h1>
            </div>
            <div className="mt-3 flex items-center gap-2 text-emerald-50">
              {user.clubTeam.league?.imageUrl && (
                <img src={user.clubTeam.league.imageUrl} alt="" className="h-5 w-5 rounded object-contain" />
              )}
              <span>{user.clubTeam.league?.name || "Liga desconocida"}</span>
              <span className="text-emerald-300">·</span>
              <span>Manager: {user.username}</span>
            </div>
          </div>
          {session.user.avatarUrl && (
            <img src={session.user.avatarUrl} alt={user.username || ""} className="h-16 w-16 rounded-full border-2 border-white/20 object-cover" />
          )}
        </div>
        <div className="mt-6 flex gap-3">
          <Link href="/calendar" className="inline-block rounded-lg bg-gold px-4 py-2 font-semibold text-ink">
            Abrir calendario
          </Link>
          <Link href="/squad" className="inline-block rounded-lg bg-white/20 px-4 py-2 font-semibold text-white hover:bg-white/30">
            Ver plantilla
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-slate-500">Jugadores</p>
          <p className="mt-1 text-2xl font-bold text-pitch">{squadSize}</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-slate-500">Media del equipo</p>
          <p className="mt-1 text-2xl font-bold text-pitch">{avgOverall} OVR</p>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-slate-500">Presupuesto</p>
          <p className="mt-1 text-2xl font-bold text-pitch">
            {(user.clubTeam.budget / 1_000_000).toFixed(1)}M€
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold text-pitch">Mejores jugadores</h2>
          {topPlayers.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Sin jugadores</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {topPlayers.map((r) => {
                const o = r.player.overall;
                const radius = 16;
                const circumference = 2 * Math.PI * radius;
                const dashOffset = circumference * (1 - o / 99);
                const avatar = r.player.avatarUrl || (r.player as { eaId?: number }).eaId
                  ? `https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p${(r.player as { eaId: number }).eaId}.png`
                  : "/player-placeholder.svg";
                return (
                  <li key={r.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <img src={avatar} alt="" className="h-9 w-9 rounded-full object-cover bg-slate-100" />
                      <div>
                        <span className="font-medium text-slate-800">{r.player.name}</span>
                        <span className="ml-2 text-xs text-slate-400">{translatePosition(r.player.position)}</span>
                      </div>
                    </div>
                    <div className="relative h-9 w-9">
                      <svg className="-rotate-90 h-9 w-9" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r={radius} fill="none" className="stroke-slate-200/60" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r={radius} fill="none"
                          stroke={overallColor(o)} strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={circumference} strokeDashoffset={dashOffset}
                        />
                      </svg>
                      <span className="absolute inset-0 grid place-items-center text-xs font-black text-slate-800">{o}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold text-pitch">Últimos 5 partidos</h2>
          {lastMatches.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Sin partidos disputados</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {lastMatches.map((m) => {
                const isHome = m.homeTeamId === clubTeamId;
                const opponent = isHome ? m.awayTeam : m.homeTeam;
                const userScore = isHome ? m.homeScore : m.awayScore;
                const oppScore = isHome ? m.awayScore : m.homeScore;
                const result =
                  m.status !== "COMPLETED" && m.status !== "SIMULATED"
                    ? "Pendiente"
                    : userScore === oppScore
                      ? "E"
                      : (userScore ?? 0) > (oppScore ?? 0)
                        ? "V"
                        : "D";
                const resultColor =
                  result === "V"
                    ? "text-emerald-600 bg-emerald-50"
                    : result === "D"
                      ? "text-rose-600 bg-rose-50"
                      : result === "E"
                        ? "text-amber-600 bg-amber-50"
                        : "text-slate-400 bg-slate-50";
                return (
                  <li key={m.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${resultColor}`}>
                        {result}
                      </span>
                      <span className="text-sm text-slate-700">
                        {isHome ? "vs" : "@"} {opponent.shortName}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-slate-800">
                      {m.status === "COMPLETED" || m.status === "SIMULATED"
                        ? `${userScore ?? 0} - ${oppScore ?? 0}`
                        : "vs"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {leagueTeams.length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold text-pitch">Posición en liga</h2>
          <p className="mt-1 text-xs text-slate-400">{user.clubTeam.league?.name}</p>
          <ul className="mt-3 space-y-1">
            {leagueTeams.map((t, i) => (
              <li
                key={t.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  t.id === clubTeamId ? "bg-emerald-50 font-semibold text-pitch" : "text-slate-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 text-right text-xs text-slate-400">{i + 1}.</span>
                  <span>{t.name}</span>
                </div>
                {t.id === clubTeamId && (
                  <span className="text-xs text-emerald-600">Tu equipo</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
