import { describe, expect, it } from "vitest";
import type { Spec } from "@/domain";
import { STUDY_HQ } from "@/workspace/examples";
import itemCases from "../../../shared/fixtures/item_cases.json";
import specCases from "../../../shared/fixtures/spec_cases.json";
import { checkItemData, checkSpec } from "./validate";

// These fixtures come from backend/app/domain/cases.py. Agreeing on every case keeps the
// frontend and backend validators in step.

describe("checkSpec matches the backend", () => {
  it("accepts the reference spec", () => {
    expect(checkSpec(STUDY_HQ)).toEqual([]);
  });

  it.each(specCases.cases.map((c) => [c.name, c] as const))("rejects: %s", (_name, testCase) => {
    const errors = checkSpec(testCase.spec as unknown as Spec);
    expect(errors.some((e) => e.includes(testCase.error))).toBe(true);
  });
});

describe("checkItemData matches the backend", () => {
  it.each(itemCases.cases.map((c) => [c.name, c] as const))("%s", (_name, testCase) => {
    const errors = checkItemData(STUDY_HQ, testCase.type, testCase.data as Record<string, unknown>);
    if (testCase.error === null) expect(errors).toEqual([]);
    else expect(errors.some((e) => e.includes(testCase.error!))).toBe(true);
  });
});
