import { NextResponse } from "next/server";
import { getPlayerScoutingData } from "@/lib/scouting/getPlayerScoutingData";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const playerId = params.id;
  if (!playerId) {
    return NextResponse.json({ error: "Missing player ID" }, { status: 400 });
  }

  const scoutingData = await getPlayerScoutingData(playerId);
  return NextResponse.json(scoutingData);
}
