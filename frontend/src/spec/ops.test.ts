import { describe, expect, it } from "vitest";
import type { Spec } from "@/domain";
import { STUDY_HQ } from "@/workspace/examples";
import {
  addPage,
  addView,
  displayChoices,
  moveBlocks,
  removePage,
  removeViewFromPage,
  renamePage,
  renameView,
  setDisplay,
  SpecOpError,
  uniqueKey,
} from "./ops";
import { checkSpec } from "./validate";

const valid = (spec: Spec) => expect(checkSpec(spec)).toEqual([]);
const view = (spec: Spec, key: string) => spec.views.find((v) => v.key === key)!;
const page = (spec: Spec, key: string) => spec.pages.find((p) => p.key === key)!;

describe("uniqueKey", () => {
  it("slugs titles and avoids taken keys", () => {
    expect(uniqueKey("Reading list", [], "view")).toBe("reading_list");
    expect(uniqueKey("Reading list", ["reading_list"], "view")).toBe("reading_list_2");
    expect(uniqueKey("2026 goals!", [], "view")).toBe("view_2026_goals");
    expect(uniqueKey("✨", [], "page")).toBe("page");
  });
});

describe("views", () => {
  it("adds a board grouped by the type's choice field, placed below everything", () => {
    const { spec, viewKey } = addView(STUDY_HQ, "home", {
      title: "By priority",
      type: "assignment",
      display: "board",
    });
    valid(spec);
    const added = view(spec, viewKey);
    expect(added.groupBy).toBe("status");
    expect(page(spec, "home").blocks.at(-1)).toMatchObject({ view: viewKey, x: 0, y: 16, w: 12 });
    expect(STUDY_HQ.views.some((v) => v.key === viewKey)).toBe(false);
  });

  it("refuses a board for a type with nothing to group by", () => {
    expect(() =>
      addView(STUDY_HQ, "home", { title: "Subjects", type: "subject", display: "board" }),
    ).toThrow(SpecOpError);
    const subjects = addView(STUDY_HQ, "home", { title: "Subjects", type: "subject", display: "list" });
    const added = view(subjects.spec, subjects.viewKey);
    const choices = displayChoices(subjects.spec, added.query.type, added);
    expect(choices.find((c) => c.display === "board")?.unavailable).toMatch(/no choice field/);
    expect(choices.find((c) => c.display === "table")?.unavailable).toBeUndefined();
  });

  it("switches display and fills in what the new display needs", () => {
    const calendar = setDisplay(STUDY_HQ, "inbox", "calendar");
    valid(calendar);
    expect(view(calendar, "inbox")).toMatchObject({ display: "calendar", dateField: "created_at" });
    const board = setDisplay(STUDY_HQ, "deadlines", "board");
    valid(board);
    expect(view(board, "deadlines").groupBy).toBe("status");
  });

  it("renames, and refuses empty titles", () => {
    valid(renameView(STUDY_HQ, "inbox", "  Capture  "));
    expect(view(renameView(STUDY_HQ, "inbox", "  Capture  "), "inbox").title).toBe("Capture");
    expect(() => renameView(STUDY_HQ, "inbox", "   ")).toThrow("can't be empty");
  });

  it("removes a view from a page and deletes it once nothing uses it", () => {
    const spec = removeViewFromPage(STUDY_HQ, "home", "inbox");
    valid(spec);
    expect(page(spec, "home").blocks.map((b) => b.view)).not.toContain("inbox");
    expect(spec.views.some((v) => v.key === "inbox")).toBe(false);
  });

  it("moves and resizes blocks, clamped to the grid", () => {
    const spec = moveBlocks(STUDY_HQ, "home", [
      { view: "assignments_board", x: 0, y: 0, w: 12, h: 6 },
      { view: "deadlines", x: 0, y: 6, w: 6, h: 8 },
      { view: "inbox", x: 9, y: 6, w: 6, h: 8 },
    ]);
    valid(spec);
    expect(page(spec, "home").blocks.find((b) => b.view === "inbox")).toMatchObject({ x: 6, w: 6 });
  });
});

describe("pages", () => {
  it("adds, renames and removes pages, dropping views only that page used", () => {
    const added = addPage(STUDY_HQ, "Planner");
    expect(added.pageKey).toBe("planner_2");
    valid(added.spec);
    valid(renamePage(added.spec, added.pageKey, "Weekly plan"));

    const without = removePage(STUDY_HQ, "planner");
    valid(without);
    expect(without.views.some((v) => v.key === "assignment_table")).toBe(false);
    expect(without.views.some((v) => v.key === "deadlines")).toBe(true);
  });

  it("keeps at least one page", () => {
    let spec = STUDY_HQ;
    for (const key of ["planner", "notes"]) spec = removePage(spec, key);
    expect(() => removePage(spec, "home")).toThrow("at least one page");
  });
});
