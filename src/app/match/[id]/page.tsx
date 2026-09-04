import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { simulateMatch, type SimulationPlayer } from "@/domain/matches/simulateMatch";
import { getEffectiveLineup } from "@/lib/lineups/lineup-service";
import { FORMATIONS_BY_ID } from "@/lib/constants/formations";

export const dynamic = "force-dynamic";

function positionToBucket(position: string): SimulationPlayer["position"] {
  const upper = position.toUpperCase();
  if (upper === "POR" || upper === "GK") return "GK";
  if (["DFC", "LI", "LD", "CAD", "CAI", "CB", "LB", "RB", "LWB", "RWB", "SW"].includes(upper)) return "DEF";
  if (["MCD", "MC", "MCO", "MI", "MD", "CDM", "CM", "CAM", "LM", "RM", "DM", "AM"].includes(upper)) return "MID";
  return "FWD";
}

export default async function MatchPage({ params }: { params: { id: string } }) {
  const session = await auth();

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      homeTeam: { select: { id: true, name: true, shortName: true } },
      awayTeam: { select: { id: true, name: true, shortName: true } },
    },
  });
  if (!match) notFound();

  const isUserHome = session?.user?.clubTeamId === match.homeTeamId;
  const isUserAway = session?.user?.clubTeamId === match.awayTeamId;
  const isUserInMatch = isUserHome || isUserAway;

  let homePlayers: SimulationPlayer[] = [];
  let awayPlayers: SimulationPlayer[] = [];

  if (isUserHome || isUserAway) {
    const { lineup: homeLineup } = await getEffectiveLineup(match.homeTeamId, match.id);
    const { lineup: awayLineup } = await getEffectiveLineup(match.awayTeamId, match.id);

    homePlayers = (homeLineup?.slots ?? []).map((s) => ({
      id: s.player.id,
      teamId: match.homeTeamId,
      name: s.player.name,
      position: positionToBucket(s.position),
      overall: s.player.overall,
    }));
    awayPlayers = (awayLineup?.slots ?? []).map((s) => ({
      id: s.player.id,
      teamId: match.awayTeamId,
      name: s.player.name,
      position: positionToBucket(s.position),
      overall: s.player.overall,
    }));
  }

  if (homePlayers.length === 0 || awayPlayers.length === 0) {
    homePlayers = [
      { id: "a1", teamId: match.homeTeamId, name: "Alex Morgan", position: "FWD", overall: 84 },
      { id: "a2", teamId: match.homeTeamId, name: "Sam Wright", position: "MID", overall: 78 },
    ];
    awayPlayers = [
      { id: "b1", teamId: match.awayTeamId, name: "Jordan Lee", position: "FWD", overall: 79 },
      { id: "b2", teamId: match.awayTeamId, name: "Casey Smith", position: "DEF", overall: 76 },
    ];
  }

  const homeStrength = homePlayers.length
    ? Math.round(homePlayers.reduce((s, p) => s + p.overall, 0) / homePlayers.length)
    : 75;
  const awayStrength = awayPlayers.length
    ? Math.round(awayPlayers.reduce((s, p) => s + p.overall, 0) / awayPlayers.length)
    : 75;

  const result = simulateMatch(
    { id: match.homeTeamId, name: match.homeTeam.name, strength: homeStrength },
    { id: match.awayTeamId, name: match.awayTeam.name, strength: awayStrength },
    [...homePlayers, ...awayPlayers],
    27,
  );

  return (
    <div>
      <p className="text-sm text-slate-500">Partido {match.id}</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">
          {match.homeTeam.name}{" "}
          <span className="text-pitch">
            {result.homeScore} - {result.awayScore}
          </span>{" "}
          {match.awayTeam.name}
        </h1>
        {isUserInMatch && (match.status === "PENDING" || match.status === "WAITING_PVP") && (
          <Link
            href={`/match/${match.id}/lineup`}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-600"
          >
            Configurar alineación
          </Link>
        )}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Cronología</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {result.events.map((event, index) => (
              <li key={`${event.minute}-${index}`} className="flex justify-between border-b pb-2">
                <span>
                  {event.minute}&apos; {event.type}
                </span>
                <span className="text-slate-500">{event.playerId ?? "Evento del partido"}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold">Valoraciones</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {result.stats.map((stat) => {
              const player = [...homePlayers, ...awayPlayers].find((p) => p.id === stat.playerId);
              return (
                <li key={stat.playerId} className="flex justify-between">
                  <span>{player?.name ?? stat.playerId}</span>
                  <span className="font-semibold">{stat.rating.toFixed(1)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
