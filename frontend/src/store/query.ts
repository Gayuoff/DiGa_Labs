import type { Condition, Item, Option, Query, Sort } from "../domain";
import { jsonEqual } from "./json";

const BUILTINS: Record<string, (item: Item) => unknown> = {
  title: (item) => item.title,
  created_at: (item) => item.createdAt,
  updated_at: (item) => item.updatedAt,
};

/** A query with defaults filled in, so callers only state what they care about. */
export function makeQuery(type: string, rest: Partial<Omit<Query, "type">> = {}): Query {
  return { type, where: [], match: "all", sort: [], limit: null, ...rest };
}

export function fieldValue(item: Item, key: string): unknown {
  const builtin = BUILTINS[key];
  return builtin ? builtin(item) : item.data[key];
}

export function isEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** The items a view shows: live items of the query's type, filtered, sorted and limited. */
export function runQuery(items: Iterable<Item>, query: Query): Item[] {
  const result: Item[] = [];
  for (const item of items) {
    if (item.type !== query.type || item.deletedAt !== null) continue;
    if (query.where.length === 0) {
      result.push(item);
      continue;
    }
    const hit =
      query.match === "all"
        ? query.where.every((c) => matches(item, c))
        : query.where.some((c) => matches(item, c));
    if (hit) result.push(item);
  }
  result.sort((a, b) => compareItems(a, b, query.sort));
  return query.limit === null ? result : result.slice(0, query.limit);
}

export function matches(item: Item, condition: Condition): boolean {
  const actual = fieldValue(item, condition.field) ?? null;
  const expected = condition.value;
  switch (condition.op) {
    case "eq":
      return jsonEqual(actual, expected);
    case "neq":
      return !jsonEqual(actual, expected);
    case "in":
      return Array.isArray(expected) && overlaps(actual, expected);
    case "not_in":
      return !(Array.isArray(expected) && overlaps(actual, expected));
    case "contains":
      return contains(actual, expected);
    case "gt":
      return ordered(actual, expected, (d) => d > 0);
    case "gte":
      return ordered(actual, expected, (d) => d >= 0);
    case "lt":
      return ordered(actual, expected, (d) => d < 0);
    case "lte":
      return ordered(actual, expected, (d) => d <= 0);
    case "is_empty":
      return isEmpty(actual);
    case "is_not_empty":
      return !isEmpty(actual);
  }
}

function overlaps(actual: unknown, expected: unknown[]): boolean {
  const values = Array.isArray(actual) ? actual : [actual];
  return values.some((value) => expected.some((e) => jsonEqual(value, e)));
}

function contains(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(actual)) return actual.some((value) => jsonEqual(value, expected));
  if (typeof actual === "string" && typeof expected === "string") {
    return actual.toLowerCase().includes(expected.toLowerCase());
  }
  return false;
}

/** Range comparison: numbers with numbers, strings (incl. ISO dates) with strings. */
function ordered(actual: unknown, expected: unknown, accept: (diff: number) => boolean): boolean {
  if (typeof actual === "number" && typeof expected === "number") return accept(actual - expected);
  if (typeof actual === "string" && typeof expected === "string") {
    return accept(actual < expected ? -1 : actual > expected ? 1 : 0);
  }
  return false;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** Empty values always sort last, whatever the direction; ties fall back to creation order. */
function compareItems(a: Item, b: Item, sorts: Sort[]): number {
  for (const sort of sorts) {
    const va = fieldValue(a, sort.field);
    const vb = fieldValue(b, sort.field);
    const emptyA = isEmpty(va);
    const emptyB = isEmpty(vb);
    if (emptyA || emptyB) {
      if (emptyA && emptyB) continue;
      return emptyA ? 1 : -1;
    }
    const diff = compareValues(va, vb);
    if (diff !== 0) return sort.dir === "desc" ? -diff : diff;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "string" && typeof b === "string") return collator.compare(a, b);
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return collator.compare(JSON.stringify(a), JSON.stringify(b));
}

export interface Group {
  /** The option key, or null for items with no (or an unknown) value. */
  key: string | null;
  label: string;
  color: string | null;
  items: Item[];
}

/** Board columns: one group per option in option order, plus "No value" when needed. */
export function groupItems(items: Item[], field: string, options: Option[]): Group[] {
  const groups: Group[] = options.map((o) => ({ key: o.key, label: o.label, color: o.color, items: [] }));
  const byKey = new Map(groups.map((g) => [g.key, g]));
  const none: Group = { key: null, label: "No value", color: null, items: [] };
  for (const item of items) {
    const value = fieldValue(item, field);
    const group = (typeof value === "string" && byKey.get(value)) || none;
    group.items.push(item);
  }
  return none.items.length > 0 ? [...groups, none] : groups;
}
