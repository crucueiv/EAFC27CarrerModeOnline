export const POSITION_TRANSLATION: Record<string, string> = {
  GK: "POR",
  CB: "DFC",
  LB: "LI",
  RB: "LD",
  LWB: "EI",
  RWB: "ED",
  CDM: "MCD",
  CM: "MC",
  CAM: "MCO",
  LM: "MI",
  RM: "MD",
  LW: "EI",
  RW: "ED",
  CF: "DC",
  ST: "DC",
  SW: "LIB",
  DM: "MCD",
  AM: "MCO",
  WM: "MI",
};

export function translatePosition(en: string): string {
  return POSITION_TRANSLATION[en.toUpperCase()] ?? en;
}

export function translatePositions(positions: string[]): string[] {
  return positions.map(translatePosition);
}

export const POSITION_ORDER = [
  "POR", "DFC", "LI", "LD", "EI", "ED",
  "MCD", "MC", "MCO", "MI", "MD",
  "EI", "ED", "DC"
] as const;

export type PositionES = typeof POSITION_ORDER[number];