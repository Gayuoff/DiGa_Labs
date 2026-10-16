import { clsx } from "clsx";
import { useState } from "react";

interface EditableTextProps {
  value: string;
  onSave: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}

/**
 * Click-to-edit text for draggable cards: shows as text, becomes an input on click. Keys and
 * pointer presses inside it stay inside, so editing never starts a card drag.
 */
export function EditableText({ value, onSave, ariaLabel, placeholder = "Untitled", className }: EditableTextProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        autoFocus
        defaultValue={value}
        aria-label={ariaLabel}
        className={clsx("w-full rounded-sm bg-subtle px-1 outline-none", className)}
        onPointerDown={(event) => event.stopPropagation()}
        onBlur={(event) => {
          setEditing(false);
          const next = event.currentTarget.value.trim();
          if (next !== value) onSave(next);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            event.currentTarget.value = value;
            event.currentTarget.blur();
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={`${ariaLabel}: ${value || placeholder}. Edit`}
      className={clsx("w-full text-left", className)}
      onClick={() => setEditing(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") event.stopPropagation();
      }}
    >
      {value || <span className="text-muted">{placeholder}</span>}
    </button>
  );
}
