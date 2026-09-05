"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import type { TeamThemeSeed } from "@/lib/theme/clubTheme";
import { resolveThemeSeed } from "@/lib/theme/clubTheme";

type ThemeMode = "dark";

type ThemeValue = {
  mode: ThemeMode;
  primaryColor: string;
  secondaryColor: string;
  leaguePrimaryColor: string;
  leagueSecondaryColor: string;
  mounted: boolean;
};

const ThemeContext = createContext<ThemeValue | null>(null);

const STORAGE_KEY = "ea-fc-theme-mode";

function getInitialMode(): ThemeMode {
  return "dark";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 1;
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function pickOnColor(hex: string): string {
  return relativeLuminance(hex) > 0.55 ? "#0f172a" : "#ffffff";
}

function applyThemeVars(params: {
  primary: string;
  secondary: string;
  leaguePrimary: string;
  leagueSecondary: string;
}) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // League-tinted tokens (se usan en gradientes de equipo)
  root.style.setProperty("--theme-primary", params.primary);
  root.style.setProperty("--theme-secondary", params.secondary);
  root.style.setProperty("--theme-league-primary", params.leaguePrimary);
  root.style.setProperty("--theme-league-secondary", params.leagueSecondary);

  // Forzar siempre la paleta gaming dark, independientemente del club.
  // Esto preserva la coherencia visual pedida en el brief.
  root.style.setProperty("--theme-background", "#17151F");
  root.style.setProperty("--theme-surface", "#191820");
  root.style.setProperty("--theme-card", "rgba(46, 47, 59, 0.85)");
  root.style.setProperty("--theme-card-alt", "rgba(45, 53, 64, 0.85)");
  root.style.setProperty("--theme-foreground", "#FCFCFC");
  root.style.setProperty("--theme-muted", "#9BA1AC");
  root.style.setProperty("--theme-muted-soft", "rgba(155, 161, 172, 0.12)");
  root.style.setProperty("--theme-border", "rgba(255, 255, 255, 0.08)");
  root.style.setProperty("--theme-shadow", "rgba(0, 0, 0, 0.55)");
  root.style.setProperty("--theme-on-accent", "#001016");
  root.style.setProperty("--theme-accent", "#00E5FF");
  root.style.setProperty("--theme-accent-soft", "rgba(0, 229, 255, 0.16)");

  const onPrimary = pickOnColor(params.primary);
  root.style.setProperty("--theme-on-gradient", onPrimary);
  root.style.setProperty("--theme-on-gradient-strong", onPrimary);
  root.style.setProperty("--theme-on-primary", onPrimary);

  root.style.setProperty("color-scheme", "dark");
  root.classList.add("dark");
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export default function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme?: TeamThemeSeed | null;
  children: React.ReactNode;
}) {
  const resolved = resolveThemeSeed(initialTheme);
  const [mode] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(resolved.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(resolved.secondaryColor);
  const [leaguePrimaryColor, setLeaguePrimaryColor] = useState(resolved.leaguePrimaryColor);
  const [leagueSecondaryColor, setLeagueSecondaryColor] = useState(
    resolved.leagueSecondaryColor
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;
    applyThemeVars({
      primary: primaryColor,
      secondary: secondaryColor,
      leaguePrimary: leaguePrimaryColor,
      leagueSecondary: leagueSecondaryColor,
    });
    try {
      window.localStorage.setItem(STORAGE_KEY, "dark");
    } catch {
      /* ignore */
    }
  }, [primaryColor, secondaryColor, leaguePrimaryColor, leagueSecondaryColor, mounted]);

  useLayoutEffect(() => {
    setPrimaryColor(resolved.primaryColor);
    setSecondaryColor(resolved.secondaryColor);
    setLeaguePrimaryColor(resolved.leaguePrimaryColor);
    setLeagueSecondaryColor(resolved.leagueSecondaryColor);
  }, [
    resolved.primaryColor,
    resolved.secondaryColor,
    resolved.leaguePrimaryColor,
    resolved.leagueSecondaryColor,
  ]);

  const value = useMemo<ThemeValue>(
    () => ({
      mode,
      primaryColor,
      secondaryColor,
      leaguePrimaryColor,
      leagueSecondaryColor,
      mounted,
    }),
    [
      mode,
      primaryColor,
      secondaryColor,
      leaguePrimaryColor,
      leagueSecondaryColor,
      mounted,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
