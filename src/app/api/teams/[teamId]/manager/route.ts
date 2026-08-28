import { NextResponse } from "next/server";
import { getOrFetchManager } from "@/lib/managers/getOrFetchManager";

export async function GET(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  const teamId = params.teamId;
  if (!teamId) {
    return NextResponse.json({ error: "Falta el ID del equipo" }, { status: 400 });
  }

  try {
    const manager = await getOrFetchManager(teamId);
    return NextResponse.json({ manager });
  } catch (error) {
    console.error("API error fetching manager:", error);
    return NextResponse.json(
      {
        manager: {
          id: `fallback-${teamId}`,
          name: "Director Técnico",
          nationality: null,
          avatarUrl: null,
          apiSportsId: null,
          teamId
        }
      },
      { status: 200 }
    );
  }
}
