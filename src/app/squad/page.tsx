const squad = [
  ["Alex Morgan", "DC", 84, "Titular"],
  ["Sam Wright", "MC", 78, "Titular"],
  ["Casey Smith", "DFC", 76, "Rotación"],
  ["Taylor Green", "POR", 81, "Titular"]
];

export default function SquadPage() {
  return <div><h1 className="text-3xl font-bold">Plantilla</h1><p className="mt-2 text-slate-600">Las asignaciones se mantienen al actualizar las valoraciones.</p><div className="mt-6 rounded-xl border bg-white"><div className="grid grid-cols-4 gap-4 border-b bg-slate-50 p-4 text-xs font-semibold uppercase text-slate-500"><span>Jugador</span><span>Posición</span><span>Media</span><span>Rol</span></div>{squad.map(([name, position, overall, role]) => <div key={name} className="grid grid-cols-4 gap-4 border-b p-4 text-sm last:border-0"><span className="font-medium">{name}</span><span>{position}</span><span>{overall}</span><span>{role}</span></div>)}</div></div>;
}
