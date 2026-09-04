import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FORMATIONS_BY_ID } from "@/lib/constants/formations";
import LineupPageClient from "./LineupPageClient";

export const dynamic = "force-dynamic";

export default async function LineupPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.clubTeamId) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-10 text-center shadow-sm">
        <h1 className="text-3xl font-black text-[var(--theme-primary)]">Sin equipo</h1>
        <p className="mt-2 text-[var(--theme-muted)]">Elige un club para configurar tu alineación.</p>
        <Link
          href="/onboarding/league-selection"
          className="mt-6 inline-block rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 shadow transition hover:bg-emerald-400"
        >
          Elegir equipo
        </Link>
      </div>
    );
  }

  const clubTeamId = session.user.clubTeamId;

  const [team, defaultLineup, variants] = await Promise.all([
    prisma.team.findUnique({
      where: { id: clubTeamId },
      select: { id: true, name: true, shortName: true, imageUrl: true, primaryColor: true, secondaryColor: true },
    }),
    prisma.lineup.findFirst({
      where: { teamId: clubTeamId, isDefault: true, matchId: null },
      include: {
        formation: { include: { slots: { orderBy: { slotIndex: "asc" } } } },
        slots: { include: { player: true }, orderBy: { slotIndex: "asc" } },
        bench: { include: { player: true }, orderBy: { order: "asc" } },
      },
    }),
    prisma.lineup.findMany({
      where: { teamId: clubTeamId, isDefault: false, matchId: null },
      include: { formation: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!team) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-10 text-center shadow-sm">
        <h1 className="text-3xl font-black text-[var(--theme-primary)]">Equipo no disponible</h1>
        <p className="mt-2 text-[var(--theme-muted)]">No se pudo cargar el club asociado a tu cuenta.</p>
      </div>
    );
  }

  const rosters = await prisma.roster.findMany({
    where: { teamId: clubTeamId, isActive: true },
    include: { player: true },
  });

  const roster = rosters.map((r) => ({
    id: r.player.id,
    name: r.player.name,
    position: r.player.position,
    overall: r.player.overall,
    avatarUrl: r.player.avatarUrl,
    eaId: r.player.eaId,
  }));

  const initialFormationId = defaultLineup?.formationId ?? "4-3-3-1-contencion";
  const initialSlots = (defaultLineup?.slots ?? []).map((s) => ({ slotIndex: s.slotIndex, playerId: s.playerId }));
  const initialBench = (defaultLineup?.bench ?? []).map((b) => ({ order: b.order, playerId: b.playerId }));

  const variantsSerialized = variants.map((v) => ({
    id: v.id,
    name: v.name,
    formationId: v.formationId,
    formationName: FORMATIONS_BY_ID[v.formationId]?.name ?? v.formationId,
    updatedAt: v.updatedAt.toISOString(),
  }));

  return (
    <LineupPageClient
      team={{
        id: team.id,
        name: team.name,
        shortName: team.shortName,
        imageUrl: team.imageUrl,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
      }}
      initialFormationId={initialFormationId}
      initialSlots={initialSlots}
      initialBench={initialBench}
      roster={roster}
      variants={variantsSerialized}
    />
  );
}
