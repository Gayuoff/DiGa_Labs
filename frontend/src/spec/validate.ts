/**
 * Spec and item-data validation, mirroring the backend (backend/app/domain/spec.py and
 * item_data.py) message for message. Both sides run the cases in shared/fixtures/, so they agree.
 */
import type { Condition, FieldDef, FieldType, Journey, ObjectType, Page, Spec, View } from "@/domain";

export const GRID_COLUMNS = 12;

const BUILTIN_FIELDS: Record<string, FieldType> = {
  title: "text",
  created_at: "datetime",
  updated_at: "datetime",
};
const RESERVED_FIELD_KEYS = new Set([
  ...Object.keys(BUILTIN_FIELDS),
  "id",
  "type",
  "data",
  "deleted_at",
  "created_by",
  "workspace_id",
  "version",
  "sample",
]);
const CHOICE_TYPES = new Set<FieldType>(["select", "multi_select"]);
const NEEDS_DATE = new Set<View["display"]>(["calendar", "timeline"]);
export const KEY_PATTERN = /^[a-z][a-z0-9_]{0,47}$/;

/** The type of a field on an item type, including the built-in title and timestamps. */
export function fieldType(type: ObjectType, key: string): FieldType | undefined {
  return BUILTIN_FIELDS[key] ?? (type.fields ?? []).find((f) => f.key === key)?.type;
}

/** Every problem with a spec. Empty means it is valid and can always be rendered. */
export function checkSpec(spec: Spec): string[] {
  const errors: string[] = [];

  for (const type of spec.types) errors.push(...checkType(type));
  for (const view of spec.views) errors.push(...checkViewShape(view));
  for (const page of spec.pages) errors.push(...checkPage(page));
  for (const rule of spec.rules ?? []) {
    for (const c of rule.when.where ?? []) errors.push(...checkCondition(c));
  }
  if (spec.journey) errors.push(...checkJourney(spec.journey));

  const types = index(spec.types, "type", errors);
  const views = index(spec.views, "view", errors);
  index(spec.pages, "page", errors);
  index(spec.rules ?? [], "rule", errors);

  for (const type of spec.types) {
    for (const field of type.fields ?? []) {
      if (field.targetType && !types.has(field.targetType)) {
        errors.push(`type '${type.key}' field '${field.key}': unknown type '${field.targetType}'`);
      }
    }
  }
  for (const view of spec.views) errors.push(...checkViewReferences(view, types));
  for (const page of spec.pages) {
    for (const block of page.blocks ?? []) {
      if (!views.has(block.view)) errors.push(`page '${page.key}': unknown view '${block.view}'`);
    }
  }
  for (const rule of spec.rules ?? []) {
    const where = `rule '${rule.key}'`;
    const conditions = rule.when.where ?? [];
    if (!rule.when.type) {
      if (conditions.length > 0) errors.push(`${where}: conditions need a type`);
      continue;
    }
    const type = types.get(rule.when.type);
    if (!type) {
      errors.push(`${where}: unknown type '${rule.when.type}'`);
      continue;
    }
    errors.push(...missingFields(where, type, conditions.map((c) => c.field)));
  }
  for (const phase of spec.journey?.phases ?? []) {
    for (const key of phase.views ?? []) {
      if (!views.has(key)) errors.push(`journey phase '${phase.key}': unknown view '${key}'`);
    }
  }
  return errors;
}

function index<T extends { key: string }>(entries: T[], label: string, errors: string[]) {
  const map = new Map<string, T>();
  for (const entry of entries) {
    if (!KEY_PATTERN.test(entry.key)) errors.push(`invalid ${label} key '${entry.key}'`);
    if (map.has(entry.key)) errors.push(`duplicate ${label} key '${entry.key}'`);
    map.set(entry.key, entry);
  }
  return map;
}

function checkType(type: ObjectType): string[] {
  const errors: string[] = [];
  const fields = type.fields ?? [];
  const keys = fields.map((f) => f.key);
  if (new Set(keys).size !== keys.length) errors.push(`type '${type.key}': duplicate field keys`);
  for (const field of fields) errors.push(...checkField(field));
  return errors;
}

function checkField(field: FieldDef): string[] {
  const options = field.options ?? [];
  const isChoice = CHOICE_TYPES.has(field.type);
  const errors: string[] = [];
  if (RESERVED_FIELD_KEYS.has(field.key)) errors.push(`field key '${field.key}' is reserved`);
  if (!KEY_PATTERN.test(field.key)) errors.push(`invalid field key '${field.key}'`);
  if (isChoice && options.length === 0) {
    errors.push(`field '${field.key}': ${field.type} needs at least one option`);
  }
  if (!isChoice && options.length > 0) {
    errors.push(`field '${field.key}': only select fields have options`);
  }
  const optionKeys = options.map((o) => o.key);
  if (new Set(optionKeys).size !== optionKeys.length) {
    errors.push(`field '${field.key}': duplicate option keys`);
  }
  if ((field.type === "relation") !== Boolean(field.targetType)) {
    errors.push(`field '${field.key}': relation fields, and only they, need targetType`);
  }
  return errors;
}

function checkCondition(condition: Condition): string[] {
  const value = condition.value ?? null;
  const { op } = condition;
  if (op === "is_empty" || op === "is_not_empty") {
    return value === null ? [] : [`'${op}' takes no value`];
  }
  if (op === "in" || op === "not_in") {
    return Array.isArray(value) ? [] : [`'${op}' needs a list value`];
  }
  return value === null ? [`'${op}' needs a value`] : [];
}

