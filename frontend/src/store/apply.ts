import type { Event, EventType, Item, Origin } from "../domain";

export type Attrs = Record<string, unknown>;
export type ItemData = Item["data"];

/** Merge a partial data patch. `null` removes a key, so "absent" and "null" mean the same thing. */
export function mergeData(data: ItemData, patch: Attrs): ItemData {
  const next = { ...data };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined) delete next[key];
    else next[key] = value;
  }
  return next;
}

/**
 * The item after an update, delete or restore event. Only title, data and deletedAt are
 * event-driven; updatedAt and version are bookkeeping, set on every apply and never undone.
 */
export function patchItem(item: Item, attrs: Attrs, at: string): Item {
  const next: Item = { ...item, updatedAt: at, version: item.version + 1 };
  if ("title" in attrs) next.title = String(attrs.title ?? "");
  if ("data" in attrs) next.data = mergeData(item.data, (attrs.data ?? {}) as Attrs);
  if ("deletedAt" in attrs) next.deletedAt = (attrs.deletedAt as string | null) ?? null;
  return next;
}

export interface EventMeta {
  id: string;
  at: string;
  batchId: string;
  actorId: string;
  origin: Origin;
}

/** The event that undoes `event`. Undo appends inverses; the log itself is never rewritten. */
export function invertEvent(event: Event, meta: EventMeta): Event {
  const base = { ...meta, workspaceId: event.workspaceId, targetId: event.targetId };
  const swap = (type: EventType): Event => ({
    ...base,
    type,
    before: event.after,
    after: event.before,
  });
  switch (event.type) {
    case "item.created":
      return {
        ...base,
        type: "item.deleted",
        before: { deletedAt: null },
        after: { deletedAt: meta.at },
      };
    case "item.updated":
      return swap("item.updated");
    case "item.deleted":
      return swap("item.restored");
    case "item.restored":
      return swap("item.deleted");
    case "relation.created":
      return swap("relation.deleted");
    case "relation.deleted":
      return swap("relation.created");
    case "spec.changed":
      return swap("spec.changed");
  }
}
