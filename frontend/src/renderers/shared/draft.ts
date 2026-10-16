import type { ObjectType, Query } from "@/domain";
import type { ItemPatch, WorkspaceStore } from "@/store";

const BUILTINS = new Set(["title", "created_at", "updated_at"]);

/**
 * Data a new item needs to show up in the view it was created from: a note added to an "Inbox"
 * view (tags contains inbox) gets the inbox tag instead of vanishing on creation.
 */
export function draftFromQuery(query: Query, type: ObjectType): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const conditions = query.match === "all" ? query.where : query.where.slice(0, 1);
  for (const condition of conditions) {
    if (BUILTINS.has(condition.field)) continue;
    const field = type.fields.find((f) => f.key === condition.field);
    if (!field) continue;
    const multi = field.type === "multi_select";
    const { op, value } = condition;
    if (op === "eq") {
      data[field.key] = value;
    } else if (op === "contains" && multi) {
      const existing = data[field.key];
      data[field.key] = [...(Array.isArray(existing) ? existing : []), value];
    } else if (op === "in" && Array.isArray(value) && value.length > 0) {
      data[field.key] = multi ? [value[0]] : value[0];
    }
  }
  return data;
}

/** Update unless the item was deleted meanwhile (e.g. a pending edit flushing after a delete). */
export function updateIfLive(store: WorkspaceStore, id: string, patch: ItemPatch): void {
  const item = store.item(id);
  if (item && item.deletedAt === null) store.update(id, patch);
}
