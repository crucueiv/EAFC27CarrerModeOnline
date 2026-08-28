import { simulateMatch, type SimulationPlayer } from "@/domain/matches/simulateMatch";

const players: SimulationPlayer[] = [
  { id: "a1", teamId: "northbridge", name: "Alex Morgan", position: "FWD", overall: 84 },
  { id: "a2", teamId: "northbridge", name: "Sam Wright", position: "MID", overall: 78 },
  { id: "b1", teamId: "riverside", name: "Jordan Lee", position: "FWD", overall: 79 },
  { id: "b2", teamId: "riverside", name: "Casey Smith", position: "DEF", overall: 76 }
];

export default function MatchPage({ params }: { params: { id: string } }) {
  const result = simulateMatch({ id: "northbridge", name: "Northbridge FC", strength: 78 }, { id: "riverside", name: "Riverside Athletic", strength: 75 }, players, 27);
  return <div><p className="text-sm text-slate-500">Partido {params.id}</p><h1 className="mt-1 text-3xl font-bold">Northbridge FC <span className="text-pitch">{result.homeScore} - {result.awayScore}</span> Riverside Athletic</h1><div className="mt-6 grid gap-6 lg:grid-cols-2"><div className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Cronología</h2><ul className="mt-3 space-y-3 text-sm">{result.events.map((event, index) => <li key={`${event.minute}-${index}`} className="flex justify-between border-b pb-2"><span>{event.minute}&apos; {event.type}</span><span className="text-slate-500">{event.playerId ?? "Evento del partido"}</span></li>)}</ul></div><div className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Valoraciones</h2><ul className="mt-3 space-y-3 text-sm">{result.stats.map((stat) => <li key={stat.playerId} className="flex justify-between"><span>{players.find((player) => player.id === stat.playerId)?.name}</span><span className="font-semibold">{stat.rating.toFixed(1)}</span></li>)}</ul></div></div></div>;
}
