"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import type { ThemeMode, TeamThemeSeed } from "@/lib/theme/clubTheme";
import { resolveThemeSeed } from "@/lib/theme/clubTheme";

type ThemeValue = {
  mode: ThemeMode;
  primaryColor: string;
  secondaryColor: string;
  leaguePrimaryColor: string;
  leagueSecondaryColor: string;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

const STORAGE_KEY = "ea-fc-theme-mode";

function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
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
  mode: ThemeMode;
  primary: string;
  secondary: string;
  leaguePrimary: string;
  leagueSecondary: string;
}) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--theme-primary", params.primary);
  root.style.setProperty("--theme-secondary", params.secondary);
  root.style.setProperty("--theme-league-primary", params.leaguePrimary);
  root.style.setProperty("--theme-league-secondary", params.leagueSecondary);

  root.style.setProperty("--theme-background", params.mode === "dark" ? "#020817" : "#f4f7f5");
  root.style.setProperty("--theme-surface", params.mode === "dark" ? "#0f172a" : "#ffffff");
  root.style.setProperty("--theme-card", params.mode === "dark" ? "#111827" : "#ffffff");
  root.style.setProperty("--theme-card-alt", params.mode === "dark" ? "#1e293b" : "#f1f5f9");
  root.style.setProperty("--theme-foreground", params.mode === "dark" ? "#e2e8f0" : "#102a43");
  root.style.setProperty("--theme-muted", params.mode === "dark" ? "#94a3b8" : "#475569");
  root.style.setProperty(
    "--theme-muted-soft",
    params.mode === "dark" ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.08)"
  );
  root.style.setProperty(
    "--theme-border",
    params.mode === "dark" ? "rgba(148, 163, 184, 0.21)" : "rgba(15, 23, 42, 0.08)"
  );
  root.style.setProperty(
    "--theme-shadow",
    params.mode === "dark" ? "rgba(15, 23, 42, 0.7)" : "rgba(15, 23, 42, 0.08)"
  );
  root.style.setProperty(
    "--theme-on-accent",
    params.mode === "dark" ? "#022c22" : "#ffffff"
  );
  root.style.setProperty(
    "--theme-accent",
    params.mode === "dark" ? "#4ade80" : "#16a34a"
  );
  root.style.setProperty(
    "--theme-accent-soft",
    params.mode === "dark" ? "rgba(74, 222, 128, 0.16)" : "rgba(22, 163, 74, 0.12)"
  );

  const onPrimary = pickOnColor(params.primary);
  root.style.setProperty("--theme-on-gradient", onPrimary);
  root.style.setProperty("--theme-on-gradient-strong", onPrimary);
  root.style.setProperty("--theme-on-primary", onPrimary);

  root.style.setProperty("color-scheme", params.mode === "dark" ? "dark" : "light");
  root.classList.toggle("dark", params.mode === "dark");
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
  const [mode, setMode] = useState<ThemeMode>(getInitialMode);
  const [primaryColor, setPrimaryColor] = useState(resolved.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(resolved.secondaryColor);
  const [leaguePrimaryColor, setLeaguePrimaryColor] = useState(resolved.leaguePrimaryColor);
  const [leagueSecondaryColor, setLeagueSecondaryColor] = useState(
    resolved.leagueSecondaryColor
  );

  useLayoutEffect(() => {
    applyThemeVars({
      mode,
      primary: primaryColor,
      secondary: secondaryColor,
      leaguePrimary: leaguePrimaryColor,
      leagueSecondary: leagueSecondaryColor,
    });
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode, primaryColor, secondaryColor, leaguePrimaryColor, leagueSecondaryColor]);

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

  const toggleMode = useCallback(() => {
    setMode((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({
      mode,
      primaryColor,
      secondaryColor,
      leaguePrimaryColor,
      leagueSecondaryColor,
      toggleMode,
      setMode,
    }),
    [
      mode,
      primaryColor,
      secondaryColor,
      leaguePrimaryColor,
      leagueSecondaryColor,
      toggleMode,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
