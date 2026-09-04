import PlayerCardRow from "@/components/transfers/PlayerCardRow";
import TransferFilters from "@/components/transfers/TransferFilters";
import { auth } from "@/lib/auth";
import { getTransferFilterOptions, getTransferSearchResults, type TransferSearchParams } from "@/lib/transfers/search";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function number(value: string | undefined) {
  return value === undefined || value === "" ? undefined : Number(value);
}

export default async function TransfersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const params: TransferSearchParams = {
    name: first(searchParams.name),
    position: first(searchParams.position),
    leagueId: first(searchParams.leagueId),
    leagueName: first(searchParams.leagueName),
    teamId: first(searchParams.teamId),
    teamName: first(searchParams.teamName),
    nationalityId: first(searchParams.nationalityId),
    nationalityName: first(searchParams.nationalityName),
    minOverall: number(first(searchParams.minOverall)),
    maxOverall: number(first(searchParams.maxOverall)),
    minPace: number(first(searchParams.minPace)),
    minShooting: number(first(searchParams.minShooting)),
    minPassing: number(first(searchParams.minPassing)),
    minDribbling: number(first(searchParams.minDribbling)),
    minDefending: number(first(searchParams.minDefending)),
    minPhysical: number(first(searchParams.minPhysical)),
    maxPrice: number(first(searchParams.maxPrice)),
    freeAgents: first(searchParams.freeAgents) === "1" || first(searchParams.freeAgents) === "true",
    excludeTeamId: session?.user?.clubTeamId ?? undefined,
    page: number(first(searchParams.page)),
    pageSize: number(first(searchParams.pageSize))
  };
  const [result, options] = await Promise.all([getTransferSearchResults(params), getTransferFilterOptions()]);
  const minOverall = params.minOverall ?? 1;
  const maxOverall = params.maxOverall ?? 99;
  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      const firstValue = first(value);
      if (firstValue !== undefined) query.set(key, firstValue);
    }
    query.set("page", String(page));
    return `/transfers?${query.toString()}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-bold text-[var(--theme-foreground)]">Mercado de jugadores</h1><p className="mt-2 text-[var(--theme-muted)]">Busca jugadores sin alterar fichajes ni plantillas.</p></div>
        <p className="text-sm text-[var(--theme-muted)]">{result.total} jugador{result.total === 1 ? "" : "es"} · página {result.page} de {result.totalPages}</p>
      </div>
      <div className="mt-6"><TransferFilters values={{ ...params, minOverall, maxOverall }} options={options} /></div>
      {result.source === "configuration" && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" role="alert">{result.error}</p>}
      {result.source === "demo" && <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">{result.error ?? "Showing demo data."}</p>}
      {result.hydrationError && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" role="alert">No se pudo sincronizar EA: {result.hydrationError}</p>}
      <div className="mt-5 space-y-3">{result.players.length ? result.players.map((player) => <PlayerCardRow key={player.id} player={player} />) : <div className="rounded-xl border border-dashed border-[var(--theme-border)] p-8 text-center text-[var(--theme-muted)]">No hay jugadores con estos filtros.</div>}</div>
      {result.totalPages > 1 && <div className="mt-6 flex justify-center gap-3 text-sm">
        {result.page > 1 && <a className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-2 text-[var(--theme-foreground)]" href={pageHref(result.page - 1)}>Anterior</a>}
        {result.page < result.totalPages && <a className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-2 text-[var(--theme-foreground)]" href={pageHref(result.page + 1)}>Siguiente</a>}
      </div>}
    </div>
  );
}
