import { clsx } from "clsx";
import { CornerDownLeft, Search } from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/design/Icon";
import { Kbd } from "@/design/Kbd";
import type { Command } from "./commands";
import { fuzzyFilter } from "./fuzzy";

interface CommandPaletteProps {
  open: boolean;
  commands: Command[];
  onClose: () => void;
}

export function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  if (!open) return null;
  return createPortal(<PaletteDialog commands={commands} onClose={onClose} />, document.body);
}

function PaletteDialog({ commands, onClose }: Omit<CommandPaletteProps, "open">) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => fuzzyFilter(commands, query), [commands, query]);
  const current = Math.min(active, results.length - 1);
  const searching = query.trim() !== "";

  // Give focus back to whatever had it before the palette opened.
  useEffect(() => {
    const previous = document.activeElement;
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${current}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [current]);

  function run(index: number) {
    const command = results[index];
    if (!command) return;
    onClose();
    command.run();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = results.length;
    if (event.key === "ArrowDown" && count > 0) {
      event.preventDefault();
      setActive((current + 1) % count);
    } else if (event.key === "ArrowUp" && count > 0) {
      event.preventDefault();
      setActive((current - 1 + count) % count);
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(current);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade items-start justify-center bg-black/40 p-4 pt-[12vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-xl animate-rise overflow-hidden rounded-lg border border-line bg-surface shadow-2xl"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search size={16} className="shrink-0 text-muted" aria-hidden />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls="sb-palette-list"
            aria-activedescendant={current >= 0 ? `sb-command-${current}` : undefined}
            aria-autocomplete="list"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search pages, create items, run commands…"
            className="h-12 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
          />
          <Kbd>esc</Kbd>
        </div>

        <div id="sb-palette-list" role="listbox" ref={listRef} className="max-h-[22rem] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">No matches for “{query}”</p>
          ) : (
            results.map((command, index) => {
              const header = !searching && command.section !== results[index - 1]?.section;
              return (
                <div key={command.id}>
                  {header && (
                    <p className="px-2.5 pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                      {command.section}
                    </p>
                  )}
                  <div
                    id={`sb-command-${index}`}
                    role="option"
                    aria-selected={index === current}
                    data-index={index}
                    onMouseMove={() => setActive(index)}
                    onClick={() => run(index)}
                    className={clsx(
                      "flex cursor-pointer items-center gap-3 rounded px-2.5 py-2 text-sm text-ink",
                      index === current && "bg-accent-soft",
                    )}
                  >
                    <Icon name={command.icon} size={15} className="shrink-0 text-muted" />
                    <span className="flex-1 truncate">{command.title}</span>
                    {searching && <span className="text-xs text-muted">{command.section}</span>}
                    {!searching && command.shortcut && (
                      <span className="flex gap-1">
                        {command.shortcut.map((key) => (
                          <Kbd key={key}>{key}</Kbd>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>
              <CornerDownLeft size={11} aria-hidden />
            </Kbd>
            run
          </span>
        </div>
      </div>
    </div>
  );
}
