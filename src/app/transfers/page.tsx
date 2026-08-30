import PlayerCardRow from "@/components/transfers/PlayerCardRow";
import TransferFilters from "@/components/transfers/TransferFilters";
import { getTransferFilterOptions, getTransferSearchResults, type TransferSearchParams } from "@/lib/transfers/search";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function number(value: string | undefined) {
  return value === undefined || value === "" ? undefined : Number(value);
}

export default async function TransfersPage({ searchParams }: { searchParams: SearchParams }) {
  const params: TransferSearchParams = {
    name: first(searchParams.name),
    gender: first(searchParams.gender) === "FEMALE" ? "FEMALE" : first(searchParams.gender) === "ALL" ? "ALL" : "MALE",
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
        <div><h1 className="text-3xl font-bold">Mercado de jugadores</h1><p className="mt-2 text-slate-600">Busca jugadores sin alterar fichajes ni plantillas.</p></div>
        <p className="text-sm text-slate-500">{result.total} jugador{result.total === 1 ? "" : "es"} · página {result.page} de {result.totalPages}</p>
      </div>
      <div className="mt-6"><TransferFilters values={{ ...params, minOverall, maxOverall }} options={options} /></div>
      {result.source === "configuration" && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{result.error}</p>}
      {result.source === "demo" && <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{result.error ?? "Showing demo data."}</p>}
      {result.hydrationError && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">No se pudo sincronizar EA: {result.hydrationError}</p>}
      <div className="mt-5 space-y-3">{result.players.length ? result.players.map((player) => <PlayerCardRow key={player.id} player={player} />) : <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">No hay jugadores con estos filtros.</div>}</div>
      {result.totalPages > 1 && <div className="mt-6 flex justify-center gap-3 text-sm">
        {result.page > 1 && <a className="rounded-lg border bg-white px-4 py-2" href={pageHref(result.page - 1)}>Anterior</a>}
        {result.page < result.totalPages && <a className="rounded-lg border bg-white px-4 py-2" href={pageHref(result.page + 1)}>Siguiente</a>}
      </div>}
    </div>
  );
}
