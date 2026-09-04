import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { FORMATIONS_BY_ID } from "@/lib/constants/formations";
import MatchLineupClient from "./MatchLineupClient";

export const dynamic = "force-dynamic";

export default async function MatchLineupPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  if (!session.user.clubTeamId) redirect("/onboarding/team-selection");

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      homeTeam: { select: { id: true, name: true, shortName: true, imageUrl: true, primaryColor: true, secondaryColor: true } },
      awayTeam: { select: { id: true, name: true, shortName: true, imageUrl: true, primaryColor: true, secondaryColor: true } },
    },
  });
  if (!match) notFound();

  const clubTeamId = session.user.clubTeamId;
  const isHome = match.homeTeamId === clubTeamId;
  const isAway = match.awayTeamId === clubTeamId;
  if (!isHome && !isAway) redirect(`/match/${params.id}`);

  const userTeam = isHome ? match.homeTeam : match.awayTeam;
  const opponent = isHome ? match.awayTeam : match.homeTeam;

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

  const override = await prisma.lineup.findUnique({
    where: { matchId: match.id },
    include: {
      formation: { include: { slots: { orderBy: { slotIndex: "asc" } } } },
      slots: { orderBy: { slotIndex: "asc" } },
      bench: { orderBy: { order: "asc" } },
    },
  });

  const defaultLineup = await prisma.lineup.findFirst({
    where: { teamId: clubTeamId, isDefault: true, matchId: null },
    include: {
      formation: { include: { slots: { orderBy: { slotIndex: "asc" } } } },
      slots: { orderBy: { slotIndex: "asc" } },
      bench: { orderBy: { order: "asc" } },
    },
  });

  const source = override ?? defaultLineup;
  const initialFormationId = source?.formationId ?? "4-3-3-1-contencion";
  const initialSlots = (source?.slots ?? []).map((s) => ({ slotIndex: s.slotIndex, playerId: s.playerId }));
  const initialBench = (source?.bench ?? []).map((b) => ({ order: b.order, playerId: b.playerId }));

  return (
    <MatchLineupClient
      matchId={match.id}
      matchStatus={match.status}
      scheduledAt={match.scheduledAt.toISOString()}
      userTeam={userTeam}
      opponent={opponent}
      isHome={isHome}
      initialFormationId={initialFormationId}
      initialSlots={initialSlots}
      initialBench={initialBench}
      roster={roster}
      hasOverride={!!override}
      hasDefault={!!defaultLineup}
    />
  );
}
