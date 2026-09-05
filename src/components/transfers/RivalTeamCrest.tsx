"use client";
import { useState } from "react";

interface RivalTeamCrestProps {
  imageUrl?: string | null;
  altText: string;
  size?: number;
  primaryColor?: string | null;
  shortName?: string | null;
}

const FALLBACK = "/default-avatar.svg";

export function RivalTeamCrest({
  imageUrl,
  altText,
  size = 48,
  primaryColor = "#2563eb",
  shortName,
}: RivalTeamCrestProps) {
  const [src, setSrc] = useState<string | null>(imageUrl ?? null);
  const px = `${size}px`;

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={altText}
        onError={() => setSrc(FALLBACK)}
        style={{
          width: px,
          height: px,
          objectFit: "cover",
          borderRadius: 8,
          background: primaryColor ?? "#0f172a",
          border: "1px solid rgba(148,163,184,0.4)",
        }}
      />
    );
  }

  return (
    <div
      aria-label={altText}
      style={{
        width: px,
        height: px,
        borderRadius: 8,
        background: primaryColor ?? "#0f172a",
        color: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: Math.max(10, size / 3),
        border: "1px solid rgba(148,163,184,0.4)",
      }}
    >
      {(shortName ?? altText).slice(0, 3).toUpperCase()}
    </div>
  );
}
