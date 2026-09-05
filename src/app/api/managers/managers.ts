import type { ManagerResult } from "@/lib/managers/getOrFetchManager";

export type { ManagerResult };

export async function getManagerAction(teamId: string): Promise<ManagerResult> {
  if (!teamId || typeof teamId !== "string") {
    throw new Error("getManagerAction: se requiere un teamId válido (string no vacío).");
  }

  const res = await fetch(`/api/managers/${encodeURIComponent(teamId)}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `getManagerAction: HTTP ${res.status}`);
  }

  const body = (await res.json()) as { manager?: ManagerResult };
  if (!body.manager) {
    throw new Error("getManagerAction: respuesta vacía del servidor");
  }
  return body.manager;
}
