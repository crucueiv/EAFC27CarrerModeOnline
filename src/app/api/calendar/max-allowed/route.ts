import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUserAdvanceToDate } from "@/domain/calendar/canUserAdvanceToDate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
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
  const result = await canUserAdvanceToDate(prisma, {
    userId: session.user.id,
    careerGroupId,
  });
  return NextResponse.json(result, { status: result.canAdvance ? 200 : 409 });
}
