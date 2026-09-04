export type FormationSlotDef = {
  position: string;
  label: string;
};

export type FormationDef = {
  id: string;
  name: string;
  category: "4_DEFENSAS" | "3_DEFENSAS" | "5_DEFENSAS";
  slots: [FormationSlotDef, FormationSlotDef, FormationSlotDef, FormationSlotDef, FormationSlotDef, FormationSlotDef, FormationSlotDef, FormationSlotDef, FormationSlotDef, FormationSlotDef, FormationSlotDef];
};

const POR: FormationSlotDef = { position: "POR", label: "Portero" };
const LI: FormationSlotDef = { position: "LI", label: "Lateral Izquierdo" };
const LD: FormationSlotDef = { position: "LD", label: "Lateral Derecho" };
const DFC: FormationSlotDef = { position: "DFC", label: "Defensa Central" };
const CAI: FormationSlotDef = { position: "CAI", label: "Carrilero Izquierdo" };
const CAD: FormationSlotDef = { position: "CAD", label: "Carrilero Derecho" };
const MCD: FormationSlotDef = { position: "MCD", label: "Mediocentro Defensivo" };
const MC: FormationSlotDef = { position: "MC", label: "Mediocentro" };
const MCO: FormationSlotDef = { position: "MCO", label: "Mediapunta" };
const MI: FormationSlotDef = { position: "MI", label: "Medio Izquierdo" };
const MD: FormationSlotDef = { position: "MD", label: "Medio Derecho" };
const EI: FormationSlotDef = { position: "EI", label: "Extremo Izquierdo" };
const ED: FormationSlotDef = { position: "ED", label: "Extremo Derecho" };
const SD: FormationSlotDef = { position: "SD", label: "Segundo Delantero" };
const DC: FormationSlotDef = { position: "DC", label: "Delantero Centro" };

