'use server';

import { getOrFetchManager, ManagerResult } from '@/lib/managers/getOrFetchManager';

export async function getManagerAction(teamId: string): Promise<ManagerResult> {
  if (!teamId || typeof teamId !== 'string') {
    // Falla rápido y con un mensaje claro en vez de dejar que el error aparezca
    // más abajo (o que el modal se quede pensando que "no pasó nada").
    throw new Error('getManagerAction: se requiere un teamId válido (string no vacío).');
  }

  return await getOrFetchManager(teamId);
}