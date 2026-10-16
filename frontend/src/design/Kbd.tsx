import { clsx } from "clsx";
import type { ReactNode } from "react";

export const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** The platform's modifier key label: ⌘ on Apple devices, Ctrl elsewhere. */
export const MOD = isMac ? "⌘" : "Ctrl";

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={clsx(
        "inline-flex min-w-5 items-center justify-center rounded-sm border border-line bg-subtle",
        "px-1 font-sans text-[11px] leading-5 text-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
