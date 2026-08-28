import { MockRatingsProvider } from "@/domain/ratings/mockProvider";
import { PreserveAssignmentsAdapter } from "@/domain/ratings/provider";

export default async function AdminRatingsPage() {
  const provider = new MockRatingsProvider();
  const synced = await new PreserveAssignmentsAdapter().sync(provider, [{ externalId: "demo-1", name: "Alex Morgan", position: "FWD", overall: 83, teamId: "northbridge", playerId: "a1" }]);
  return <div><h1 className="text-3xl font-bold">Ratings de jugadores</h1><p className="mt-2 text-slate-600">Vista previa del proveedor. Las asignaciones internas se conservan mediante el ID externo.</p><div className="mt-6 rounded-xl border bg-white p-5"><div className="grid grid-cols-4 gap-4 border-b pb-3 text-xs font-semibold uppercase text-slate-500"><span>ID externo</span><span>Nombre</span><span>Media</span><span>Equipo</span></div>{synced.map((player) => <div key={player.externalId} className="grid grid-cols-4 gap-4 border-b py-4 text-sm last:border-0"><span>{player.externalId}</span><span>{player.name}</span><span>{player.overall}</span><span>{player.teamId}</span></div>)}</div></div>;
}
