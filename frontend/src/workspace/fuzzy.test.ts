import { describe, expect, it } from "vitest";
import { fuzzyFilter, fuzzyScore } from "./fuzzy";

const titles = (entries: { title: string }[]) => entries.map((e) => e.title);

describe("fuzzy search", () => {
  it("matches letters in order and rejects the rest", () => {
    expect(fuzzyScore("Go to Home", "gth")).not.toBeNull();
    expect(fuzzyScore("Go to Home", "hg")).toBeNull();
    expect(fuzzyScore("Theme: Dark", "home")).toBeNull();
  });

  it("ranks consecutive and word-start matches first", () => {
    const entries = [{ title: "Theme: System" }, { title: "Go to Home" }, { title: "New note" }];
    expect(titles(fuzzyFilter(entries, "home"))).toEqual(["Go to Home"]);
    expect(titles(fuzzyFilter(entries, "nn"))[0]).toBe("New note");
  });

  it("prefers shorter titles on ties and searches keywords too", () => {
    const entries = [
      { title: "Notebook export" },
      { title: "New note" },
      { title: "Theme: Dark", keywords: "night appearance" },
    ];
    expect(titles(fuzzyFilter(entries, "note"))).toEqual(["New note", "Notebook export"]);
    expect(titles(fuzzyFilter(entries, "night"))).toEqual(["Theme: Dark"]);
  });

  it("keeps the original order for an empty query", () => {
    const entries = [{ title: "B" }, { title: "A" }];
    expect(fuzzyFilter(entries, "  ")).toBe(entries);
  });
});
