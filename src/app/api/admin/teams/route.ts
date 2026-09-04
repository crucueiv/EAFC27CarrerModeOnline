import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { response: authError } = await requireAdmin();
  if (authError) return authError;
  if (!prisma) {
    return NextResponse.json({ error: "Prisma no disponible" }, { status: 500 });
  }

  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      shortName: true,
      budget: true,
      committedBudget: true,
      primaryColor: true,
      league: { select: { id: true, name: true } },
      manager: { select: { id: true, username: true, name: true, email: true } },
    },
    take: 500,
  });

  return NextResponse.json({ teams });
}
