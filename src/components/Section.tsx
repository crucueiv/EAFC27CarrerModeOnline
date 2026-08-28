export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-semibold">{title}</h2></div>{children}</section>;
}
