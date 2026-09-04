import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processSeasonTransition } from "@/lib/calendar/seasonTransitionService";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization");
  if (header === `Bearer ${expected}`) return true;
  const vercelCron = request.headers.get("x-vercel-cron");
  return Boolean(vercelCron) && process.env.NODE_ENV !== "production" ? false : Boolean(vercelCron);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!prisma) {
    return NextResponse.json({ error: "DB no disponible" }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const careerGroupId = searchParams.get("careerGroupId");
  if (!careerGroupId) {
    return NextResponse.json({ error: "careerGroupId requerido" }, { status: 400 });
  }
  const result = await processSeasonTransition(prisma, { careerGroupId });
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return POST(request);
}
