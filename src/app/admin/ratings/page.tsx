import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { MockRatingsProvider } from "@/domain/ratings/mockProvider";
import { PreserveAssignmentsAdapter } from "@/domain/ratings/provider";

export const dynamic = "force-dynamic";

export default async function AdminRatingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }
  if (!isAdminEmail(session.user.email)) {
    redirect("/dashboard");
  }

  const provider = new MockRatingsProvider();
  const synced = await new PreserveAssignmentsAdapter().sync(provider, [
    { externalId: "demo-1", name: "Alex Morgan", position: "FWD", overall: 83, teamId: "northbridge", playerId: "a1" }
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-[var(--theme-foreground)]">Ratings de jugadores</h1>
      <p className="mt-2 text-[var(--theme-muted)]">Vista previa del proveedor. Las asignaciones internas se conservan mediante el ID externo.</p>
      <div className="mt-6 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5 text-[var(--theme-foreground)]">
        <div className="grid grid-cols-4 gap-4 border-b border-[var(--theme-border)] pb-3 text-xs font-semibold uppercase text-[var(--theme-muted)]">
          <span>ID externo</span>
          <span>Nombre</span>
          <span>Media</span>
          <span>Equipo</span>
        </div>
        {synced.map((player) => (
          <div key={player.externalId} className="grid grid-cols-4 gap-4 border-b border-[var(--theme-border)] py-4 text-sm last:border-0">
            <span>{player.externalId}</span>
            <span>{player.name}</span>
            <span>{player.overall}</span>
            <span>{player.teamId}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
