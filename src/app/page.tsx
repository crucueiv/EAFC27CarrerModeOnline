import Link from "next/link";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { demoTeams } from "@/lib/demoData";

export default function DashboardPage() {
  return <div>
    <div className="rounded-2xl bg-pitch p-8 text-white"><p className="text-sm uppercase tracking-widest text-emerald-200">Temporada 2026/27</p><h1 className="mt-2 text-4xl font-bold">Bienvenido, manager</h1><p className="mt-3 max-w-2xl text-emerald-50">Coordina partidos, conserva tu plantilla y deja que cada miembro del grupo juegue su papel.</p><Link href="/calendar" className="mt-6 inline-block rounded-lg bg-gold px-4 py-2 font-semibold text-ink">Abrir calendario</Link></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><StatCard label="Posición en liga" value="3.º" detail="12 puntos en 6 partidos" /><StatCard label="Próximo partido" value="Sáb 15:00" detail="Northbridge FC vs Riverside" /><StatCard label="Presupuesto de fichajes" value="18,5 M€" detail="2 propuestas pendientes" /></div>
    <Section title="Tus clubes"><div className="grid gap-4 sm:grid-cols-2">{demoTeams.map((team) => <div key={team.id} className="rounded-xl border bg-white p-5"><div className="flex items-center justify-between"><h3 className="font-semibold">{team.name}</h3><span className="rounded bg-emerald-100 px-2 py-1 text-xs text-pitch">{team.shortName}</span></div><p className="mt-2 text-sm text-slate-500">Media del equipo {team.strength}. Gestiona plantilla y tácticas.</p></div>)}</div></Section>
  </div>;
}
