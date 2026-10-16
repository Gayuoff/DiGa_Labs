import { describe, expect, it } from "vitest";
import { STUDY_HQ } from "@/workspace/examples";
import { ICON_NAMES, ICONS } from "./icons";

describe("icon set", () => {
  it("covers every icon the reference spec and the app's commands use", () => {
    const used = [
      ...STUDY_HQ.pages.map((p) => p.icon),
      ...STUDY_HQ.types.map((t) => t.icon),
      ...["undo-2", "redo-2", "sun", "moon", "monitor", "file", "plus", "file-plus", "layout-dashboard"],
    ].filter((name): name is string => Boolean(name));
    expect(used.filter((name) => !ICONS[name])).toEqual([]);
  });

  it("uses spec-valid icon names (lowercase letters, digits, dashes)", () => {
    expect(ICON_NAMES.filter((name) => !/^[a-z0-9-]{1,40}$/.test(name))).toEqual([]);
  });
});
