import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LoanCard from "@/components/transfers/LoanCard";
import type { LoanDuration } from "@/lib/transfers/loanNegotiationEngine";

export const dynamic = "force-dynamic";

const ACTIVE_LOAN_STATUS = [
  "PROPOSED",
  "COUNTERED",
  "ACCEPTED",
  "COMPLETED",
  "BUY_OPTION_TRIGGERED",
] as const;

export default async function LoansPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return <p className="p-6">Inicia sesión para ver tus cesiones.</p>;
  if (!prisma) return <p className="p-6">Base de datos no disponible.</p>;

  const loans = await prisma.loan.findMany({
    where: { buyerId: userId, status: { in: [...ACTIVE_LOAN_STATUS] } },
    orderBy: { createdAt: "desc" },
    include: {
      player: { select: { name: true, overall: true, position: true } },
      sellerTeam: { select: { name: true } },
      buyerTeam: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-black text-[var(--theme-foreground)]">Cesiones</h1>
        <p className="text-sm text-[var(--theme-muted)]">
          Gestiona las cesiones activas de tu club. Ejercita la opción de compra al final del periodo si lo
          deseas.
        </p>
      </header>
      {loans.length === 0 ? (
        <p className="text-sm text-[var(--theme-muted)]">No tienes cesiones activas.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loans.map((l) => (
            <LoanCard
              key={l.id}
              loan={{
                id: l.id,
                status: l.status,
                duration: l.duration as LoanDuration,
                wageShareBuyerPct: l.wageShareBuyerPct,
                hasBuyOption: l.hasBuyOption,
                buyOptionPrice: l.buyOptionPrice,
                startsAt: l.startsAt,
                endsAt: l.endsAt,
                player: l.player,
                sellerTeam: l.sellerTeam,
                buyerTeam: l.buyerTeam,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
