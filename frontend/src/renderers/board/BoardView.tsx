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
import { useMemo, useState } from "react";
import type { FieldDef, Item, ObjectType } from "@/domain";
import { type Group, groupItems, useStore } from "@/store";
import { DeleteButton } from "../shared/DeleteButton";
import { draftFromQuery, updateIfLive } from "../shared/draft";
import { EditableText } from "../shared/EditableText";
import { FieldValue } from "../shared/fields";
import { QuickAdd } from "../shared/QuickAdd";
import type { RendererProps } from "../types";

/** Kanban: one column per option of the groupBy select field. Dragging a card sets that field. */
export default function BoardView({ view, type, items }: RendererProps) {
  const store = useStore();
  const field = type.fields.find((f) => f.key === view.groupBy);
  const groups = useMemo(
    () => (field ? groupItems(items, field.key, field.options) : []),
    [items, field],
  );
  const cardFields = useMemo(
    () =>
      view.fields
        .filter((key) => key !== view.groupBy)
        .map((key) => type.fields.find((f) => f.key === key))
        .filter((f): f is FieldDef => f !== undefined),
    [view.fields, view.groupBy, type.fields],
  );
  const draft = useMemo(() => draftFromQuery(view.query, type), [view.query, type]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  if (!field) return null;
  const dragging = draggingId ? items.find((i) => i.id === draggingId) : undefined;

  function onDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const target = event.over?.data.current as { group: string | null } | undefined;
    const item = store.item(String(event.active.id));
    if (!target || !item || !field) return;
    if ((item.data[field.key] ?? null) === target.group) return;
    updateIfLive(store, item.id, { data: { [field.key]: target.group } });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => setDraggingId(String(event.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggingId(null)}
    >
      <div className="flex h-full gap-3 overflow-x-auto p-3">
        {groups.map((group) => (
          <Column
            key={group.key ?? "__none"}
            group={group}
            type={type}
            cardFields={cardFields}
            onCreate={(title) =>
              store.create({
                type: type.key,
                title,
                data: { ...draft, [field.key]: group.key },
              })
            }
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {dragging ? <CardBody item={dragging} type={type} cardFields={cardFields} lifted /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  group,
  type,
  cardFields,
  onCreate,
}: {
  group: Group;
  type: ObjectType;
  cardFields: FieldDef[];
  onCreate: (title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `group:${group.key ?? ""}`,
    data: { group: group.key },
  });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${group.label}, ${group.items.length} items`}
      className={clsx(
        "flex w-72 shrink-0 flex-col rounded-lg bg-subtle transition-colors",
        isOver && "ring-2 ring-[color:var(--accent)]",
      )}
    >
      <header className="flex items-center gap-2 px-3 pb-1 pt-2.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: group.color ?? "var(--muted)" }}
          aria-hidden
        />
        <h3 className="flex-1 truncate text-xs font-semibold uppercase tracking-wide text-muted">
          {group.label}
        </h3>
        <span className="text-xs tabular-nums text-muted">{group.items.length}</span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-1 pt-1">
        {group.items.map((item) => (
          <Card key={item.id} item={item} type={type} cardFields={cardFields} />
        ))}
      </div>
      {group.key !== null && (
        <div className="p-1.5">
          <QuickAdd label={`Add ${type.label.toLowerCase()}`} onCreate={onCreate} />
        </div>
      )}
    </section>
  );
}

function Card({ item, type, cardFields }: { item: Item; type: ObjectType; cardFields: FieldDef[] }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-roledescription="draggable card"
      className={clsx("cursor-grab touch-none outline-none", isDragging && "opacity-40")}
    >
      <CardBody item={item} type={type} cardFields={cardFields} />
    </div>
  );
}

function CardBody({
  item,
  type,
  cardFields,
  lifted = false,
}: {
  item: Item;
  type: ObjectType;
  cardFields: FieldDef[];
  lifted?: boolean;
}) {
  const store = useStore();
  return (
    <article
      className={clsx(
        "group rounded border border-line bg-surface p-2.5 shadow-sm transition-shadow hover:shadow",
        lifted && "rotate-1 shadow-xl",
      )}
    >
      <div className="flex items-start gap-1">
        <EditableText
          value={item.title}
          ariaLabel={`${type.label} title`}
          onSave={(title) => updateIfLive(store, item.id, { title })}
          className="flex-1 text-sm font-medium leading-snug"
        />
        <DeleteButton id={item.id} title={item.title} />
      </div>
      {cardFields.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {cardFields.map((field) => (
            <FieldValue key={field.key} item={item} field={field} />
          ))}
        </div>
      )}
    </article>
  );
}
