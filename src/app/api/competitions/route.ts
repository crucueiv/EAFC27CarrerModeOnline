import { NextResponse } from "next/server";
import { getCompetitionsData } from "@/lib/competitions";

export async function GET() {
  try {
    const leagues = await getCompetitionsData();
    return NextResponse.json(leagues);
  } catch (error) {
    console.error("Error fetching competitions:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
