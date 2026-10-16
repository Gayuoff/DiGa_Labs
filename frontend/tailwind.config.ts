import type { Config } from "tailwindcss";

// Every colour, radius, font and motion value comes from CSS variables set by design/tokens.ts,
// so one stylesheet renders every theme (professional, playful, calm, bold; light and dark).
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        subtle: "var(--subtle)",
        line: "var(--line)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        danger: "var(--danger)",
        accent: {
          DEFAULT: "var(--accent)",
          fg: "var(--accent-fg)",
          soft: "var(--accent-soft)",
        },
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "calc(var(--radius) * 0.6)",
        lg: "calc(var(--radius) * 1.5)",
      },
      fontFamily: {
        sans: "var(--font)",
      },
      transitionDuration: {
        DEFAULT: "var(--motion)",
      },
      transitionTimingFunction: {
        DEFAULT: "var(--ease)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(6px) scale(0.99)" },
          to: { opacity: "1", transform: "none" },
        },
        fade: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        rise: "rise var(--motion) var(--ease) both",
        fade: "fade var(--motion) ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
