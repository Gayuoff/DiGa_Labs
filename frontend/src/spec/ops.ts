/**
 * Spec operations: every change a person makes to the workspace's structure. Each takes a spec and
 * returns a new one (the input is never mutated), designed to keep the spec valid; the store still
 * validates the result before saving it.
 */
import type { Display, FieldDef, Placement, Query, Spec, View } from "@/domain";
import { fieldType, GRID_COLUMNS } from "./validate";

export class SpecOpError extends Error {}

/** Displays a person can pick; each has a renderer. */
export const EDITABLE_DISPLAYS: Display[] = ["list", "board", "table", "calendar", "doc"];

const DEFAULT_SIZE: Partial<Record<Display, { w: number; h: number }>> = {
  list: { w: 6, h: 8 },
  board: { w: 12, h: 9 },
  table: { w: 12, h: 9 },
  calendar: { w: 12, h: 11 },
  doc: { w: 12, h: 12 },
};

/** A key from a title, unique among `taken`: "Reading list" → "reading_list", "reading_list_2". */
export function uniqueKey(title: string, taken: Iterable<string>, fallback: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  const root = slug === "" ? fallback : /^[a-z]/.test(slug) ? slug : `${fallback}_${slug}`;
  const used = new Set(taken);
  if (!used.has(root)) return root;
  for (let n = 2; ; n++) {
    const key = `${root}_${n}`;
    if (!used.has(key)) return key;
  }
}

function cleanTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) throw new SpecOpError("A title can't be empty");
  return trimmed.slice(0, 120);
}

function findView(spec: Spec, key: string): View {
  const view = spec.views.find((v) => v.key === key);
  if (!view) throw new SpecOpError(`No view '${key}'`);
  return view;
}

function fieldsOf(spec: Spec, typeKey: string): FieldDef[] {
  return spec.types.find((t) => t.key === typeKey)?.fields ?? [];
}

// --- Displays ------------------------------------------------------------------------------------

export interface DisplayChoice {
  display: Display;
  /** Why this display can't show the view's type, when it can't. */
  unavailable?: string;
}

/** What a display needs from the type: boards group by a select field, calendars by a date. */
function displayNeeds(
  spec: Spec,
  typeKey: string,
  display: Display,
  current?: Pick<View, "groupBy" | "dateField">,
): Pick<View, "groupBy" | "dateField"> | { unavailable: string } {
  const type = spec.types.find((t) => t.key === typeKey);
  if (!type) return { unavailable: `Unknown type '${typeKey}'` };
  let groupBy = current?.groupBy ?? null;
  let dateField = current?.dateField ?? null;
  if (display === "board") {
    if (!groupBy || fieldType(type, groupBy) !== "select") {
      groupBy = type.fields.find((f) => f.type === "select")?.key ?? null;
    }
    if (!groupBy) return { unavailable: `${type.label} has no choice field to make columns from` };
  }
  if (display === "calendar" || display === "timeline") {
    const kind = dateField ? fieldType(type, dateField) : undefined;
    if (kind !== "date" && kind !== "datetime") {
      dateField = type.fields.find((f) => f.type === "date" || f.type === "datetime")?.key ?? "created_at";
    }
  }
  return { groupBy, dateField };
}

/** Which displays can show items of `typeKey`, keeping a view's current settings where they fit. */
export function displayChoices(
  spec: Spec,
  typeKey: string,
  current?: Pick<View, "groupBy" | "dateField">,
): DisplayChoice[] {
  return EDITABLE_DISPLAYS.map((display) => {
    const needs = displayNeeds(spec, typeKey, display, current);
    return "unavailable" in needs ? { display, unavailable: needs.unavailable } : { display };
  });
}

export function setDisplay(spec: Spec, viewKey: string, display: Display): Spec {
  const next = structuredClone(spec);
  const view = findView(next, viewKey);
  const needs = displayNeeds(next, view.query.type, display, view);
  if ("unavailable" in needs) throw new SpecOpError(needs.unavailable);
  Object.assign(view, { display, ...needs });
  return next;
}

// --- Views ---------------------------------------------------------------------------------------

