import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTransferSearchResults, parseTransferSearchParams } from "@/lib/transfers/search";
import { resolveUserClubTeamId } from "@/lib/transfers/ownership";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const session = await auth();
  const userId = session?.user?.id;

  const parsed = parseTransferSearchParams(searchParams);

  if (userId && !parsed.excludeTeamId) {
    const ownClubTeamId = await resolveUserClubTeamId(userId);
    if (ownClubTeamId) {
      parsed.excludeTeamId = ownClubTeamId;
    }
  }

  const result = await getTransferSearchResults(parsed);
  return NextResponse.json(result);
}
