const ARGENTINA_CLASSICS: Record<string, string> = {
  "Boca Juniors": "River Plate",
  "River Plate": "Boca Juniors",
  "Racing Club": "Independiente",
  "Independiente": "Racing Club",
  "San Lorenzo": "Huracán",
  "Huracán": "San Lorenzo",
  "Estudiantes": "Gimnasia y Esgrima",
  "Gimnasia y Esgrima": "Estudiantes",
  "Vélez Sarsfield": "Argentinos Juniors",
  "Argentinos Juniors": "Vélez Sarsfield",
  "Newells Old Boys": "Rosario Central",
  "Rosario Central": "Newells Old Boys",
  "Lanús": "Banfield",
  "Banfield": "Lanús",
  "Talleres": "Belgrano",
  "Belgrano": "Talleres",
};

export function getArgentinaClassicRival(teamName: string): string | null {
  for (const [a, b] of Object.entries(ARGENTINA_CLASSICS)) {
    if (a.toLowerCase() === teamName.toLowerCase()) return b;
  }
  return null;
}

export function splitArgentinaZones(teams: string[]): { zoneA: string[]; zoneB: string[] } {
  const sorted = [...teams].sort((a, b) => a.localeCompare(b));
  const zoneA = sorted.slice(0, Math.ceil(sorted.length / 2));
  const zoneB = sorted.slice(Math.ceil(sorted.length / 2));
  return { zoneA, zoneB };
}
