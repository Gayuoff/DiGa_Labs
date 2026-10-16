import { describe, expect, it } from "vitest";
import type { Condition, Item } from "../domain";
import { groupItems, makeQuery, runQuery } from "./query";

let seq = 0;
function item(title: string, data: Item["data"] = {}, extra: Partial<Item> = {}): Item {
  seq += 1;
  const id = `ID${String(seq).padStart(4, "0")}`;
  return {
    id,
    workspaceId: "ws1",
    type: "task",
    title,
    data,
    createdBy: "u1",
    createdAt: `2026-10-${String(seq % 28 + 1).padStart(2, "0")}T00:00:00.000Z`,
    updatedAt: "2026-10-01T00:00:00.000Z",
    deletedAt: null,
    version: 1,
    sample: false,
    ...extra,
  };
}

const items = [
  item("Write report", { status: "todo", due: "2026-10-20", points: 3, tags: ["work"] }),
  item("Gym", { status: "done", due: "2026-10-16", points: 1, tags: ["health", "daily"] }),
  item("Read book", { status: "doing", points: 2, tags: [] }),
  item("Old task", { status: "todo" }, { deletedAt: "2026-10-02T00:00:00.000Z" }),
  item("A note", {}, { type: "note" }),
];

const where = (...conditions: Condition[]) =>
  runQuery(items, makeQuery("task", { where: conditions })).map((i) => i.title);

describe("filters", () => {
  it("returns live items of the query type only", () => {
    expect(where()).toEqual(["Write report", "Gym", "Read book"]);
  });

  it("supports equality and inequality", () => {
    expect(where({ field: "status", op: "eq", value: "todo" })).toEqual(["Write report"]);
    expect(where({ field: "status", op: "neq", value: "todo" })).toEqual(["Gym", "Read book"]);
  });

  it("supports in / not_in, including multi-select overlap", () => {
    expect(where({ field: "status", op: "in", value: ["todo", "doing"] })).toEqual([
      "Write report",
      "Read book",
    ]);
    expect(where({ field: "tags", op: "in", value: ["daily"] })).toEqual(["Gym"]);
    expect(where({ field: "status", op: "not_in", value: ["todo"] })).toEqual(["Gym", "Read book"]);
  });

  it("supports contains for multi-select and case-insensitive text", () => {
    expect(where({ field: "tags", op: "contains", value: "health" })).toEqual(["Gym"]);
    expect(where({ field: "title", op: "contains", value: "REPORT" })).toEqual(["Write report"]);
  });

  it("compares numbers and ISO dates", () => {
    expect(where({ field: "points", op: "gte", value: 2 })).toEqual(["Write report", "Read book"]);
    expect(where({ field: "due", op: "lt", value: "2026-10-18" })).toEqual(["Gym"]);
  });

  it("treats missing, empty strings and empty lists as empty", () => {
    expect(where({ field: "due", op: "is_empty", value: null })).toEqual(["Read book"]);
    expect(where({ field: "tags", op: "is_not_empty", value: null })).toEqual([
      "Write report",
      "Gym",
    ]);
  });

  it("matches any condition when match is 'any'", () => {
    const result = runQuery(
      items,
      makeQuery("task", {
        match: "any",
        where: [
          { field: "status", op: "eq", value: "done" },
          { field: "points", op: "eq", value: 2 },
        ],
      }),
    );
    expect(result.map((i) => i.title)).toEqual(["Gym", "Read book"]);
  });
});

describe("sorting and limits", () => {
  const sorted = (field: string, dir: "asc" | "desc") =>
    runQuery(items, makeQuery("task", { sort: [{ field, dir }] })).map((i) => i.title);

  it("sorts ascending and descending with empty values always last", () => {
    expect(sorted("due", "asc")).toEqual(["Gym", "Write report", "Read book"]);
    expect(sorted("due", "desc")).toEqual(["Write report", "Gym", "Read book"]);
  });

  it("sorts text naturally and builtin fields by name", () => {
    expect(sorted("title", "asc")).toEqual(["Gym", "Read book", "Write report"]);
    expect(sorted("created_at", "desc")).toEqual(["Read book", "Gym", "Write report"]);
  });

  it("falls back to creation order and applies the limit", () => {
    const result = runQuery(items, makeQuery("task", { limit: 2 }));
    expect(result.map((i) => i.title)).toEqual(["Write report", "Gym"]);
  });
});

describe("grouping", () => {
  const options = [
    { key: "todo", label: "To do", color: null },
    { key: "doing", label: "Doing", color: "#f59e0b" },
    { key: "done", label: "Done", color: null },
  ];

  it("groups in option order and keeps empty columns", () => {
    const groups = groupItems(runQuery(items, makeQuery("task")), "status", options);
    expect(groups.map((g) => [g.key, g.items.map((i) => i.title)])).toEqual([
      ["todo", ["Write report"]],
      ["doing", ["Read book"]],
      ["done", ["Gym"]],
    ]);
  });

  it("collects missing or unknown values under 'No value'", () => {
    const loose = [item("x", { status: "archived" }), item("y")];
    const groups = groupItems(loose, "status", options);
    expect(groups.at(-1)).toMatchObject({ key: null, label: "No value" });
    expect(groups.at(-1)?.items.map((i) => i.title)).toEqual(["x", "y"]);
  });
});