export const FORMATIONS: FormationDef[] = [
  {
    id: "4-3-3-1-contencion",
    name: "4-3-3 (1) - Contención",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MCD, MC, MC, EI, DC, ED],
  },
  {
    id: "4-3-3-2-ofensiva",
    name: "4-3-3 (2) - Ofensiva",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MC, MC, MCO, EI, DC, ED],
  },
  {
    id: "4-3-3-3-falso-9",
    name: "4-3-3 (3) - Falso 9",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MCD, MC, MC, EI, SD, ED],
  },
  {
    id: "4-3-3-4-defensiva",
    name: "4-3-3 (4) - Defensiva",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MCD, MCD, MCO, EI, DC, ED],
  },
  {
    id: "4-3-3-5-plana",
    name: "4-3-3 (5) - Plana",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MC, MC, MC, EI, DC, ED],
  },
  {
    id: "4-4-2-1-plana",
    name: "4-4-2 (1) - Plana",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MI, MD, MC, MC, DC, DC],
  },
  {
    id: "4-4-2-2-defensiva",
    name: "4-4-2 (2) - Defensiva",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MI, MD, MCD, MCD, DC, DC],
  },
  {
    id: "4-2-3-1-1-cerrada",
    name: "4-2-3-1 (1) - Cerrada / Estrecha",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MCD, MCD, MCO, MCO, MCO, DC],
  },
  {
    id: "4-2-3-1-2-ancha",
    name: "4-2-3-1 (2) - Ancha",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MI, MD, MCD, MCD, MCO, DC],
  },
  {
    id: "4-1-2-1-2-1-estrecha",
    name: "4-1-2-1-2 (1) - Estrecha",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MCD, MC, MC, MCO, DC, DC],
  },
  {
    id: "4-1-2-1-2-2-ancha",
    name: "4-1-2-1-2 (2) - Ancha",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MCD, MI, MD, MCO, DC, DC],
  },
  {
    id: "4-3-2-1",
    name: "4-3-2-1",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MC, MC, MC, SD, SD, DC],
  },
  {
    id: "4-3-1-2",
    name: "4-3-1-2",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MC, MC, MC, MCO, DC, DC],
  },
  {
    id: "4-2-2-2",
    name: "4-2-2-2",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MCD, MCD, MCO, MCO, DC, DC],
  },
  {
    id: "4-1-4-1",
    name: "4-1-4-1",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MI, MD, MC, MC, MCD, DC],
  },
  {
    id: "4-1-3-2",
    name: "4-1-3-2",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MI, MD, MC, MCD, DC, DC],
  },
  {
    id: "4-2-4",
    name: "4-2-4",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MC, MC, EI, ED, DC, DC],
  },
  {
    id: "4-5-1-1-ataque",
    name: "4-5-1 (1) - Ataque",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MI, MD, MC, MCO, MCO, DC],
  },
  {
    id: "4-5-1-2-plana",
    name: "4-5-1 (2) - Plana",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MI, MD, MC, MC, MC, DC],
  },
  {
    id: "4-4-1-1-1-mcd",
    name: "4-4-1-1 (1) - Con MCD",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MI, MD, MCD, MCD, SD, DC],
  },
  {
    id: "4-4-1-1-2-mco",
    name: "4-4-1-1 (2) - Con MCO",
    category: "4_DEFENSAS",
    slots: [POR, LD, DFC, DFC, LI, MI, MD, MC, MC, MCO, DC],
  },
  {
    id: "3-4-3-1-plana",
    name: "3-4-3 (1) - Plana",
    category: "3_DEFENSAS",
    slots: [POR, DFC, DFC, DFC, MI, MD, MC, MC, EI, ED, DC],
  },
  {
    id: "3-4-3-2-diamante",
    name: "3-4-3 (2) - Diamante",
    category: "3_DEFENSAS",
    slots: [POR, DFC, DFC, DFC, MI, MD, MCD, MCO, EI, ED, DC],
  },
  {
    id: "3-5-2",
    name: "3-5-2",
    category: "3_DEFENSAS",
    slots: [POR, DFC, DFC, DFC, MI, MD, MCD, MCD, MCO, DC, DC],
  },
  {
    id: "3-4-1-2",
    name: "3-4-1-2",
    category: "3_DEFENSAS",
    slots: [POR, DFC, DFC, DFC, MI, MD, MC, MC, MCO, DC, DC],
  },
  {
    id: "3-4-2-1",
    name: "3-4-2-1",
    category: "3_DEFENSAS",
    slots: [POR, DFC, DFC, DFC, MI, MD, MC, MC, SD, SD, DC],
  },
  {
    id: "3-1-4-2",
    name: "3-1-4-2",
    category: "3_DEFENSAS",
    slots: [POR, DFC, DFC, DFC, MI, MD, MC, MC, MCD, DC, DC],
  },
  {
    id: "3-5-1-1",
    name: "3-5-1-1",
    category: "3_DEFENSAS",
    slots: [POR, DFC, DFC, DFC, MI, MD, MC, MCD, MCD, SD, DC],
  },
  {
    id: "5-3-2",
    name: "5-3-2",
    category: "5_DEFENSAS",
    slots: [POR, CAI, CAD, DFC, DFC, DFC, MC, MC, MC, DC, DC],
  },
  {
    id: "5-2-1-2",
    name: "5-2-1-2",
    category: "5_DEFENSAS",
    slots: [POR, CAI, CAD, DFC, DFC, DFC, MC, MC, MCO, DC, DC],
  },
  {
    id: "5-4-1-1-plana",
    name: "5-4-1 (1) - Plana",
    category: "5_DEFENSAS",
    slots: [POR, CAI, CAD, DFC, DFC, DFC, MI, MD, MC, MC, DC],
  },
  {
    id: "5-4-1-2-diamante",
    name: "5-4-1 (2) - Diamante",
    category: "5_DEFENSAS",
    slots: [POR, CAI, CAD, DFC, DFC, DFC, MC, MC, MCO, MCD, DC],
  },
  {
    id: "5-2-3",
    name: "5-2-3",
    category: "5_DEFENSAS",
    slots: [POR, CAI, CAD, DFC, DFC, DFC, MC, MC, EI, ED, DC],
  },
];

export const FORMATIONS_BY_ID: Record<string, FormationDef> = FORMATIONS.reduce(
  (acc, f) => {
    acc[f.id] = f;
    return acc;
  },
  {} as Record<string, FormationDef>,
);

export const BENCH_SIZE = 7;

export const POSITION_GROUPS: Array<{ label: string; positions: string[] }> = [
  { label: "Portero", positions: ["POR"] },
  { label: "Defensa", positions: ["DFC", "LI", "LD", "CAD", "CAI"] },
  { label: "Centrocampista", positions: ["MCD", "MC", "MCO", "MI", "MD"] },
  { label: "Ataque", positions: ["DC", "SD", "EI", "ED"] },
];

export function getPositionGroup(position: string): string {
  const found = POSITION_GROUPS.find((g) => g.positions.includes(position));
  return found?.label ?? "Otros";
}
