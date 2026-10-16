import { Check } from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";
import { Badge } from "./Badge";
import { Popover } from "./Popover";

export interface PickerOption {
  key: string;
  label: string;
  color: string | null;
}

interface OptionPickerProps {
  options: PickerOption[];
  value: string[];
  multi: boolean;
  onChange: (next: string[]) => void;
  ariaLabel: string;
  placeholder?: string;
}

/** Select and multi-select editing: shows the chosen badges, picks from a popover list. */
export function OptionPicker({
  options,
  value,
  multi,
  onChange,
  ariaLabel,
  placeholder = "Empty",
}: OptionPickerProps) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);
  const chosen = options.filter((o) => value.includes(o.key));

  const pick = (key: string) => {
    if (multi) {
      onChange(value.includes(key) ? value.filter((v) => v !== key) : [...value, key]);
    } else {
      onChange([key]);
      close();
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={anchor !== null}
        onClick={(event) => setAnchor(anchor ? null : event.currentTarget)}
        className="flex min-h-7 w-full flex-wrap items-center gap-1 rounded px-1.5 py-1 text-left hover:bg-subtle"
      >
        {chosen.length > 0 ? (
          chosen.map((o) => (
            <Badge key={o.key} color={o.color}>
              {o.label}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted">{placeholder}</span>
        )}
      </button>
      {anchor && (
        <Popover anchor={anchor} onClose={close}>
          <div
            role="listbox"
            aria-label={ariaLabel}
            aria-multiselectable={multi}
            className="max-h-64 min-w-40 overflow-y-auto"
          >
            {!multi && (
              <OptionRow
                selected={value.length === 0}
                onSelect={() => {
                  onChange([]);
                  close();
                }}
              >
                <span className="text-xs text-muted">None</span>
              </OptionRow>
            )}
            {options.map((o) => (
              <OptionRow key={o.key} selected={value.includes(o.key)} onSelect={() => pick(o.key)}>
                <Badge color={o.color}>{o.label}</Badge>
              </OptionRow>
            ))}
          </div>
        </Popover>
      )}
    </>
  );
}

function OptionRow({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-subtle"
    >
      <Check size={14} aria-hidden className={selected ? "text-accent" : "invisible"} />
      {children}
    </button>
  );
}
