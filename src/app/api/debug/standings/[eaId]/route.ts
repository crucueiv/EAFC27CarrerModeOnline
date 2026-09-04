import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getStandingsForLeague } from "@/lib/competitions";
import { clearContinentSpotsCache } from "@/lib/coefficients/resolveContinentSpots";

function isDebugEnabled(): boolean {
  const v = process.env.EAFC_DEBUG;
  return v === "1" || v === "standings" || v === "all";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eaId: string }> },
) {
  if (!isDebugEnabled()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { eaId } = await params;
  const league = await prisma.league.findFirst({
    where: { OR: [{ eaId }, { id: eaId }] },
    select: { id: true },
  });
  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  clearContinentSpotsCache();
  const data = await getStandingsForLeague(league.id, session.user.id);
  if (!data) {
    return NextResponse.json({ error: "Standings not available" }, { status: 404 });
  }

  return NextResponse.json(data);
}
