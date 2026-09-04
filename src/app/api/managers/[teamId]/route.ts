import { NextResponse } from "next/server";
import { getOrFetchManager, type ManagerResult } from "@/lib/managers/getOrFetchManager";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamId: string }> },
): Promise<NextResponse<ManagerResult | { error: string }>> {
  const { teamId } = await params;
  if (!teamId || typeof teamId !== "string") {
    return NextResponse.json({ error: "teamId requerido" }, { status: 400 });
  }
  try {
    const result = await getOrFetchManager(teamId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
