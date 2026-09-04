import { prisma } from "@/lib/prisma";

export type ContinentalTournamentKind = "UCL" | "UEL" | "UECL" | "LIBERTADORES" | "SUDAMERICANA";

export type CreateContinentalTournamentInput = {
  kind: ContinentalTournamentKind;
  seasonId: string;
  name: string;
};

const KIND_FORMAT: Record<ContinentalTournamentKind, { scope: "CONTINENTAL" | "DOMESTIC_CUP"; format: string }> = {
  UCL: { scope: "CONTINENTAL", format: "SWISS_LEAGUE" },
  UEL: { scope: "CONTINENTAL", format: "SWISS_LEAGUE" },
  UECL: { scope: "CONTINENTAL", format: "SWISS_LEAGUE" },
  LIBERTADORES: { scope: "CONTINENTAL", format: "KNOCKOUT" },
  SUDAMERICANA: { scope: "CONTINENTAL", format: "KNOCKOUT" },
};

export async function createContinentalTournament(
  input: CreateContinentalTournamentInput,
): Promise<string | null> {
  if (!prisma) return null;
  const { scope, format } = KIND_FORMAT[input.kind];
  const tournament = await prisma.tournament.create({
    data: {
      name: input.name,
      scope,
      seasonId: input.seasonId,
      format,
    },
  });
  return tournament.id;
}

export type ContinentalStageTemplate = {
  name: string;
  type: "GROUP" | "ROUND_OF_32" | "ROUND_OF_16" | "QUARTER_FINAL" | "SEMI_FINAL" | "FINAL";
  order: number;
  matchFormat: "SINGLE" | "TWO_LEGGED";
  parentOrder: number | null;
};

const UCL_STAGES: ContinentalStageTemplate[] = [
  { name: "1ª Ronda Clasificación", type: "ROUND_OF_32", order: 1, matchFormat: "TWO_LEGGED", parentOrder: null },
  { name: "2ª Ronda Clasificación", type: "ROUND_OF_16", order: 2, matchFormat: "TWO_LEGGED", parentOrder: 1 },
  { name: "3ª Ronda Clasificación", type: "ROUND_OF_16", order: 3, matchFormat: "TWO_LEGGED", parentOrder: 2 },
  { name: "Playoff Clasificación", type: "QUARTER_FINAL", order: 4, matchFormat: "TWO_LEGGED", parentOrder: 3 },
  { name: "Fase de Liga", type: "GROUP", order: 5, matchFormat: "SINGLE", parentOrder: 4 },
  { name: "Playoff 9°-24°", type: "QUARTER_FINAL", order: 6, matchFormat: "TWO_LEGGED", parentOrder: 5 },
  { name: "Octavos de Final", type: "ROUND_OF_16", order: 7, matchFormat: "TWO_LEGGED", parentOrder: 6 },
  { name: "Cuartos de Final", type: "QUARTER_FINAL", order: 8, matchFormat: "TWO_LEGGED", parentOrder: 7 },
  { name: "Semifinal", type: "SEMI_FINAL", order: 9, matchFormat: "TWO_LEGGED", parentOrder: 8 },
  { name: "Final", type: "FINAL", order: 10, matchFormat: "SINGLE", parentOrder: 9 },
];

const LIBERTADORES_STAGES: ContinentalStageTemplate[] = [
  { name: "1ª Fase", type: "ROUND_OF_32", order: 1, matchFormat: "TWO_LEGGED", parentOrder: null },
  { name: "2ª Fase", type: "ROUND_OF_16", order: 2, matchFormat: "TWO_LEGGED", parentOrder: 1 },
  { name: "3ª Fase (Fase de Grupos)", type: "GROUP", order: 3, matchFormat: "SINGLE", parentOrder: 2 },
  { name: "Octavos de Final", type: "ROUND_OF_16", order: 4, matchFormat: "TWO_LEGGED", parentOrder: 3 },
  { name: "Cuartos de Final", type: "QUARTER_FINAL", order: 5, matchFormat: "TWO_LEGGED", parentOrder: 4 },
  { name: "Semifinal", type: "SEMI_FINAL", order: 6, matchFormat: "TWO_LEGGED", parentOrder: 5 },
  { name: "Final", type: "FINAL", order: 7, matchFormat: "SINGLE", parentOrder: 6 },
];

const STAGES_BY_KIND: Record<ContinentalTournamentKind, ContinentalStageTemplate[]> = {
  UCL: UCL_STAGES,
  UEL: UCL_STAGES,
  UECL: UCL_STAGES,
  LIBERTADORES: LIBERTADORES_STAGES,
  SUDAMERICANA: LIBERTADORES_STAGES,
};

export async function createContinentalTournamentWithStages(
  input: CreateContinentalTournamentInput,
): Promise<{ tournamentId: string; stages: string[] } | null> {
  if (!prisma) return null;
  const tournamentId = await createContinentalTournament(input);
  if (!tournamentId) return null;

  const stages = STAGES_BY_KIND[input.kind];
  const stageIds: string[] = [];
  const orderToId = new Map<number, string>();

  for (const stage of stages) {
    const created = await prisma.tournamentStage.create({
      data: {
        tournamentId,
        name: stage.name,
        type: stage.type,
        order: stage.order,
        matchFormat: stage.matchFormat,
      },
    });
    orderToId.set(stage.order, created.id);
    stageIds.push(created.id);
  }

  for (const stage of stages) {
    if (stage.parentOrder === null) continue;
    const parentId = orderToId.get(stage.parentOrder);
    const currentId = orderToId.get(stage.order);
    if (!parentId || !currentId) continue;
    await prisma.tournamentStage.update({
      where: { id: currentId },
      data: { parentStageId: parentId },
    });
  }

  return { tournamentId, stages: stageIds };
}
