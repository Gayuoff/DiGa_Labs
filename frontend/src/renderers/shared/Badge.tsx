import { clsx } from "clsx";
import type { CSSProperties, ReactNode } from "react";

/** A small label. Coloured options tint the badge; uncoloured ones stay neutral. */
export function Badge({ color, children }: { color?: string | null; children: ReactNode }) {
  const style: CSSProperties | undefined = color
    ? {
        backgroundColor: `color-mix(in oklab, ${color} 18%, var(--surface))`,
        color: `color-mix(in oklab, ${color} 72%, var(--ink))`,
      }
    : undefined;
  return (
    <span
      style={style}
      className={clsx(
        "inline-flex max-w-full items-center truncate rounded-sm px-1.5 py-0.5 text-xs font-medium leading-4",
        !color && "bg-subtle text-muted",
      )}
    >
      {children}
    </span>
  );
}
