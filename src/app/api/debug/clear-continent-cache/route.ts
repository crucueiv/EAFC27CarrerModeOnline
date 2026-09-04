import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clearContinentSpotsCache } from "@/lib/coefficients/resolveContinentSpots";

function isDebugEnabled(): boolean {
  const v = process.env.EAFC_DEBUG;
  return v === "1" || v === "standings" || v === "all";
}

export async function POST() {
  if (!isDebugEnabled()) {
    return new NextResponse("Not Found", { status: 404 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  clearContinentSpotsCache();
  return NextResponse.json({ ok: true });
}