function checkViewShape(view: View): string[] {
  const errors = (view.query.where ?? []).flatMap(checkCondition);
  if (view.display === "board" && !view.groupBy) {
    errors.push(`view '${view.key}': board view needs groupBy`);
  }
  if (NEEDS_DATE.has(view.display) && !view.dateField) {
    errors.push(`view '${view.key}': ${view.display} view needs dateField`);
  }
  return errors;
}

function checkPage(page: Page): string[] {
  const errors: string[] = [];
  const blocks = page.blocks ?? [];
  for (const b of blocks) {
    if (b.x < 0 || b.y < 0 || b.w < 1 || b.h < 1 || b.h > 48 || b.x >= GRID_COLUMNS) {
      errors.push(`block '${b.view}' is outside the grid`);
    } else if (b.x + b.w > GRID_COLUMNS) {
      errors.push(`block '${b.view}' runs past column ${GRID_COLUMNS}`);
    }
  }
  const views = blocks.map((b) => b.view);
  if (new Set(views).size !== views.length) errors.push(`page '${page.key}': a view is placed twice`);
  blocks.forEach((a, i) => {
    for (const b of blocks.slice(i + 1)) {
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
        errors.push(`page '${page.key}': blocks '${a.view}' and '${b.view}' overlap`);
      }
    }
  });
  return errors;
}

function checkJourney(journey: Journey): string[] {
  const errors: string[] = [];
  const phases = journey.phases ?? [];
  const keys = phases.map((p) => p.key);
  if (new Set(keys).size !== keys.length) errors.push("journey: duplicate phase keys");
  for (const p of phases) {
    if (p.endDay < p.startDay) errors.push(`phase '${p.key}' ends before it starts`);
  }
  const ordered = [...phases].sort((a, b) => a.startDay - b.startDay);
  ordered.slice(1).forEach((cur, i) => {
    const prev = ordered[i]!;
    if (cur.startDay <= prev.endDay) {
      errors.push(`journey: phases '${prev.key}' and '${cur.key}' overlap`);
    }
  });
  for (const p of phases) {
    if (p.endDay > journey.lengthDays) {
      errors.push(
        `journey: phase '${p.key}' ends on day ${p.endDay}, outside the ${journey.lengthDays}-day journey`,
      );
    }
  }
  return errors;
}

function missingFields(where: string, type: ObjectType, keys: string[]): string[] {
  return keys
    .filter((key) => fieldType(type, key) === undefined)
    .map((key) => `${where}: type '${type.key}' has no field '${key}'`);
}

function checkViewReferences(view: View, types: Map<string, ObjectType>): string[] {
  const where = `view '${view.key}'`;
  const type = types.get(view.query.type);
  if (!type) return [`${where}: unknown type '${view.query.type}'`];
  const errors = missingFields(where, type, [
    ...(view.query.where ?? []).map((c) => c.field),
    ...(view.query.sort ?? []).map((s) => s.field),
    ...(view.fields ?? []),
  ]);
  if (view.groupBy) {
    const kind = fieldType(type, view.groupBy);
    if (kind === undefined) errors.push(...missingFields(where, type, [view.groupBy]));
    else if (kind !== "select") errors.push(`${where}: groupBy '${view.groupBy}' must be a select field`);
  }
  if (view.dateField) {
    const kind = fieldType(type, view.dateField);
    if (kind === undefined) errors.push(...missingFields(where, type, [view.dateField]));
    else if (kind !== "date" && kind !== "datetime") {
      errors.push(`${where}: dateField '${view.dateField}' must be a date field`);
    }
  }
  return errors;
}

// --- Item data -----------------------------------------------------------------------------------

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;

/** Problems with `data` for an item of `typeKey`. `null` values clear a field and are fine. */
export function checkItemData(spec: Spec, typeKey: string, data: Record<string, unknown>): string[] {
  const type = spec.types.find((t) => t.key === typeKey);
  if (!type) return [`unknown type '${typeKey}'`];
  const errors: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    const field = type.fields.find((f) => f.key === key);
    if (!field) {
      errors.push(`type '${typeKey}' has no field '${key}'`);
      continue;
    }
    if (value === null || value === undefined) continue;
    const problem = valueProblem(field, value);
    if (problem) errors.push(`field '${key}': ${problem}`);
  }
  return errors;
}

function valueProblem(field: FieldDef, value: unknown): string | null {
  const options = new Set(field.options.map((o) => o.key));
  switch (field.type) {
    case "text":
    case "long_text":
    case "url":
      return typeof value === "string" ? null : "expected text";
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? null : "expected a number";
    case "checkbox":
      return typeof value === "boolean" ? null : "expected true or false";
    case "date":
      return isDate(value) ? null : "expected a date (YYYY-MM-DD)";
    case "datetime": {
      const match = typeof value === "string" ? DATETIME.exec(value) : null;
      return match && isDate(match[1]) && !Number.isNaN(Date.parse(value as string))
        ? null
        : "expected a date and time";
    }
    case "select":
      if (typeof value !== "string") return "expected an option key";
      return options.has(value) ? null : `'${value}' is not an option`;
    case "multi_select": {
      if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
        return "expected a list of option keys";
      }
      const seen = new Set<string>();
      for (const key of value as string[]) {
        if (seen.has(key)) return `repeats '${key}'`;
        if (!options.has(key)) return `'${key}' is not an option`;
        seen.add(key);
      }
      return null;
    }
    case "relation":
      return "relations are stored as links, not in data";
    case "file":
    case "ink":
      return null;
  }
}

function isDate(value: unknown): boolean {
  const match = typeof value === "string" ? DATE.exec(value) : null;
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