export function renameView(spec: Spec, viewKey: string, title: string): Spec {
  const next = structuredClone(spec);
  findView(next, viewKey).title = cleanTitle(title);
  return next;
}

export interface NewView {
  title: string;
  type: string;
  display: Display;
}

/** Adds a view for `type` and places it at the bottom of the page. */
export function addView(spec: Spec, pageKey: string, input: NewView): { spec: Spec; viewKey: string } {
  const next = structuredClone(spec);
  const page = next.pages.find((p) => p.key === pageKey);
  if (!page) throw new SpecOpError(`No page '${pageKey}'`);
  const needs = displayNeeds(next, input.type, input.display);
  if ("unavailable" in needs) throw new SpecOpError(needs.unavailable);

  const key = uniqueKey(input.title, next.views.map((v) => v.key), "view");
  const query: Query = { type: input.type, where: [], match: "all", sort: [], limit: null };
  const shown = fieldsOf(next, input.type)
    .filter((f) => f.key !== needs.groupBy && f.type !== "long_text" && f.type !== "relation")
    .slice(0, 3)
    .map((f) => f.key);
  next.views.push({
    key,
    title: cleanTitle(input.title),
    display: input.display,
    query,
    ...needs,
    fields: shown,
    options: {},
  });

  const size = DEFAULT_SIZE[input.display] ?? { w: 6, h: 8 };
  const bottom = Math.max(0, ...page.blocks.map((b) => b.y + b.h));
  page.blocks.push({ view: key, x: 0, y: bottom, w: size.w, h: size.h });
  return { spec: next, viewKey: key };
}

/** Takes a view off a page; a view no page or journey phase uses any more is deleted. */
export function removeViewFromPage(spec: Spec, pageKey: string, viewKey: string): Spec {
  const next = structuredClone(spec);
  const page = next.pages.find((p) => p.key === pageKey);
  if (!page) throw new SpecOpError(`No page '${pageKey}'`);
  page.blocks = page.blocks.filter((b) => b.view !== viewKey);
  return dropUnusedViews(next);
}

/** Applies positions from the layout editor; views not on the page are ignored. */
export function moveBlocks(spec: Spec, pageKey: string, layout: Placement[]): Spec {
  const next = structuredClone(spec);
  const page = next.pages.find((p) => p.key === pageKey);
  if (!page) throw new SpecOpError(`No page '${pageKey}'`);
  const byView = new Map(layout.map((p) => [p.view, p]));
  page.blocks = page.blocks.map((block) => {
    const moved = byView.get(block.view);
    if (!moved) return block;
    const w = clamp(Math.round(moved.w), 1, GRID_COLUMNS);
    return {
      view: block.view,
      w,
      x: clamp(Math.round(moved.x), 0, GRID_COLUMNS - w),
      y: Math.max(0, Math.round(moved.y)),
      h: clamp(Math.round(moved.h), 1, 48),
    };
  });
  return next;
}

// --- Pages ---------------------------------------------------------------------------------------

export function addPage(spec: Spec, title: string): { spec: Spec; pageKey: string } {
  const next = structuredClone(spec);
  const pageKey = uniqueKey(title, next.pages.map((p) => p.key), "page");
  next.pages.push({ key: pageKey, title: cleanTitle(title), icon: "file", blocks: [] });
  return { spec: next, pageKey };
}

export function renamePage(spec: Spec, pageKey: string, title: string): Spec {
  const next = structuredClone(spec);
  const page = next.pages.find((p) => p.key === pageKey);
  if (!page) throw new SpecOpError(`No page '${pageKey}'`);
  page.title = cleanTitle(title);
  return next;
}

export function removePage(spec: Spec, pageKey: string): Spec {
  if (spec.pages.length <= 1) throw new SpecOpError("A workspace needs at least one page");
  const next = structuredClone(spec);
  next.pages = next.pages.filter((p) => p.key !== pageKey);
  return dropUnusedViews(next);
}

function dropUnusedViews(spec: Spec): Spec {
  const used = new Set([
    ...spec.pages.flatMap((p) => p.blocks.map((b) => b.view)),
    ...(spec.journey?.phases ?? []).flatMap((ph) => ph.views),
  ]);
  spec.views = spec.views.filter((v) => used.has(v.key));
  return spec;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
