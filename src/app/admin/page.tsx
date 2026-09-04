import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import AdminPanel from "@/components/admin/AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }
  if (!isAdminEmail(session.user.email)) {
    redirect("/dashboard");
  }

  if (!prisma) {
    return (
      <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 text-sm text-[var(--theme-muted)]">
        Base de datos no disponible.
      </div>
    );
  }

  const [activeSeason, allSeasons, teamCount, careerGroupCount, activeTransferCount, unreadEmailCount] = await Promise.all([
    prisma.season.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { startDate: "desc" },
      include: { careerGroup: true, league: true },
    }),
    prisma.season.findMany({
      orderBy: { startDate: "desc" },
      take: 20,
      include: { careerGroup: true, league: true },
    }),
    prisma.team.count(),
    prisma.careerGroup.count(),
    prisma.transfer.count({
      where: {
        status: { in: ["PROPOSED", "ACCEPTED", "CONTRACT_NEGOTIATION_PENDING", "CONTRACT_NEGOTIATION_ACTIVE"] },
      },
    }),
    prisma.emailMessage.count({ where: { read: false } }),
  ]);

  const initialState = {
    activeSeason: activeSeason
      ? {
          id: activeSeason.id,
          name: activeSeason.name,
          status: activeSeason.status,
          currentWeek: activeSeason.currentWeek,
          isTransferWindowOpen: activeSeason.isTransferWindowOpen,
          startDate: activeSeason.startDate.toISOString(),
          endDate: activeSeason.endDate.toISOString(),
          pointsWin: activeSeason.pointsWin,
          pointsDraw: activeSeason.pointsDraw,
          pointsLoss: activeSeason.pointsLoss,
          leagueId: activeSeason.leagueId,
          careerGroupId: activeSeason.careerGroupId,
          careerGroup: { id: activeSeason.careerGroup.id, name: activeSeason.careerGroup.name },
          league: activeSeason.league ? { id: activeSeason.league.id, name: activeSeason.league.name } : null,
        }
      : null,
    allSeasons: allSeasons.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate.toISOString(),
      careerGroup: { id: s.careerGroup.id, name: s.careerGroup.name },
      league: s.league ? { id: s.league.id, name: s.league.name } : null,
    })),
    teamCount,
    careerGroupCount,
    activeTransferCount,
    unreadEmailCount,
  };

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--theme-muted)]">Administración</p>
        <h1 className="mt-2 text-3xl font-black text-[var(--theme-foreground)]">Panel de control</h1>
        <p className="mt-1 text-sm text-[var(--theme-muted)]">
          Gestiona temporadas, presupuestos y configuración de puntos.
        </p>
      </header>
      <AdminPanel initialState={initialState} />
    </div>
  );
}
