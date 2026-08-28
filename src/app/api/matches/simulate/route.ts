import { NextResponse } from "next/server";
import { simulateMatch, type SimulationPlayer } from "@/domain/matches/simulateMatch";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { seed?: number; players?: SimulationPlayer[] };
  const players = body.players ?? [];
  const result = simulateMatch(
    { id: "northbridge", name: "Northbridge FC", strength: 78 },
    { id: "riverside", name: "Riverside Athletic", strength: 75 },
    players,
    body.seed ?? Date.now()
  );
  return NextResponse.json(result);
}
