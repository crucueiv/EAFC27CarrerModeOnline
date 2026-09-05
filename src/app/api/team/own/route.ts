import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUserClubTeamId } from "@/lib/transfers/ownership";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ownClubTeamId: null });
  if (!prisma) return NextResponse.json({ ownClubTeamId: null });

  const ownClubTeamId = await resolveUserClubTeamId(userId);
  return NextResponse.json({ ownClubTeamId });
}
