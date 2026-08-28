import { NextResponse } from "next/server";
import { canUserAdvance, type CalendarMatch } from "@/domain/calendar/canUserAdvance";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    now?: string;
    matches?: CalendarMatch[];
    dependencies?: { id: string; status: CalendarMatch["status"] }[];
  };
  const matches = (body.matches ?? []).map((match) => ({
    ...match,
    scheduledAt: new Date(match.scheduledAt)
  }));
  const decision = canUserAdvance(body.userId ?? "", body.now ? new Date(body.now) : new Date(), matches, body.dependencies ?? []);
  return NextResponse.json(decision, { status: decision.allowed ? 200 : 409 });
}
