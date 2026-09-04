type BadgeSize = "sm" | "md" | "lg";

function getBadgePalette(overall: number) {
  if (overall > 85) {
    return {
      backgroundClass: "bg-yellow-500/10",
      strokeColor: "#EAB308",
      strokeClass: "stroke-yellow-500",
    };
  }

  if (overall >= 75 && overall <= 85) {
    return {
      backgroundClass: "bg-slate-400/15",
      strokeColor: "#94A3B8",
      strokeClass: "stroke-slate-400",
    };
  }

  return {
    backgroundClass: "bg-amber-700/10",
    strokeColor: "#B45309",
    strokeClass: "stroke-amber-700",
  };
}

export default function PlayerOverallBadge({
  overall,
  size = "md",
  className = ""
}: {
  overall: number;
  size?: BadgeSize;
  className?: string;
}) {
  const safeOverall = Math.max(0, Math.min(99, overall));
  const palette = getBadgePalette(safeOverall);
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safeOverall / 99);
  const sizeMap = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-20 w-20"
  } as const;
  const textMap = {
    sm: "text-sm",
    md: "text-xl",
    lg: "text-2xl"
  } as const;

  return (
    <div
      className={`relative overflow-hidden rounded-full ${sizeMap[size]} ${palette.backgroundClass} ${className}`}
      role="img"
      aria-label={`Overall ${safeOverall}`}
    >
      <svg className="-rotate-90 h-full w-full" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={radius} fill="none" className="stroke-[var(--theme-muted-soft)]" strokeWidth="4" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={palette.strokeColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={palette.strokeClass}
        />
      </svg>
      <span className={`absolute inset-0 z-20 grid place-items-center ${textMap[size]} font-black text-[var(--theme-foreground)] select-none`}>
        {safeOverall}
      </span>
    </div>
  );
}
