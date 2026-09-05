import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  detail,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  icon?: ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <div className={tone === "accent" ? "bento-card bento-card-alt" : "bento-card"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            {label}
          </p>
          <p className="font-display mt-2 text-4xl font-extrabold leading-none text-[var(--text-primary)]">
            {value}
          </p>
        </div>
        {icon && (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)]/50 text-[var(--accent-cyan)]">
            {icon}
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}
