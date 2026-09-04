"use client";

import { FORMATIONS } from "@/lib/constants/formations";

export default function FormationPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (formationId: string) => void;
}) {
  const grouped = {
    "4_DEFENSAS": FORMATIONS.filter((f) => f.category === "4_DEFENSAS"),
    "3_DEFENSAS": FORMATIONS.filter((f) => f.category === "3_DEFENSAS"),
    "5_DEFENSAS": FORMATIONS.filter((f) => f.category === "5_DEFENSAS"),
  };

  const labels: Record<string, string> = {
    "4_DEFENSAS": "Línea de 4 defensas",
    "3_DEFENSAS": "Línea de 3 defensas",
    "5_DEFENSAS": "Línea de 5 defensas",
  };

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-semibold text-[var(--theme-muted)]">Formación</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-background)] px-3 py-2 text-sm font-medium text-[var(--theme-foreground)] focus:border-emerald-400 focus:outline-none"
      >
        {Object.entries(grouped).map(([cat, list]) => (
          <optgroup key={cat} label={labels[cat]}>
            {list.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
