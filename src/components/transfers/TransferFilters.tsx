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

  return (
    <form onSubmit={(event) => { event.preventDefault(); submit(new FormData(event.currentTarget)); }} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium">Nombre<input name="name" defaultValue={values.name} placeholder="Buscar jugadores" className="mt-1 w-full rounded-lg border p-2 font-normal" /></label>
        <label className="text-sm font-medium">Género<select name="gender" defaultValue={values.gender ?? "MALE"} className="mt-1 w-full rounded-lg border p-2 font-normal"><option value="MALE">Masculino</option><option value="FEMALE">Femenino</option><option value="ALL">Todos</option></select></label>
        <fieldset className="md:col-span-2 lg:col-span-4">
          <legend className="text-sm font-medium">Posición</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs"><input type="radio" name="position" value="" defaultChecked={!values.position} />Todas</label>
            {EA_POSITIONS.map((position) => <label key={position.id} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs hover:border-pitch">
              <input type="radio" name="position" value={position.id} defaultChecked={String(values.position ?? "") === position.id} />
              <span><strong>{position.shortLabel}</strong><br />{position.label}</span>
            </label>)}
          </div>
        </fieldset>
        <label className="text-sm font-medium">Liga<select name="leagueName" defaultValue={values.leagueName ?? ""} className="mt-1 w-full rounded-lg border p-2 font-normal"><option value="">Todas las ligas</option>{options.leagues.map((league) => <option key={league.id} value={league.name}>{league.name}</option>)}</select></label>
        <label className="text-sm font-medium">Equipo<input name="teamName" defaultValue={values.teamName} placeholder="Nombre del equipo" className="mt-1 w-full rounded-lg border p-2 font-normal" /></label>
        <label className="text-sm font-medium">Nacionalidad<select name="nationalityName" defaultValue={values.nationalityName ?? ""} className="mt-1 w-full rounded-lg border p-2 font-normal"><option value="">Todas las nacionalidades</option>{options.nationalities.map((country) => <option key={country.id} value={country.name}>{country.name}</option>)}</select></label>
        <label className="text-sm font-medium">Precio máximo (€)<input name="maxPrice" type="number" min="0" step="100000" defaultValue={values.maxPrice} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label>
        <label className="text-sm font-medium flex items-center gap-2 self-end pb-2">
          <input type="checkbox" name="freeAgents" value="1" defaultChecked={Boolean(values.freeAgents)} className="h-4 w-4 rounded border-slate-300" />
          Solo agentes libres
        </label>
        <div className="md:col-span-2">
          <div className="flex justify-between text-sm font-medium"><span>Rango de media</span><span>{minOverall}–{maxOverall}</span></div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <input aria-label="Minimum overall" type="range" min="1" max="99" value={minOverall} onChange={(event) => setMinOverall(Math.min(Number(event.target.value), maxOverall))} />
            <input aria-label="Maximum overall" type="range" min="1" max="99" value={maxOverall} onChange={(event) => setMaxOverall(Math.max(Number(event.target.value), minOverall))} />
          </div>
        </div>
        {([
          ["minPace", "Ritmo mínimo"], ["minShooting", "Tiro mínimo"], ["minPassing", "Pase mínimo"],
          ["minDribbling", "Regate mínimo"], ["minDefending", "Defensa mínima"], ["minPhysical", "Físico mínimo"]
        ] as const).map(([name, label]) => <label key={name} className="text-sm font-medium">{label}<input name={name} type="number" min="0" max="99" defaultValue={values[name]} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label>)}
      </div>
      <button type="submit" className="mt-5 rounded-lg bg-pitch px-5 py-2 font-semibold text-white hover:bg-emerald-900">Buscar jugadores</button>
    </form>
  );
}
