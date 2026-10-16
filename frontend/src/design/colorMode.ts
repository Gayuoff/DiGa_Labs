import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { Theme } from "@/domain";
import { themeVars } from "./tokens";

export type ColorMode = Theme["mode"];

const STORAGE_KEY = "sb:color-mode";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readStoredMode(): ColorMode | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" || value === "system" ? value : null;
  } catch {
    return null;
  }
}

function subscribeSystemDark(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const systemPrefersDark = () => window.matchMedia(DARK_QUERY).matches;

/**
 * The person's light/dark choice. The spec's theme sets the default; a choice made here is a
 * per-device preference, so it is kept in this browser, not in the shared spec.
 */
export function useColorMode(specDefault: ColorMode) {
  const [mode, setModeState] = useState<ColorMode>(() => readStoredMode() ?? specDefault);
  const systemDark = useSyncExternalStore(subscribeSystemDark, systemPrefersDark);
  const dark = mode === "dark" || (mode === "system" && systemDark);

  const setMode = useCallback((next: ColorMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the choice still applies for this session.
    }
  }, []);

  return { mode, dark, setMode };
}

/** Writes the theme tokens onto <html>, so portals and overlays inherit them too. */
export function useApplyTheme(theme: Theme, dark: boolean): void {
  useEffect(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(themeVars(theme, dark))) {
      root.style.setProperty(name, value);
    }
    root.style.colorScheme = dark ? "dark" : "light";
    root.dataset.tone = theme.tone;
  }, [theme, dark]);
}
