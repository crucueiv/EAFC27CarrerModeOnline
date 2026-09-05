import { prisma } from "@/lib/prisma";

const SINGLETON_NAME = "Carrera Online";
const SINGLETON_INVITE = "singleton-career-group";

let cachedId: string | null = null;

export async function getSingletonCareerGroupId(): Promise<string> {
  if (cachedId) return cachedId;
  if (!prisma) throw new Error("Prisma no disponible");

  const existing = await prisma.careerGroup.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existing) {
    cachedId = existing.id;
    return existing.id;
  }

  const created = await prisma.careerGroup.create({
    data: { name: SINGLETON_NAME, inviteCode: SINGLETON_INVITE },
    select: { id: true },
  });
  cachedId = created.id;
  return created.id;
}

export function resetSingletonCareerGroupCache() {
  cachedId = null;
}
