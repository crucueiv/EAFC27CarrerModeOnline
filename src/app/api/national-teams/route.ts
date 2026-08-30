import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  try {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { country: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const teams = await prisma.nationalTeam.findMany({
      where,
      select: {
        id: true,
        name: true,
        shortName: true,
        country: true,
        countryCode: true,
        flagUrl: true,
        userManagerId: true,
        userManager: { select: { id: true, username: true, avatarUrl: true } },
        manager: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { name: "asc" },
      take: 100,
    });

    return NextResponse.json(teams);
  } catch (error) {
    console.error("Error fetching national teams:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
