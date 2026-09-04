"use client";

import { useState } from "react";
import type { TransferSearchParams } from "@/lib/transfers/search";
import { EA_POSITIONS } from "@/lib/ratings/positions";

type FilterValues = TransferSearchParams & { minOverall: number; maxOverall: number };

export default function TransferFilters({ values, options }: { values: FilterValues; options: { leagues: Array<{ id: string; name: string }>; nationalities: Array<{ id: string; name: string }> } }) {
  const [minOverall, setMinOverall] = useState(values.minOverall);
  const [maxOverall, setMaxOverall] = useState(values.maxOverall);

  function submit(formData: FormData) {
    const query = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value.trim() !== "") query.set(key, value);
    }
    query.set("minOverall", String(minOverall));
    query.set("maxOverall", String(maxOverall));
    query.set("page", "1");
    window.location.assign(`/transfers?${query.toString()}`);
  }

  const inputClass = "mt-1 w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-2 font-normal text-[var(--theme-foreground)] placeholder:text-[var(--theme-muted)]";
  const labelClass = "text-sm font-medium text-[var(--theme-foreground)]";

  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(new FormData(event.currentTarget)); }} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className={labelClass}>Nombre<input name="name" defaultValue={values.name} placeholder="Buscar jugadores" className={inputClass} /></label>
        <fieldset className="md:col-span-2 lg:col-span-4">
          <legend className={labelClass}>Posición</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--theme-border)] p-2 text-xs text-[var(--theme-foreground)]"><input type="radio" name="position" value="" defaultChecked={!values.position} />Todas</label>
            {EA_POSITIONS.map((position) => <label key={position.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--theme-border)] p-2 text-xs text-[var(--theme-foreground)] hover:border-[var(--theme-primary)]">
              <input type="radio" name="position" value={position.id} defaultChecked={String(values.position ?? "") === position.id} />
              <span><strong>{position.shortLabel}</strong><br />{position.label}</span>
            </label>)}
          </div>
        </fieldset>
        <label className={labelClass}>Liga<select name="leagueName" defaultValue={values.leagueName ?? ""} className={inputClass}><option value="">Todas las ligas</option>{options.leagues.map((league) => <option key={league.id} value={league.name}>{league.name}</option>)}</select></label>
        <label className={labelClass}>Equipo<input name="teamName" defaultValue={values.teamName} placeholder="Nombre del equipo" className={inputClass} /></label>
        <label className={labelClass}>Nacionalidad<select name="nationalityName" defaultValue={values.nationalityName ?? ""} className={inputClass}><option value="">Todas las nacionalidades</option>{options.nationalities.map((country) => <option key={country.id} value={country.name}>{country.name}</option>)}</select></label>
        <label className={labelClass}>Precio máximo (€)<input name="maxPrice" type="number" min="0" step="100000" defaultValue={values.maxPrice} className={inputClass} /></label>
        <label className="text-sm font-medium flex items-center gap-2 self-end pb-2 text-[var(--theme-foreground)]">
          <input type="checkbox" name="freeAgents" value="1" defaultChecked={Boolean(values.freeAgents)} className="h-4 w-4 rounded border-[var(--theme-border)]" />
          Solo agentes libres
        </label>
        <div className="md:col-span-2">
          <div className="flex justify-between text-sm font-medium text-[var(--theme-foreground)]"><span>Rango de media</span><span>{minOverall}–{maxOverall}</span></div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <input aria-label="Minimum overall" type="range" min="1" max="99" value={minOverall} onChange={(event) => setMinOverall(Math.min(Number(event.target.value), maxOverall))} />
            <input aria-label="Maximum overall" type="range" min="1" max="99" value={maxOverall} onChange={(event) => setMaxOverall(Math.max(Number(event.target.value), minOverall))} />
          </div>
        </div>
        {([
          ["minPace", "Ritmo mínimo"], ["minShooting", "Tiro mínimo"], ["minPassing", "Pase mínimo"],
          ["minDribbling", "Regate mínimo"], ["minDefending", "Defensa mínima"], ["minPhysical", "Físico mínimo"]
        ] as const).map(([name, label]) => <label key={name} className={labelClass}>{label}<input name={name} type="number" min="0" max="99" defaultValue={values[name]} className={inputClass} /></label>)}
      </div>
      <button type="submit" className="mt-5 rounded-lg bg-[var(--theme-primary)] px-5 py-2 font-semibold text-[var(--theme-on-primary)] hover:opacity-90">Buscar jugadores</button>
    </form>
  );
}
