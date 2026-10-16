import type { Theme, Tone } from "@/domain";

/** CSS custom properties consumed by tailwind.config.ts and index.css. */
export type TokenVars = Record<`--${string}`, string>;

interface Palette {
  canvas: string;
  surface: string;
  subtle: string;
  line: string;
  ink: string;
  muted: string;
}

interface ToneStyle {
  font: string;
  headingWeight: string;
  motion: string;
  ease: string;
  radiusScale: number;
  light: Palette;
  dark: Palette;
}

const SANS = `"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
const ROUNDED = `ui-rounded, "SF Pro Rounded", "Nunito", "Segoe UI", system-ui, sans-serif`;

const NEUTRAL_LIGHT: Palette = {
  canvas: "#f7f8fa",
  surface: "#ffffff",
  subtle: "#f1f3f6",
  line: "#e3e6eb",
  ink: "#111827",
  muted: "#6b7280",
};
const NEUTRAL_DARK: Palette = {
  canvas: "#0d0f13",
  surface: "#15181e",
  subtle: "#1c2028",
  line: "#2a2f39",
  ink: "#e8eaee",
  muted: "#9aa1ad",
};

// Tints mix the accent into the background, so a playful workspace feels coloured, not grey.
const tint = (base: string, percent: number) =>
  `color-mix(in oklab, var(--accent) ${percent}%, ${base})`;

const TONES: Record<Tone, ToneStyle> = {
  professional: {
    font: SANS,
    headingWeight: "600",
    motion: "150ms",
    ease: "cubic-bezier(0.2, 0, 0, 1)",
    radiusScale: 1,
    light: NEUTRAL_LIGHT,
    dark: NEUTRAL_DARK,
  },
  playful: {
    font: ROUNDED,
    headingWeight: "700",
    motion: "240ms",
    ease: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    radiusScale: 1.6,
    light: { ...NEUTRAL_LIGHT, canvas: tint("#fbfaf8", 7), subtle: tint("#f4f2ee", 10) },
    dark: { ...NEUTRAL_DARK, canvas: tint("#0e0d12", 8), subtle: tint("#1d1b24", 12) },
  },
  calm: {
    font: SANS,
    headingWeight: "500",
    motion: "280ms",
    ease: "cubic-bezier(0.4, 0, 0.2, 1)",
    radiusScale: 1.25,
    light: { ...NEUTRAL_LIGHT, canvas: "#f6f7f5", line: "#eceee9", ink: "#2f3437", muted: "#868c90" },
    dark: { ...NEUTRAL_DARK, canvas: "#101312", line: "#252a28", ink: "#d6dbd8", muted: "#8b938f" },
  },
  bold: {
    font: SANS,
    headingWeight: "800",
    motion: "120ms",
    ease: "cubic-bezier(0.2, 0, 0, 1)",
    radiusScale: 0.75,
    light: { ...NEUTRAL_LIGHT, line: "#c9ced6", ink: "#05070a", muted: "#4b5563" },
    dark: { ...NEUTRAL_DARK, line: "#3d4452", ink: "#ffffff", muted: "#b4bac4" },
  },
};

const RADIUS_PX: Record<Theme["radius"], number> = { none: 0, sm: 4, md: 8, lg: 14 };
const DENSITY: Record<Theme["density"], number> = { compact: 0.85, comfortable: 1, spacious: 1.2 };

/** Spacing multiplier for a density. --pad is this many rem, --row-h 2.25x it. */
export function densityScale(density: Theme["density"]): number {
  return DENSITY[density];
}

/** Every visual token for a theme. Pure, so the same spec always looks the same. */
export function themeVars(theme: Theme, dark: boolean): TokenVars {
  const tone = TONES[theme.tone];
  const palette = dark ? tone.dark : tone.light;
  const density = DENSITY[theme.density];
  return {
    "--canvas": palette.canvas,
    "--surface": palette.surface,
    "--subtle": palette.subtle,
    "--line": palette.line,
    "--ink": palette.ink,
    "--muted": palette.muted,
    "--danger": dark ? "#f87171" : "#dc2626",
    "--accent": theme.accent,
    "--accent-fg": accentForeground(theme.accent),
    "--accent-soft": `color-mix(in oklab, var(--accent) ${dark ? 22 : 14}%, var(--surface))`,
    "--radius": `${Math.round(RADIUS_PX[theme.radius] * tone.radiusScale)}px`,
    "--font": tone.font,
    "--heading-weight": tone.headingWeight,
    "--motion": tone.motion,
    "--ease": tone.ease,
    "--pad": `${density}rem`,
    "--row-h": `${(2.25 * density).toFixed(3)}rem`,
  };
}

/** Readable text colour on top of the accent (WCAG relative luminance). */
export function accentForeground(hex: string): string {
  const channel = (offset: number) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return luminance > 0.4 ? "#0b0d10" : "#ffffff";
}
