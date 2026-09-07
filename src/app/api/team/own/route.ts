import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUserClubTeamId } from "@/lib/transfers/ownership";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({
      ownClubTeamId: null,
      ownClubTeamName: null,
      ownClubTeamImageUrl: null,
      ownClubTeamPrimaryColor: null,
      ownClubTeamShortName: null,
      ownClubTeamBudget: 0,
      ownClubTeamCommittedBudget: 0,
      ownClubTeamFreeBudget: 0,
    });
  }
  if (!prisma) {
    return NextResponse.json({
      ownClubTeamId: null,
      ownClubTeamName: null,
      ownClubTeamImageUrl: null,
      ownClubTeamPrimaryColor: null,
      ownClubTeamShortName: null,
      ownClubTeamBudget: 0,
      ownClubTeamCommittedBudget: 0,
      ownClubTeamFreeBudget: 0,
    });
  }

  const ownClubTeamId = await resolveUserClubTeamId(userId, prisma);
  if (!ownClubTeamId) {
    return NextResponse.json({
      ownClubTeamId: null,
      ownClubTeamName: null,
      ownClubTeamImageUrl: null,
      ownClubTeamPrimaryColor: null,
      ownClubTeamShortName: null,
      ownClubTeamBudget: 0,
      ownClubTeamCommittedBudget: 0,
      ownClubTeamFreeBudget: 0,
    });
  }

  const team = await prisma.team.findUnique({
    where: { id: ownClubTeamId },
    select: {
      name: true,
      imageUrl: true,
      primaryColor: true,
      shortName: true,
      budget: true,
      committedBudget: true,
    },
  });

  const committedBudget = Math.max(0, team?.committedBudget ?? 0);
  const freeBudget = Math.max(0, team?.budget ?? 0);

  return NextResponse.json({
    ownClubTeamId,
    ownClubTeamName: team?.name ?? null,
    ownClubTeamImageUrl: team?.imageUrl ?? null,
    ownClubTeamPrimaryColor: team?.primaryColor ?? null,
    ownClubTeamShortName: team?.shortName ?? null,
    ownClubTeamBudget: team?.budget ?? 0,
    ownClubTeamCommittedBudget: committedBudget,
    ownClubTeamFreeBudget: freeBudget,
  });
}
