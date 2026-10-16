import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { clsx } from "clsx";
import { addMonths, format, isSameMonth, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { Item } from "@/domain";
import { Button } from "@/design/Button";
import { fieldValue, useStore } from "@/store";
import { dayKey, monthMatrix, withDay } from "../shared/dates";
import { draftFromQuery, updateIfLive } from "../shared/draft";
import type { RendererProps } from "../types";

const VISIBLE_PER_DAY = 3;

/** Month grid: items sit on their date field's day; drag one to another day to reschedule it. */
export default function CalendarView({ view, type, items }: RendererProps) {
  const store = useStore();
  const dateKey = view.dateField ?? "";
  // Built-in dates (created_at, updated_at) can be shown but not moved.
  const field = type.fields.find((f) => f.key === dateKey);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draft = useMemo(() => draftFromQuery(view.query, type), [view.query, type]);
  const weeks = useMemo(() => monthMatrix(month), [month]);
  const byDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const key = dayKey(fieldValue(item, dateKey));
      if (!key) continue;
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return map;
  }, [items, dateKey]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );
  const today = format(new Date(), "yyyy-MM-dd");
  const dragging = draggingId ? items.find((i) => i.id === draggingId) : undefined;

  function onDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const day = (event.over?.data.current as { day: string } | undefined)?.day;
    const item = store.item(String(event.active.id));
    if (!day || !item || !field) return;
    const current = item.data[field.key];
    const next = withDay(current, day, field.type);
    if (next !== current) updateIfLive(store, item.id, { data: { [field.key]: next } });
  }

  function addOn(day: string) {
    if (!field) return;
    store.create({
      type: type.key,
      title: `Untitled ${type.label.toLowerCase()}`,
      data: { ...draft, [field.key]: field.type === "datetime" ? `${day}T09:00` : day },
    });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => setDraggingId(String(event.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggingId(null)}
    >
      <div className="flex h-full min-h-[24rem] flex-col">
        <div className="flex items-center gap-1 px-3 py-2">
          <h3 className="flex-1 text-sm font-medium" aria-live="polite">
            {format(month, "MMMM yyyy")}
          </h3>
          <Button icon aria-label="Previous month" onClick={() => setMonth((m) => addMonths(m, -1))}>
            <ChevronLeft size={16} />
          </Button>
          <Button onClick={() => setMonth(startOfMonth(new Date()))}>Today</Button>
          <Button icon aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight size={16} />
          </Button>
        </div>
        <div
          className="grid min-h-0 flex-1 grid-cols-7 border-t border-line"
          style={{ gridTemplateRows: `auto repeat(${weeks.length}, minmax(4.5rem, 1fr))` }}
        >
          {weeks[0]!.map((day) => (
            <div key={day.toISOString()} className="border-b border-line px-2 py-1 text-[11px] font-medium uppercase text-muted">
              {format(day, "EEE")}
            </div>
          ))}
          {weeks.flat().map((day) => {
            const key = format(day, "yyyy-MM-dd");
            return (
              <DayCell
                key={key}
                day={day}
                dayKey={key}
                items={byDay.get(key) ?? []}
                inMonth={isSameMonth(day, month)}
                isToday={key === today}
                editable={field !== undefined}
                onAdd={() => addOn(key)}
              />
            );
          })}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {dragging ? <Chip item={dragging} lifted /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function DayCell({
  day,
  dayKey: key,
  items,
  inMonth,
  isToday,
  editable,
  onAdd,
}: {
  day: Date;
  dayKey: string;
  items: Item[];
  inMonth: boolean;
  isToday: boolean;
  editable: boolean;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${key}`, data: { day: key }, disabled: !editable });
  const hidden = items.length - VISIBLE_PER_DAY;
  return (
    <div
      ref={setNodeRef}
      aria-label={`${format(day, "EEEE, MMMM d")}, ${items.length} items`}
      className={clsx(
        "group flex min-w-0 flex-col gap-0.5 border-b border-r border-line p-1",
        !inMonth && "bg-subtle",
        isOver && "bg-accent-soft",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={clsx(
            "grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs tabular-nums",
            isToday ? "bg-accent font-semibold text-accent-fg" : inMonth ? "text-ink" : "text-muted",
          )}
        >
          {format(day, "d")}
        </span>
        {editable && (
          <button
            type="button"
            aria-label={`Add on ${format(day, "MMMM d")}`}
            onClick={onAdd}
            className="grid h-5 w-5 place-items-center rounded text-muted opacity-0 hover:bg-subtle hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Plus size={13} />
          </button>
        )}
      </div>
      {items.slice(0, VISIBLE_PER_DAY).map((item) => (
        <DraggableChip key={item.id} item={item} disabled={!editable} />
      ))}
      {hidden > 0 && (
        <span
          className="px-1 text-[11px] text-muted"
          title={items.slice(VISIBLE_PER_DAY).map((i) => i.title).join("\n")}
        >
          +{hidden} more
        </span>
      )}
    </div>
  );
}

function DraggableChip({ item, disabled }: { item: Item; disabled: boolean }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: item.id, disabled });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={clsx("touch-none outline-none", !disabled && "cursor-grab", isDragging && "opacity-40")}
    >
      <Chip item={item} />
    </div>
  );
}

function Chip({ item, lifted = false }: { item: Item; lifted?: boolean }) {
  return (
    <div
      title={item.title}
      className={clsx(
        "truncate rounded-sm border-l-2 border-[color:var(--accent)] bg-accent-soft px-1.5 py-0.5 text-[11px] leading-4 text-ink",
        lifted && "shadow-lg",
      )}
    >
      {item.title || "Untitled"}
    </div>
  );
}
