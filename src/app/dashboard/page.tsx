import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  Wallet,
  Trophy,
  Calendar,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import PlayerOverallBadge from "@/components/players/PlayerOverallBadge";
import StandingsTable from "@/components/competitions/StandingsTable";
import BandLegend from "@/components/competitions/BandLegend";
import { getStandingsForLeague } from "@/lib/competitions";
import { translatePosition } from "@/lib/constants/position-translation";
import { PageTitle } from "@/components/providers/PageTitleProvider";

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
    <PageTitle title="Dashboard">
      <div className="space-y-6">
        {/* HERO — tarjeta destacada con tinte verde-azulado */}
        <section className="bento-card bento-card-alt relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full"
            style={{
              background:
                "radial-gradient(circle at center, rgba(0,229,255,0.18) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-cyan)]">
                Tu club
              </p>
              <div className="mt-3 flex items-center gap-3">
                {user.clubTeam.imageUrl && (
                  <img
                    src={user.clubTeam.imageUrl}
                    alt=""
                    className="h-12 w-12 rounded-xl border border-[var(--border-subtle)] bg-white/5 object-contain p-0.5"
                  />
                )}
                <h2 className="font-display text-4xl font-extrabold tracking-wide text-[var(--text-primary)] md:text-5xl">
                  {user.clubTeam.name}
                </h2>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                {user.clubTeam.league?.eaId ? (
                  <img
                    src={`https://assets.easysbc.io/fc26/leagues/${user.clubTeam.league.eaId}.png`}
                    alt=""
                    className="h-5 w-5 rounded object-contain"
                  />
                ) : user.clubTeam.league?.imageUrl ? (
                  <img
                    src={user.clubTeam.league.imageUrl}
                    alt=""
                    className="h-5 w-5 rounded object-contain"
                  />
                ) : null}
                <span>{user.clubTeam.league?.name || "Liga desconocida"}</span>
                <span className="opacity-50">·</span>
                <span>Manager: {user.username}</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Link
                  href="/calendar"
                  className="btn-primary-gaming"
                  style={{ color: "#001016" }}
                >
                  <Calendar className="h-4 w-4" />
                  Abrir calendario
                </Link>
                <Link href="/squad" className="btn-ghost-gaming">
                  <Users className="h-4 w-4" />
                  Ver plantilla
                </Link>
                <Link href="/competitions" className="btn-ghost-gaming">
                  <Trophy className="h-4 w-4" />
                  Competiciones
                </Link>
              </div>
            </div>
            {session.user.avatarUrl && (
              <img
                src={session.user.avatarUrl}
                alt={user.username || ""}
                className="h-20 w-20 rounded-2xl border border-[var(--border-subtle)] object-cover"
              />
            )}
          </div>
        </section>

        {/* STAT CARDS — grid de 3 bento */}
        <section className="grid gap-5 sm:grid-cols-3">
          <BentoStat
            label="Jugadores"
            value={String(squadSize)}
            detail="Plantilla activa"
            icon={<Users className="h-5 w-5" />}
          />
          <BentoStat
            label="Media del equipo"
            value={`${avgOverall} OVR`}
            detail="Promedio de Overall"
            icon={<TrendingUp className="h-5 w-5" />}
            tone="accent"
          />
          <BentoStat
            label="Presupuesto"
            value={`${(user.clubTeam.budget / 1_000_000).toFixed(1)}M€`}
            detail="Disponible para fichar"
            icon={<Wallet className="h-5 w-5" />}
          />
        </section>

        {/* MEJORES JUGADORES + ÚLTIMOS PARTIDOS */}
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="bento-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold tracking-wide text-[var(--text-primary)]">
                Mejores jugadores
              </h3>
              <Sparkles className="h-4 w-4 text-[var(--accent-cyan)]" />
            </div>
            {topPlayers.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">Sin jugadores</p>
            ) : (
              <ul className="space-y-3">
                {topPlayers.map((r) => {
                  const avatar =
                    r.player.avatarUrl ||
                    ((r.player as { eaId?: number }).eaId
                      ? `https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p${(r.player as { eaId: number }).eaId}.png`
                      : "/player-placeholder.svg");
                  return (
                    <li
                      key={r.id}
                      className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={avatar}
                          alt=""
                          className="h-10 w-10 rounded-full border border-[var(--border-subtle)] object-cover"
                        />
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {r.player.name}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {translatePosition(r.player.position)}
                          </p>
                        </div>
                      </div>
                      <PlayerOverallBadge overall={r.player.overall} size="sm" />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="bento-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold tracking-wide text-[var(--text-primary)]">
                Últimos 5 partidos
              </h3>
              <Calendar className="h-4 w-4 text-[var(--accent-cyan)]" />
            </div>
            {lastMatches.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">Sin partidos disputados</p>
            ) : (
              <ul className="space-y-3">
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
                  const chipClass =
                    result === "V"
                      ? "result-win"
                      : result === "D"
                        ? "result-loss"
                        : result === "E"
                          ? "result-draw"
                          : "result-pending";
                  return (
                    <li
                      key={m.id}
                      className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`result-chip ${chipClass}`}>{result}</span>
                        <span className="text-sm text-[var(--text-primary)]">
                          {isHome ? "vs" : "@"} {opponent.shortName}
                        </span>
                      </div>
                      <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
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
        </section>

        {/* TABLA DE CLASIFICACIÓN */}
        {leagueStanding && (
          <section className="bento-card space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-extrabold tracking-wide text-[var(--text-primary)]">
                  Tabla de clasificación
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">{leagueStanding.name}</p>
              </div>
              {leagueStanding.id && (
                <Link
                  href={`/competitions?league=${leagueStanding.id}`}
                  className="btn-ghost-gaming"
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
            <StandingsTable
              league={leagueStanding}
              highlightTeamId={clubTeamId}
              maxHeight="420px"
              showHeader={false}
            />
          </section>
        )}
      </div>
    </PageTitle>
  );
}

function BentoStat({
  label,
  value,
  detail,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <div className={tone === "accent" ? "bento-card bento-card-alt" : "bento-card"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {label}
          </p>
          <p className="font-display mt-2 text-4xl font-extrabold leading-none text-[var(--text-primary)]">
            {value}
          </p>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)]/40 text-[var(--accent-cyan)]">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}

function NoClubCta({ username }: { username: string | null }) {
  return (
    <div className="mx-auto max-w-2xl bento-card text-center">
      <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--accent-cyan-soft)] text-3xl">
        ⚽
      </div>
      <h1 className="font-display text-3xl font-extrabold tracking-wide text-[var(--text-primary)]">
        {username ? `Bienvenido, ${username}` : "Bienvenido"}
      </h1>
      <p className="mt-2 text-[var(--text-secondary)]">
        Aún no has elegido equipo. Selecciona un club para empezar tu carrera online.
      </p>
      <div className="mt-6 flex justify-center">
        <Link href="/onboarding/league-selection" className="btn-primary-gaming">
          Elegir equipo
        </Link>
      </div>
    </div>
  );
}
