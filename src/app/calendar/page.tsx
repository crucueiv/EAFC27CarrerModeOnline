import Link from "next/link";
import { canUserAdvance } from "@/domain/calendar/canUserAdvance";
import { demoMatches } from "@/lib/demoData";

export default function CalendarPage() {
  const decision = canUserAdvance("demo-user", new Date("2026-09-01T00:00:00Z"), demoMatches);
  return <div><h1 className="text-3xl font-bold">Calendario de temporada</h1><p className="mt-2 text-slate-600">Avanza solo cuando tu próximo partido esté disponible.</p>
    <div className="mt-6 rounded-xl border bg-white p-5"><p className="font-medium">Estado del avance: <span className={decision.allowed ? "text-green-700" : "text-amber-700"}>{decision.reason}</span></p>{decision.nextMatch && <p className="mt-1 text-sm text-slate-500">Próximo partido: {decision.nextMatch.id} · {decision.nextMatch.scheduledAt.toLocaleDateString("es-ES")}</p>}</div>
    <div className="mt-6 overflow-hidden rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-4">Fecha</th><th className="p-4">Partido</th><th className="p-4">Estado</th><th className="p-4"></th></tr></thead><tbody>{demoMatches.map((match) => <tr key={match.id} className="border-t"><td className="p-4">{match.scheduledAt.toLocaleDateString("es-ES")}</td><td className="p-4">Northbridge FC vs Riverside Athletic</td><td className="p-4">{match.status}</td><td className="p-4"><Link className="text-pitch underline" href={`/match/${match.id}`}>Ver partido</Link></td></tr>)}</tbody></table></div>
  </div>;
}
