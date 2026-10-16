import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Square, icon-only button. Needs an aria-label. */
  icon?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:brightness-110",
  ghost: "text-muted hover:bg-subtle hover:text-ink",
};

export function Button({ variant = "ghost", icon = false, className, type, ...props }: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded text-sm transition-colors",
        "disabled:pointer-events-none disabled:opacity-40",
        icon ? "h-8 w-8" : "h-8 px-2.5",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
