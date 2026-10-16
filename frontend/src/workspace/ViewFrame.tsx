import { clsx } from "clsx";
import { GripVertical, Plus } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import type { Item, ObjectType, View } from "@/domain";
import { Button } from "@/design/Button";
import { Icon } from "@/design/Icon";
import { rendererFor } from "@/renderers/registry";
import { draftFromQuery } from "@/renderers/shared/draft";
import { renameView } from "@/spec/ops";
import { fieldValue, useQuery, useStore } from "@/store";
import { DISPLAY_ICONS } from "./displays";
import { useEditSpec } from "./editSpec";
import { useSpec } from "./spec";
import { ViewMenu } from "./ViewMenu";

/** Rows shown by the fallback list, for displays that have no renderer yet. */
const FALLBACK_LIMIT = 100;

interface ViewFrameProps {
  view: View;
  pageKey: string;
  /** In layout edit mode the header is the drag handle and the menu is always shown. */
  editing?: boolean;
}

/** The frame every view sits in: header with title, count, quick add and menu; renderer below. */
export function ViewFrame({ view, pageKey, editing = false }: ViewFrameProps) {
  const spec = useSpec();
  const store = useStore();
  const edit = useEditSpec();
  const items = useQuery(view.query);
  const [renaming, setRenaming] = useState(false);
  const type = spec.types.find((t) => t.key === view.query.type);
  const draft = useMemo(() => (type ? draftFromQuery(view.query, type) : {}), [view.query, type]);
  const DisplayIcon = DISPLAY_ICONS[view.display];
  const Renderer = rendererFor(view.display);

  const add = type
    ? () => store.create({ type: type.key, title: `Untitled ${type.label.toLowerCase()}`, data: draft })
    : undefined;

  const finishRename = (title: string) => {
    setRenaming(false);
    if (title.trim() && title.trim() !== view.title) edit((s) => renameView(s, view.key, title));
  };

  return (
    <div
      className={clsx(
        "group/frame flex h-full flex-col overflow-hidden rounded-lg border bg-surface",
        editing ? "border-[color:var(--accent)] shadow-md" : "border-line",
      )}
    >
      <header
        className={clsx(
          "flex items-center gap-2 border-b border-line py-1.5 pl-[var(--pad)] pr-1.5",
          editing && "sb-drag-handle cursor-move select-none bg-subtle",
        )}
      >
        {editing ? (
          <GripVertical size={15} className="-ml-1 shrink-0 text-muted" aria-hidden />
        ) : (
          <DisplayIcon size={15} className="shrink-0 text-accent" aria-hidden />
        )}
        {renaming ? (
          <input
            autoFocus
            defaultValue={view.title}
            aria-label="View name"
            className="min-w-0 flex-1 rounded-sm bg-canvas px-1 text-sm outline-none"
            onBlur={(event) => finishRename(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                event.currentTarget.value = view.title;
                event.currentTarget.blur();
              }
            }}
          />
        ) : (
          <h2 className="flex-1 truncate text-sm" onDoubleClick={() => setRenaming(true)}>
            {view.title}
          </h2>
        )}
        <span className="rounded-full bg-subtle px-2 text-xs tabular-nums text-muted">
          {items.length}
        </span>
        {type && add && (
          <Button icon aria-label={`New ${type.label.toLowerCase()}`} onClick={add}>
            <Plus size={15} />
          </Button>
        )}
        <ViewMenu
          view={view}
          pageKey={pageKey}
          onRename={() => setRenaming(true)}
          className={clsx(
            !editing &&
              "opacity-0 focus-visible:opacity-100 group-hover/frame:opacity-100 aria-expanded:opacity-100",
          )}
        />
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        {type && Renderer ? (
          <Suspense fallback={<RendererSkeleton />}>
            <Renderer view={view} type={type} items={items} />
          </Suspense>
        ) : (
          <div className="h-full overflow-y-auto">
            <FallbackList items={items} view={view} type={type} onAdd={add} />
          </div>
        )}
      </div>
    </div>
  );
}

function RendererSkeleton() {
  return (
    <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading view">
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-8 animate-pulse rounded bg-subtle" />
      ))}
    </div>
  );
}

/** A plain list for displays without a renderer yet (timeline, gallery, chart, progress). */
function FallbackList({
  items,
  view,
  type,
  onAdd,
}: {
  items: Item[];
  view: View;
  type: ObjectType | undefined;
  onAdd: (() => void) | undefined;
}) {
  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted">
        <p>Nothing here yet</p>
        {type && onAdd && (
          <Button variant="primary" onClick={onAdd}>
            <Plus size={14} /> New {type.label.toLowerCase()}
          </Button>
        )}
      </div>
    );
  }
  return (
    <ul className="divide-y divide-line">
      {items.slice(0, FALLBACK_LIMIT).map((item) => (
        <li key={item.id} className="flex items-center gap-2.5 px-[var(--pad)] py-2 text-sm">
          <Icon name={type?.icon} size={14} className="shrink-0 text-muted" />
          <span className="flex-1 truncate">{item.title || "Untitled"}</span>
          {view.fields.slice(0, 2).map((key) => {
            const value = fieldValue(item, key);
            return value == null || value === "" ? null : (
              <span key={key} className="shrink-0 truncate text-xs text-muted">
                {Array.isArray(value) ? value.join(", ") : String(value)}
              </span>
            );
          })}
        </li>
      ))}
    </ul>
  );
}
