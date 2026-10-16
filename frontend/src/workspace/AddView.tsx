import { clsx } from "clsx";
import { Plus } from "lucide-react";
import { type FormEvent, useCallback, useMemo, useState } from "react";
import type { Display } from "@/domain";
import { Button } from "@/design/Button";
import { Popover } from "@/renderers/shared/Popover";
import { addView, displayChoices } from "@/spec/ops";
import { DISPLAY_ICONS, DISPLAY_LABELS } from "./displays";
import { useEditSpec } from "./editSpec";
import { useSpec } from "./spec";

/** "Add view" button with its form: name, which items it shows, and how to show them. */
export function AddViewButton({ pageKey, primary = false }: { pageKey: string; primary?: boolean }) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const close = useCallback(() => setAnchor(null), []);
  return (
    <>
      <Button
        variant={primary ? "primary" : "ghost"}
        aria-haspopup="dialog"
        aria-expanded={anchor !== null}
        onClick={(event) => setAnchor(anchor ? null : event.currentTarget)}
      >
        <Plus size={15} /> Add view
      </Button>
      {anchor && (
        <Popover anchor={anchor} onClose={close} className="w-80 p-3">
          <AddViewForm pageKey={pageKey} onDone={close} />
        </Popover>
      )}
    </>
  );
}

function AddViewForm({ pageKey, onDone }: { pageKey: string; onDone: () => void }) {
  const spec = useSpec();
  const edit = useEditSpec();
  const [title, setTitle] = useState("");
  const [typeKey, setTypeKey] = useState(spec.types[0]?.key ?? "");
  const [picked, setPicked] = useState<Display>("list");
  const choices = useMemo(() => displayChoices(spec, typeKey), [spec, typeKey]);
  const display = choices.some((c) => c.display === picked && !c.unavailable) ? picked : "list";
  const type = spec.types.find((t) => t.key === typeKey);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!type) return;
    const name = title.trim() || `${type.label} ${DISPLAY_LABELS[display].toLowerCase()}`;
    const added = edit((s) => addView(s, pageKey, { title: name, type: type.key, display }).spec);
    if (added) onDone();
  }

  return (
    <form role="dialog" aria-label="Add view" onSubmit={submit} className="space-y-3 text-sm">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted">Name</span>
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={type ? `${type.label} ${DISPLAY_LABELS[display].toLowerCase()}` : "View name"}
          className="w-full rounded border border-line bg-canvas px-2.5 py-1.5 outline-none focus:border-[color:var(--accent)]"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted">Shows</span>
        <select
          value={typeKey}
          onChange={(event) => setTypeKey(event.target.value)}
          className="w-full rounded border border-line bg-canvas px-2 py-1.5 outline-none focus:border-[color:var(--accent)]"
        >
          {spec.types.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="space-y-1">
        <legend className="text-xs font-medium text-muted">As</legend>
        <div role="radiogroup" aria-label="Display" className="grid grid-cols-3 gap-1.5">
          {choices.map((choice) => {
            const ChoiceIcon = DISPLAY_ICONS[choice.display];
            const selected = choice.display === display;
            return (
              <button
                key={choice.display}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={Boolean(choice.unavailable)}
                title={choice.unavailable}
                onClick={() => setPicked(choice.display)}
                className={clsx(
                  "flex flex-col items-center gap-1 rounded border px-1 py-2 text-xs transition-colors",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  selected
                    ? "border-[color:var(--accent)] bg-accent-soft text-ink"
                    : "border-line text-muted hover:text-ink",
                )}
              >
                <ChoiceIcon size={16} aria-hidden />
                {DISPLAY_LABELS[choice.display]}
              </button>
            );
          })}
        </div>
      </fieldset>
      <Button type="submit" variant="primary" className="w-full">
        Add view
      </Button>
    </form>
  );
}
