import Image from "next/image";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { translatePosition } from "@/lib/constants/position-translation";
import PlayerOverallBadge from "@/components/players/PlayerOverallBadge";
import { PageTitle } from "@/components/providers/PageTitleProvider";

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

  if (!user) redirect("/onboarding/profile");
  if (!user.clubTeam) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-10 text-center shadow-sm">
        <h1 className="text-3xl font-black text-[var(--theme-primary)]">Sin equipo</h1>
        <p className="mt-2 text-[var(--theme-muted)]">Elige un club para ver tu plantilla.</p>
        <Link
          href="/onboarding/league-selection"
          className="mt-6 inline-block rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 shadow transition hover:bg-emerald-400"
        >
          Elegir equipo
        </Link>
      </div>
    );
  }

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
    <PageTitle title="Plantilla">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--theme-foreground)]">Plantilla</h1>
          <p className="mt-1 text-[var(--theme-muted)]">{user.clubTeam.name}</p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg bg-[var(--theme-background)] px-4 py-2 text-sm font-medium text-[var(--theme-foreground)] ring-1 ring-[var(--theme-border)] transition hover:opacity-90"
        >
          Volver al dashboard
        </Link>
      </div>

      {players.length === 0 ? (
        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-10 text-center text-[var(--theme-muted)]">
          No hay jugadores en la plantilla
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) =>
            group.players.length > 0 ? (
              <div key={group.label} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] shadow-sm">
                <div className="border-b border-[var(--theme-border)] bg-[var(--theme-background)] px-5 py-3">
                  <h2 className="font-semibold text-[var(--theme-foreground)]">{group.label}</h2>
                </div>
                <div className="divide-y divide-[var(--theme-border)]">
                  {group.players.map((p) => {
                    const avatar = p.avatarUrl || (p.eaId ? `https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p${p.eaId}.png` : "/player-placeholder.svg");
                    return (
                      <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 overflow-hidden rounded-full bg-[var(--theme-background)] ring-1 ring-[var(--theme-border)]">
                            <Image src={avatar} alt={p.name} fill sizes="48px" className="object-cover" unoptimized />
                          </div>
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--theme-accent-soft)] text-xs font-bold text-[var(--theme-accent)]">
                            {translatePosition(p.position)}
                          </div>
                          <div>
                            <p className="font-medium text-[var(--theme-foreground)]">{p.name}</p>
                            <p className="text-xs text-[var(--theme-muted)]">{p.role === "CLAVE" ? "Titular" : p.role === "IMPORTANTE" ? "Importante" : "Rotación"}</p>
                          </div>
                        </div>
                        <PlayerOverallBadge overall={p.overall} size="sm" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null
          )}

          {ungrouped.length > 0 && (
            <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] shadow-sm">
              <div className="border-b border-[var(--theme-border)] bg-[var(--theme-background)] px-5 py-3">
                <h2 className="font-semibold text-[var(--theme-foreground)]">Otros</h2>
              </div>
              <div className="divide-y divide-[var(--theme-border)]">
                {ungrouped.map((p) => {
                  const avatar = p.avatarUrl || (p.eaId ? `https://ratings-images-prod.pulse.ea.com/FC25/full/player-portraits/p${p.eaId}.png` : "/player-placeholder.svg");
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-full bg-[var(--theme-background)] ring-1 ring-[var(--theme-border)]">
                          <Image src={avatar} alt={p.name} fill sizes="48px" className="object-cover" unoptimized />
                        </div>
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--theme-card-alt)] text-xs font-bold text-[var(--theme-foreground)]">
                            {translatePosition(p.position)}
                          </div>
                        <div>
                          <p className="font-medium text-[var(--theme-foreground)]">{p.name}</p>
                          <p className="text-xs text-[var(--theme-muted)]">{p.role === "CLAVE" ? "Titular" : p.role === "IMPORTANTE" ? "Importante" : "Rotación"}</p>
                        </div>
                      </div>
                      <PlayerOverallBadge overall={p.overall} size="sm" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </PageTitle>
  );
}
