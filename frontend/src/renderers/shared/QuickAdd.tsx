import { clsx } from "clsx";
import { Plus } from "lucide-react";
import { useState } from "react";

/** "+ Add" that turns into an input: type a title, Enter adds it and stays open for the next. */
export function QuickAdd({
  label,
  onCreate,
  className,
}: {
  label: string;
  onCreate: (title: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const base = "w-full rounded px-2 py-1.5 text-sm";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(base, "flex items-center gap-1.5 text-muted hover:bg-subtle hover:text-ink", className)}
      >
        <Plus size={14} aria-hidden /> {label}
      </button>
    );
  }
  return (
    <input
      autoFocus
      aria-label={label}
      placeholder={`${label}… (Enter to add, Esc to close)`}
      className={clsx(base, "bg-subtle text-ink outline-none placeholder:text-muted", className)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          const title = event.currentTarget.value.trim();
          if (title) {
            onCreate(title);
            event.currentTarget.value = "";
          }
        } else if (event.key === "Escape") {
          setOpen(false);
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.value.trim()) setOpen(false);
      }}
    />
  );
}
