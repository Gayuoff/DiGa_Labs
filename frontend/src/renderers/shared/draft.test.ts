import { describe, expect, it } from "vitest";
import type { Condition, ObjectType } from "@/domain";
import { makeQuery } from "@/store";
import { STUDY_HQ } from "@/workspace/examples";
import { draftFromQuery } from "./draft";

const typeOf = (key: string) => STUDY_HQ.types.find((t) => t.key === key) as ObjectType;
const draft = (type: string, where: Condition[], match: "all" | "any" = "all") =>
  draftFromQuery(makeQuery(type, { where, match }), typeOf(type));

describe("draftFromQuery", () => {
  it("tags new items so they appear in a filtered view", () => {
    const inbox = STUDY_HQ.views.find((v) => v.key === "inbox")!;
    expect(draftFromQuery(inbox.query, typeOf("note"))).toEqual({ tags: ["inbox"] });
  });

  it("copies equality and picks the first value of 'in'", () => {
    expect(draft("assignment", [{ field: "status", op: "eq", value: "doing" }])).toEqual({
      status: "doing",
    });
    expect(
      draft("assignment", [{ field: "priority", op: "in", value: ["high", "medium"] }]),
    ).toEqual({ priority: "high" });
  });

  it("ignores builtins, unknown fields, range filters, and all but the first 'any' condition", () => {
    expect(
      draft("assignment", [
        { field: "title", op: "eq", value: "x" },
        { field: "nope", op: "eq", value: "x" },
        { field: "due", op: "gt", value: "2026-10-01" },
      ]),
    ).toEqual({});
    expect(
      draft(
        "assignment",
        [
          { field: "status", op: "eq", value: "todo" },
          { field: "priority", op: "eq", value: "high" },
        ],
        "any",
      ),
    ).toEqual({ status: "todo" });
  });
});
