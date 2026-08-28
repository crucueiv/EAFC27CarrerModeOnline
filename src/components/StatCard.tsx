export function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}
