import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUserAdvanceToDate } from "@/domain/calendar/canUserAdvanceToDate";
import { advanceUserToDate } from "@/lib/calendar/advanceService";

export const dynamic = "force-dynamic";

type Body = {
  careerGroupId?: string;
  targetDate?: string;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!prisma) {
    return NextResponse.json({ error: "DB no disponible" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  if (!body.careerGroupId) {
    return NextResponse.json({ error: "careerGroupId requerido" }, { status: 400 });
  }

  const target = body.targetDate ? new Date(body.targetDate) : undefined;
  if (body.targetDate && Number.isNaN(target?.getTime() ?? NaN)) {
    return NextResponse.json({ error: "targetDate inválido" }, { status: 400 });
  }

  if (target) {
    const result = await advanceUserToDate(prisma, {
      userId: session.user.id,
      careerGroupId: body.careerGroupId,
      targetDate: target,
    });
    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.reason,
          currentDate: result.currentDate,
          maxAllowedDate: result.maxAllowedDate,
          details: result.details,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      newCurrentDate: result.newCurrentDate,
      maxAllowedDate: result.maxAllowedDate,
    });
  }

  const check = await canUserAdvanceToDate(prisma, {
    userId: session.user.id,
    careerGroupId: body.careerGroupId,
  });
  return NextResponse.json(check, { status: check.canAdvance ? 200 : 409 });
}
