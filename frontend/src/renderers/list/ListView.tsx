import { clsx } from "clsx";
import { useMemo } from "react";
import type { FieldDef, Item } from "@/domain";
import { useStore } from "@/store";
import { DeleteButton } from "../shared/DeleteButton";
import { draftFromQuery, updateIfLive } from "../shared/draft";
import { DraftText } from "../shared/DraftText";
import { FieldValue } from "../shared/fields";
import { QuickAdd } from "../shared/QuickAdd";
import { VirtualRows } from "../shared/VirtualRows";
import type { RendererProps } from "../types";

/** A list of rows: editable titles, field badges, a checkbox when the type has one, quick add. */
export default function ListView({ view, type, items }: RendererProps) {
  const store = useStore();
  const check = type.fields.find((f) => f.type === "checkbox");
  const shown = useMemo(
    () =>
      view.fields
        .filter((key) => key !== check?.key)
        .map((key) => type.fields.find((f) => f.key === key))
        .filter((f): f is FieldDef => f !== undefined),
    [view.fields, check, type.fields],
  );
  const draft = useMemo(() => draftFromQuery(view.query, type), [view.query, type]);

  return (
    <div className="flex h-full flex-col">
      <VirtualRows
        count={items.length}
        estimateSize={40}
        getKey={(index) => items[index]!.id}
        renderRow={(index) => <Row item={items[index]!} check={check} shown={shown} />}
        className="min-h-0 flex-1 overflow-y-auto"
      />
      <div className="border-t border-line p-1.5">
        <QuickAdd
          label={`Add ${type.label.toLowerCase()}`}
          onCreate={(title) => store.create({ type: type.key, title, data: draft })}
        />
      </div>
    </div>
  );
}

function Row({ item, check, shown }: { item: Item; check: FieldDef | undefined; shown: FieldDef[] }) {
  const store = useStore();
  const done = check ? item.data[check.key] === true : false;
  return (
    <div className="group flex items-center gap-2 border-b border-line px-[var(--pad)] py-1">
      {check && (
        <input
          type="checkbox"
          aria-label={`${check.label}: ${item.title}`}
          checked={done}
          onChange={(event) =>
            updateIfLive(store, item.id, { data: { [check.key]: event.target.checked } })
          }
          className="h-4 w-4 shrink-0"
          style={{ accentColor: "var(--accent)" }}
        />
      )}
      <DraftText
        value={item.title}
        ariaLabel="Title"
        placeholder="Untitled"
        onSave={(title) => updateIfLive(store, item.id, { title })}
        className={clsx(
          "min-w-0 flex-1 rounded bg-transparent px-1 py-1 text-sm outline-none focus:bg-subtle",
          done && "text-muted line-through",
        )}
      />
      <div className="flex shrink-0 items-center gap-1.5">
        {shown.map((field) => (
          <FieldValue key={field.key} item={item} field={field} />
        ))}
      </div>
      <DeleteButton id={item.id} title={item.title} />
    </div>
  );
}
