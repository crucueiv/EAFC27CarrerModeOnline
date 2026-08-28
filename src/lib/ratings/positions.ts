export type EaPositionOption = {
  id: string;
  shortLabel: string;
  label: string;
  group: "Portero" | "Defensa" | "Centrocampista" | "Ataque";
};

// IDs used by drop-api.ea.com/rating/ea-sports-fc.
export const EA_POSITIONS: readonly EaPositionOption[] = [
  { id: "0", shortLabel: "POR", label: "Portero", group: "Portero" },
  { id: "3", shortLabel: "LI", label: "Lateral izquierdo", group: "Defensa" },
  { id: "5", shortLabel: "LD", label: "Lateral derecho", group: "Defensa" },
  { id: "14", shortLabel: "DFC", label: "Defensa central", group: "Defensa" },
  { id: "15", shortLabel: "CAD", label: "Carrilero derecho", group: "Defensa" },
  { id: "16", shortLabel: "CAI", label: "Carrilero izquierdo", group: "Defensa" },
  { id: "21", shortLabel: "MCD", label: "Mediocentro defensivo", group: "Centrocampista" },
  { id: "22", shortLabel: "MC", label: "Mediocentro", group: "Centrocampista" },
  { id: "23", shortLabel: "MI", label: "Mediocentro izquierdo", group: "Centrocampista" },
  { id: "24", shortLabel: "MD", label: "Mediocentro derecho", group: "Centrocampista" },
  { id: "25", shortLabel: "DC", label: "Delantero centro", group: "Ataque" },
  { id: "26", shortLabel: "SD", label: "Segundo delantero", group: "Ataque" },
  { id: "27", shortLabel: "EI", label: "Extremo izquierdo", group: "Ataque" },
  { id: "28", shortLabel: "ED", label: "Extremo derecho", group: "Ataque" },
  { id: "29", shortLabel: "MCO", label: "Mediapunta", group: "Centrocampista" },
  { id: "30", shortLabel: "DFC", label: "Defensa central", group: "Defensa" },
  { id: "31", shortLabel: "POR", label: "Portero", group: "Portero" }
] as const;

export const EA_POSITION_BY_ID = new Map(EA_POSITIONS.map((position) => [position.id, position]));
