/**
 * Participantes de las competiciones de clubes internacionales en la PRIMERA
 * temporada de un CareerGroup. Se leen cuando se inicializa el modo carrera y
 * NO deben cambiar entre reinicios (no hay datos del pasado).
 *
 * Los IDs de Prisma (cuids) no son estables entre seeds; en su lugar usamos
 * `teamEaId` (id estable de la API de EA) y `teamName` como referencia humana.
 */
export type FirstSeasonParticipant = {
  tournamentId: string;
  teamEaId: string;
  teamName: string;
};

export type FirstSeasonParticipantFile = {
  tournamentId: string;
  fileName: string;
  participantCount: number;
};
