import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getStandingsForLeague } from "@/lib/competitions";
import StandingsTable from "@/components/competitions/StandingsTable";
import BandLegend from "@/components/competitions/BandLegend";
import CompetitionsClient from "./CompetitionsClient";

export const dynamic = "force-dynamic";

export default async function CompetitionsPage({
  searchParams,
}: {
  searchParams: { league?: string };
}) {
  const session = await auth();
  const userId = session?.user?.id;

  const leagues = await prisma.league.findMany({
    where: { isPlayable: true },
    include: { _count: { select: { teams: true } } },
    orderBy: [{ continent: "asc" }, { country: "asc" }, { name: "asc" }],
  });

  const playable = leagues.filter((l) => l._count.teams >= 2);

  const options = playable.map((l) => ({
    id: l.id,
    name: l.name,
    country: l.country,
    continent: l.continent,
    teamCount: l._count.teams,
  }));

  const requested = options.find((o) => o.id === searchParams.league);
  const initialLeagueId = requested?.id ?? options[0]?.id ?? null;
  const initialLeague = initialLeagueId
    ? await getStandingsForLeague(initialLeagueId, userId)
    : null;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--theme-muted)]">Competición</p>
            <h1 className="mt-2 text-3xl font-black text-[var(--theme-foreground)]">Tablas de clasificación</h1>
            <p className="mt-1 text-sm text-[var(--theme-muted)]">
              Selecciona un continente, país y liga para ver su tabla con las bandas de clasificación continental.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm font-semibold text-[var(--theme-foreground)] hover:opacity-90"
          >
            Volver al dashboard
          </Link>
        </div>
      </header>

      <CompetitionsClient
        leagues={options}
        initialLeagueId={initialLeagueId}
      />

      {initialLeague && (
        <BandLegend
          continent={initialLeague.continent}
          isTopDivision={initialLeague.isTopDivision}
          hasRelegationZone={initialLeague.hasRelegationZone}
          spots={initialLeague.spots}
          format={initialLeague.format}
        />
      )}

      {initialLeague ? (
        <StandingsTable league={initialLeague} maxHeight="640px" />
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-card)] p-12 text-center text-[var(--theme-muted)]">
          No hay ligas jugables disponibles en este momento.
        </div>
      )}
    </div>
  );
}
