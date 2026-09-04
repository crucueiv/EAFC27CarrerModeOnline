import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { processPendingNegotiations } from "@/lib/transfers/jobs/processPendingNegotiations";

export async function POST(request: Request) {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;

  const body = (await request.json().catch(() => ({}))) as { userId?: string };
  const result = await processPendingNegotiations({ userId: body.userId });
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") ?? undefined;
  const result = await processPendingNegotiations({ userId });
  return NextResponse.json(result);
}
