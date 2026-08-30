import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { translatePosition } from "@/lib/constants/position-translation";

const POSITION_GROUPS = [
  { label: "Portero", positions: ["POR"] },
  { label: "Defensa", positions: ["DFC", "LI", "LD", "CAD", "CAI"] },
  { label: "Centrocampista", positions: ["MCD", "MC", "MCO", "MI", "MD"] },
  { label: "Ataque", positions: ["DC", "SD", "EI", "ED"] },
] as const;

export default async function SquadPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      clubTeam: {
        include: {
          rosters: {
            where: { isActive: true },
            include: { player: true },
          },
        },
      },
    },
  });

  if (!user || !user.clubTeam) redirect("/onboarding/profile");

  const players = user.clubTeam.rosters.map((r) => ({
    ...r.player,
    role: r.role,
  }));

  const grouped = POSITION_GROUPS.map((group) => ({
    label: group.label,
    players: players
      .filter((p) => {
        const pos = p.position?.toUpperCase();
        return group.positions.some((gp) => gp === pos);
      })
      .sort((a, b) => b.overall - a.overall),
  }));

  const ungrouped = players.filter((p) => {
    const pos = p.position?.toUpperCase();
    return !POSITION_GROUPS.some((g) => g.positions.includes(pos as never));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-pitch">Plantilla</h1>
          <p className="mt-1 text-slate-500">{user.clubTeam.name}</p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
        >
          Volver al dashboard
        </Link>
      </div>

      {players.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center text-slate-400">
          No hay jugadores en la plantilla
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) =>
            group.players.length > 0 ? (
              <div key={group.label} className="rounded-xl border bg-white">
                <div className="border-b bg-slate-50 px-5 py-3">
                  <h2 className="font-semibold text-pitch">{group.label}</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {group.players.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                          {translatePosition(p.position)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.role === "CLAVE" ? "Titular" : p.role === "IMPORTANTE" ? "Importante" : "Rotación"}</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-pitch">{p.overall}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}

          {ungrouped.length > 0 && (
            <div className="rounded-xl border bg-white">
              <div className="border-b bg-slate-50 px-5 py-3">
                <h2 className="font-semibold text-pitch">Otros</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {ungrouped.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-xs font-bold text-slate-600">
                        {translatePosition(p.position)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.role === "CLAVE" ? "Titular" : p.role === "IMPORTANTE" ? "Importante" : "Rotación"}</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-pitch">{p.overall}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
