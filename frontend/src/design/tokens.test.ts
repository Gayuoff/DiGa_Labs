import { describe, expect, it } from "vitest";
import type { Theme } from "@/domain";
import { accentForeground, themeVars } from "./tokens";

const base: Theme = {
  accent: "#6366f1",
  tone: "professional",
  density: "comfortable",
  radius: "md",
  mode: "system",
};

describe("themeVars", () => {
  it("gives every tone its own personality", () => {
    const pro = themeVars(base, false);
    const playful = themeVars({ ...base, tone: "playful" }, false);
    expect(parseInt(playful["--radius"]!)).toBeGreaterThan(parseInt(pro["--radius"]!));
    expect(playful["--ease"]).not.toBe(pro["--ease"]);
    expect(playful["--canvas"]).toContain("var(--accent)");
    expect(themeVars({ ...base, tone: "bold" }, false)["--heading-weight"]).toBe("800");
  });

  it("switches palettes for dark mode", () => {
    expect(themeVars(base, true)["--canvas"]).not.toBe(themeVars(base, false)["--canvas"]);
  });

  it("scales spacing with density and keeps square corners square", () => {
    const compact = themeVars({ ...base, density: "compact" }, false);
    const spacious = themeVars({ ...base, density: "spacious" }, false);
    expect(parseFloat(compact["--row-h"]!)).toBeLessThan(parseFloat(spacious["--row-h"]!));
    expect(themeVars({ ...base, radius: "none", tone: "playful" }, false)["--radius"]).toBe("0px");
  });
});

describe("accentForeground", () => {
  it("picks readable text for light and dark accents", () => {
    expect(accentForeground("#facc15")).toBe("#0b0d10");
    expect(accentForeground("#ffffff")).toBe("#0b0d10");
    expect(accentForeground("#1e3a8a")).toBe("#ffffff");
    expect(accentForeground("#6366f1")).toBe("#ffffff");
  });
});
