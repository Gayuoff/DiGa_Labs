import { useMemo } from "react";
import type { FieldDef, Item } from "@/domain";
import { useStore } from "@/store";
import { DeleteButton } from "../shared/DeleteButton";
import { draftFromQuery, updateIfLive } from "../shared/draft";
import { DraftText } from "../shared/DraftText";
import { FieldInput } from "../shared/fields";
import { QuickAdd } from "../shared/QuickAdd";
import { VirtualRows } from "../shared/VirtualRows";
import type { RendererProps } from "../types";

/** A spreadsheet: title plus one column per field, every cell edited in place by field type. */
export default function TableView({ view, type, items }: RendererProps) {
  const store = useStore();
  const columns = useMemo(() => {
    const keys = view.fields.length > 0 ? view.fields : type.fields.map((f) => f.key);
    return keys
      .map((key) => type.fields.find((f) => f.key === key))
      .filter((f): f is FieldDef => f !== undefined);
  }, [view.fields, type.fields]);
  const draft = useMemo(() => draftFromQuery(view.query, type), [view.query, type]);
  const template = `minmax(14rem, 2fr) repeat(${columns.length}, minmax(9rem, 1fr)) 2.5rem`;

  return (
    <div className="h-full overflow-x-auto">
      <div role="table" aria-label={view.title} className="flex h-full min-w-max flex-col">
        <div
          role="row"
          className="grid border-b border-line bg-subtle text-xs font-medium text-muted"
          style={{ gridTemplateColumns: template }}
        >
          <div role="columnheader" className="px-[var(--pad)] py-2">
            Title
          </div>
          {columns.map((field) => (
            <div key={field.key} role="columnheader" className="truncate px-3 py-2">
              {field.label}
            </div>
          ))}
          <div role="columnheader" aria-label="Actions" />
        </div>
        <VirtualRows
          count={items.length}
          estimateSize={41}
          getKey={(index) => items[index]!.id}
          renderRow={(index) => <Row item={items[index]!} columns={columns} template={template} />}
          className="min-h-0 flex-1 overflow-y-auto"
        />
        <div className="border-t border-line p-1.5">
          <QuickAdd
            label={`Add ${type.label.toLowerCase()}`}
            onCreate={(title) => store.create({ type: type.key, title, data: draft })}
          />
        </div>
      </div>
    </div>
  );
}

function Row({ item, columns, template }: { item: Item; columns: FieldDef[]; template: string }) {
  const store = useStore();
  return (
    <div
      role="row"
      className="group grid items-center border-b border-line hover:bg-[color:var(--canvas)]"
      style={{ gridTemplateColumns: template }}
    >
      <div role="cell" className="px-[calc(var(--pad)-0.375rem)] py-1">
        <DraftText
          value={item.title}
          ariaLabel="Title"
          placeholder="Untitled"
          onSave={(title) => updateIfLive(store, item.id, { title })}
          className="w-full rounded bg-transparent px-1.5 py-1 text-sm font-medium outline-none hover:bg-subtle focus:bg-subtle"
        />
      </div>
      {columns.map((field) => (
        <div key={field.key} role="cell" className="min-w-0 px-1.5 py-1">
          <FieldInput item={item} field={field} />
        </div>
      ))}
      <div role="cell" className="flex justify-center">
        <DeleteButton id={item.id} title={item.title} />
      </div>
    </div>
  );
}
