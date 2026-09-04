import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import PlayerOverallBadge from "@/components/players/PlayerOverallBadge";
import StandingsTable from "@/components/competitions/StandingsTable";
import BandLegend from "@/components/competitions/BandLegend";
import { getStandingsForLeague } from "@/lib/competitions";
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

  if (!user) redirect("/onboarding/profile");

  if (session.user.clubTeamId !== user.clubTeamId) {
    console.warn(
      `[dashboard] clubTeamId mismatch: jwt=${session.user.clubTeamId ?? "null"} db=${user.clubTeamId ?? "null"} user=${user.id}`,
    );
  }

  if (!user.clubTeam) {
    return <NoClubCta username={user.username} />;
  }

  const clubTeamId = user.clubTeam.id;

  const [lastMatches, leagueStanding] = await Promise.all([
    prisma.match.findMany({
      where: { OR: [{ homeTeamId: clubTeamId }, { awayTeamId: clubTeamId }] },
      orderBy: { scheduledAt: "desc" },
      take: 5,
      include: { homeTeam: true, awayTeam: true },
    }),
    user.clubTeam.leagueId
      ? getStandingsForLeague(user.clubTeam.leagueId, user.id)
      : Promise.resolve(null),
  ]);

  const squadSize = user.clubTeam.rosters.length;
  const avgOverall = squadSize > 0
    ? Math.round(user.clubTeam.rosters.reduce((sum, r) => sum + r.player.overall, 0) / squadSize)
    : 0;

  const topPlayers = [...user.clubTeam.rosters]
    .sort((a, b) => b.player.overall - a.player.overall)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl theme-gradient p-8 shadow-lg shadow-[var(--theme-shadow)]" style={{ color: "var(--theme-on-gradient)" }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm uppercase tracking-widest opacity-80">Tu club</p>
            <div className="mt-2 flex items-center gap-3">
              {user.clubTeam.imageUrl && (
                <img src={user.clubTeam.imageUrl} alt="" className="h-10 w-10 rounded-lg object-contain bg-white/10 p-0.5" />
              )}
              <h1 className="text-4xl font-bold">{user.clubTeam.name}</h1>
            </div>
            <div className="mt-3 flex items-center gap-2 opacity-90">
              {user.clubTeam.league?.eaId ? (
                <img src={`https://assets.easysbc.io/fc26/leagues/${user.clubTeam.league.eaId}.png`} alt="" className="h-5 w-5 rounded object-contain" />
              ) : user.clubTeam.league?.imageUrl ? (
                <img src={user.clubTeam.league.imageUrl} alt="" className="h-5 w-5 rounded object-contain" />
              ) : null}
              <span>{user.clubTeam.league?.name || "Liga desconocida"}</span>
              <span className="opacity-70">·</span>
              <span>Manager: {user.username}</span>
            </div>
          </div>
          {session.user.avatarUrl && (
            <img src={session.user.avatarUrl} alt={user.username || ""} className="h-16 w-16 rounded-full border-2 border-white/30 object-cover" />
          )}
        </div>
        <div className="mt-6 flex gap-3">
          <Link href="/calendar" className="inline-block rounded-lg bg-[var(--theme-on-gradient)] px-4 py-2 font-semibold" style={{ color: "var(--theme-primary)" }}>
            Abrir calendario
          </Link>
          <Link href="/squad" className="inline-block rounded-lg bg-white/20 px-4 py-2 font-semibold hover:bg-white/30" style={{ color: "var(--theme-on-gradient-strong)" }}>
            Ver plantilla
          </Link>
          <Link href="/competitions" className="inline-block rounded-lg bg-black/20 px-4 py-2 font-semibold hover:bg-black/30" style={{ color: "var(--theme-on-gradient-strong)" }}>
            Ver competiciones
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5">
          <p className="text-sm text-[var(--theme-muted)]">Jugadores</p>
          <p className="mt-1 text-2xl font-bold text-[var(--theme-foreground)]">{squadSize}</p>
        </div>
        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5">
          <p className="text-sm text-[var(--theme-muted)]">Media del equipo</p>
          <p className="mt-1 text-2xl font-bold text-[var(--theme-foreground)]">{avgOverall} OVR</p>
        </div>
        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5">
          <p className="text-sm text-[var(--theme-muted)]">Presupuesto</p>
          <p className="mt-1 text-2xl font-bold text-[var(--theme-foreground)]">
            {(user.clubTeam.budget / 1_000_000).toFixed(1)}M€
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5">
          <h2 className="font-semibold text-[var(--theme-foreground)]">Mejores jugadores</h2>
          {topPlayers.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--theme-muted)]">Sin jugadores</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {topPlayers.map((r) => {
                const avatar = r.player.avatarUrl || ((r.player as { eaId?: number }).eaId
                  ? `https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p${(r.player as { eaId: number }).eaId}.png`
                  : "/player-placeholder.svg");
                return (
                  <li key={r.id} className="flex items-center justify-between border-b border-[var(--theme-border)] pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <img src={avatar} alt="" className="h-9 w-9 rounded-full object-cover bg-[var(--theme-background)] ring-1 ring-[var(--theme-border)]" />
                      <div>
                        <span className="font-medium text-[var(--theme-foreground)]">{r.player.name}</span>
                        <span className="ml-2 text-xs text-[var(--theme-muted)]">{translatePosition(r.player.position)}</span>
                      </div>
                    </div>
                    <PlayerOverallBadge overall={r.player.overall} size="sm" />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5">
          <h2 className="font-semibold text-[var(--theme-foreground)]">Últimos 5 partidos</h2>
          {lastMatches.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--theme-muted)]">Sin partidos disputados</p>
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
                        ? "text-[var(--theme-on-accent)] bg-[var(--theme-accent-soft)]"
                        : result === "D"
                          ? "text-rose-700 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                          : result === "E"
                            ? "text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                            : "text-[var(--theme-muted)] bg-[var(--theme-card-alt)]";
                return (
                  <li key={m.id} className="flex items-center justify-between border-b border-[var(--theme-border)] pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${resultColor}`}>
                        {result}
                      </span>
                      <span className="text-sm text-[var(--theme-foreground)]">
                        {isHome ? "vs" : "@"} {opponent.shortName}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-[var(--theme-foreground)]">
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

      {leagueStanding && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-[var(--theme-foreground)]">Tabla de clasificación</h2>
              <p className="text-xs text-[var(--theme-muted)]">{leagueStanding.name}</p>
            </div>
            {leagueStanding.id && (
              <Link
                href={`/competitions?league=${leagueStanding.id}`}
                className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-1.5 text-xs font-semibold text-[var(--theme-foreground)] transition hover:opacity-90"
              >
                Ver tabla completa
              </Link>
            )}
          </div>
          <BandLegend
            continent={leagueStanding.continent}
            isTopDivision={leagueStanding.isTopDivision}
            hasRelegationZone={leagueStanding.hasRelegationZone}
            spots={leagueStanding.spots}
            format={leagueStanding.format}
          />
          <StandingsTable league={leagueStanding} highlightTeamId={clubTeamId} maxHeight="420px" showHeader={false} />
        </div>
      )}
    </div>
  );
}

function NoClubCta({ username }: { username: string | null }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-10 text-center shadow-sm">
      <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--theme-accent-soft)] text-3xl">
        ⚽
      </div>
      <h1 className="text-3xl font-black text-[var(--theme-primary)]">
        {username ? `Bienvenido, ${username}` : "Bienvenido"}
      </h1>
      <p className="mt-2 text-[var(--theme-muted)]">
        Aún no has elegido equipo. Selecciona un club para empezar tu carrera online.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/onboarding/league-selection"
          className="inline-block rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 shadow transition hover:bg-emerald-400"
        >
          Elegir equipo
        </Link>
      </div>
    </div>
  );
}
