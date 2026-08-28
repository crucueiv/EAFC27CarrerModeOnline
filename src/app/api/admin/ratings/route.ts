import { NextResponse } from "next/server";
import { MockRatingsProvider } from "@/domain/ratings/mockProvider";
import { PreserveAssignmentsAdapter, type AssignedRating } from "@/domain/ratings/provider";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { existing?: AssignedRating[] };
  const ratings = await new PreserveAssignmentsAdapter().sync(new MockRatingsProvider(), body.existing ?? []);
  return NextResponse.json({ provider: "mock", ratings });
}
