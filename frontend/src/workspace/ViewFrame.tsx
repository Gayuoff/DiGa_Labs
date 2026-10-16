import {
  Calendar,
  ChartColumn,
  ChartGantt,
  FileText,
  Kanban,
  LayoutGrid,
  List,
  type LucideIcon,
  Plus,
  Table,
  Target,
} from "lucide-react";
import { Suspense, useMemo } from "react";
import type { Display, Item, ObjectType, View } from "@/domain";
import { Button } from "@/design/Button";
import { Icon } from "@/design/Icon";
import { rendererFor } from "@/renderers/registry";
import { draftFromQuery } from "@/renderers/shared/draft";
import { fieldValue, useQuery, useStore } from "@/store";
import { useSpec } from "./spec";

const DISPLAY_ICONS: Record<Display, LucideIcon> = {
  list: List,
  board: Kanban,
  table: Table,
  calendar: Calendar,
  timeline: ChartGantt,
  gallery: LayoutGrid,
  doc: FileText,
  chart: ChartColumn,
  progress: Target,
};

/** Rows shown by the fallback list, for displays that have no renderer yet. */
const FALLBACK_LIMIT = 100;

/** The frame every view sits in: header with title, live count and quick add; renderer below. */
export function ViewFrame({ view }: { view: View }) {
  const spec = useSpec();
  const store = useStore();
  const items = useQuery(view.query);
  const type = spec.types.find((t) => t.key === view.query.type);
  const draft = useMemo(() => (type ? draftFromQuery(view.query, type) : {}), [view.query, type]);
  const DisplayIcon = DISPLAY_ICONS[view.display];
  const Renderer = rendererFor(view.display);

  const add = type
    ? () => store.create({ type: type.key, title: `Untitled ${type.label.toLowerCase()}`, data: draft })
    : undefined;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface">
      <header className="flex items-center gap-2 border-b border-line py-2 pl-[var(--pad)] pr-2">
        <DisplayIcon size={15} className="shrink-0 text-accent" aria-hidden />
        <h2 className="flex-1 truncate text-sm">{view.title}</h2>
        <span className="rounded-full bg-subtle px-2 text-xs tabular-nums text-muted">
          {items.length}
        </span>
        {type && add && (
          <Button icon aria-label={`New ${type.label.toLowerCase()}`} onClick={add}>
            <Plus size={15} />
          </Button>
        )}
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
