import { clsx } from "clsx";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { Item, ObjectType } from "@/domain";
import { Button } from "@/design/Button";
import { useStore } from "@/store";
import { formatDay } from "../shared/dates";
import { DeleteButton } from "../shared/DeleteButton";
import { draftFromQuery, updateIfLive } from "../shared/draft";
import { DraftText } from "../shared/DraftText";
import { FieldInput } from "../shared/fields";
import type { RendererProps } from "../types";

/** Notes: a list on the left, the selected note's editor on the right. Saves as you type. */
export default function DocView({ view, type, items }: RendererProps) {
  const store = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((i) => i.id === selectedId) ?? items[0];
  const draft = useMemo(() => draftFromQuery(view.query, type), [view.query, type]);

  const create = () => {
    const item = store.create({ type: type.key, title: "", data: draft });
    setSelectedId(item.id);
  };

  return (
    <div className="grid h-full min-h-[22rem] grid-cols-1 md:grid-cols-[15rem_minmax(0,1fr)]">
      <nav aria-label={`${view.title} list`} className="flex min-h-0 flex-col border-b border-line md:border-b-0 md:border-r">
        <div className="p-1.5">
          <Button className="w-full justify-start" onClick={create}>
            <Plus size={14} /> New {type.label.toLowerCase()}
          </Button>
        </div>
        <ul className="max-h-48 min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5 md:max-h-none">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-current={item.id === selected?.id ? "true" : undefined}
                onClick={() => setSelectedId(item.id)}
                className={clsx(
                  "w-full rounded px-2.5 py-2 text-left transition-colors",
                  item.id === selected?.id ? "bg-accent-soft" : "hover:bg-subtle",
                )}
              >
                <span className="block truncate text-sm">{item.title || "Untitled"}</span>
                <span className="text-xs text-muted">{formatDay(item.updatedAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {selected ? (
        <Editor key={selected.id} item={selected} type={type} />
      ) : (
        <div className="grid place-items-center p-6 text-sm text-muted">
          Nothing here yet. Create a {type.label.toLowerCase()} to start writing.
        </div>
      )}
    </div>
  );
}

function Editor({ item, type }: { item: Item; type: ObjectType }) {
  const store = useStore();
  const body = type.fields.find((f) => f.type === "long_text");
  const properties = type.fields.filter((f) => f !== body && f.type !== "file" && f.type !== "ink");
  const bodyValue = body ? item.data[body.key] : undefined;

  return (
    <article className="flex min-h-0 flex-col gap-3 overflow-y-auto p-[var(--pad)]">
      <div className="flex items-start gap-2">
        <DraftText
          value={item.title}
          ariaLabel={`${type.label} title`}
          placeholder="Untitled"
          debounceMs={400}
          onSave={(title) => updateIfLive(store, item.id, { title })}
          className="min-w-0 flex-1 bg-transparent text-xl outline-none placeholder:text-muted"
          style={{ fontWeight: "var(--heading-weight)" }}
        />
        <div className="group">
          <DeleteButton id={item.id} title={item.title} />
        </div>
      </div>
      {properties.length > 0 && (
        <dl className="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1 text-sm">
          {properties.map((field) => (
            <div key={field.key} className="contents">
              <dt className="truncate text-muted">{field.label}</dt>
              <dd className="min-w-0">
                <FieldInput item={item} field={field} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      {body && (
        <DraftText
          multiline
          value={typeof bodyValue === "string" ? bodyValue : ""}
          ariaLabel={body.label}
          placeholder="Start writing…"
          debounceMs={500}
          onSave={(text) => updateIfLive(store, item.id, { data: { [body.key]: text || null } })}
          className="min-h-[12rem] flex-1 resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted"
        />
      )}
    </article>
  );
}
