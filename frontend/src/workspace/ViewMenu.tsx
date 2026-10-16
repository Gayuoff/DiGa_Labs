import { clsx } from "clsx";
import { Check, Ellipsis, type LucideIcon, Pencil, Trash } from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";
import type { View } from "@/domain";
import { Button } from "@/design/Button";
import { Popover } from "@/renderers/shared/Popover";
import { displayChoices, removeViewFromPage, setDisplay } from "@/spec/ops";
import { DISPLAY_ICONS, DISPLAY_LABELS } from "./displays";
import { useEditSpec } from "./editSpec";
import { useSpec } from "./spec";

interface ViewMenuProps {
  view: View;
  pageKey: string;
  onRename: () => void;
  className?: string;
}

/** A view's options: rename, show as another display, remove from the page. */
export function ViewMenu({ view, pageKey, onRename, className }: ViewMenuProps) {
  const spec = useSpec();
  const edit = useEditSpec();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);
  const label = `${view.title} options`;

  return (
    <>
      <Button
        icon
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        className={className}
        onClick={(event) => setAnchor(anchor ? null : event.currentTarget)}
      >
        <Ellipsis size={15} />
      </Button>
      {anchor && (
        <Popover anchor={anchor} onClose={close}>
          <div role="menu" aria-label={label} className="w-56">
            <MenuItem
              icon={Pencil}
              onSelect={() => {
                close();
                onRename();
              }}
            >
              Rename
            </MenuItem>
            <p className="px-2.5 pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              Show as
            </p>
            {displayChoices(spec, view.query.type, view).map((choice) => (
              <MenuItem
                key={choice.display}
                icon={DISPLAY_ICONS[choice.display]}
                checked={choice.display === view.display}
                disabled={Boolean(choice.unavailable)}
                hint={choice.unavailable}
                onSelect={() => {
                  close();
                  if (choice.display !== view.display) {
                    edit((s) => setDisplay(s, view.key, choice.display));
                  }
                }}
              >
                {DISPLAY_LABELS[choice.display]}
              </MenuItem>
            ))}
            <div className="my-1 border-t border-line" />
            <MenuItem
              icon={Trash}
              danger
              onSelect={() => {
                close();
                edit((s) => removeViewFromPage(s, pageKey, view.key), `Removed “${view.title}”`);
              }}
            >
              Remove from page
            </MenuItem>
          </div>
        </Popover>
      )}
    </>
  );
}

interface MenuItemProps {
  icon: LucideIcon;
  onSelect: () => void;
  children: ReactNode;
  checked?: boolean;
  disabled?: boolean;
  danger?: boolean;
  hint?: string;
}

function MenuItem({ icon: ItemIcon, onSelect, children, checked, disabled, danger, hint }: MenuItemProps) {
  return (
    <button
      type="button"
      role={checked === undefined ? "menuitem" : "menuitemradio"}
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={clsx(
        "flex w-full items-start gap-2.5 rounded-sm px-2.5 py-1.5 text-left text-sm",
        "hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
        danger ? "text-danger" : "text-ink",
      )}
    >
      <ItemIcon size={15} aria-hidden className="mt-0.5 shrink-0 text-muted" />
      <span className="flex-1">
        {children}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      {checked && <Check size={15} aria-hidden className="mt-0.5 shrink-0 text-accent" />}
    </button>
  );
}
