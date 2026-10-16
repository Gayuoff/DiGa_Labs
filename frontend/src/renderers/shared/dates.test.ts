import { describe, expect, it } from "vitest";
import { dayKey, formatDay, monthMatrix, withDay } from "./dates";

const now = new Date(2026, 9, 16, 12, 0); // Fri 16 Oct 2026, local time

describe("dayKey", () => {
  it("reads dates and local datetimes, rejects junk", () => {
    expect(dayKey("2026-10-16")).toBe("2026-10-16");
    expect(dayKey("2026-10-16T23:30")).toBe("2026-10-16");
    expect(dayKey("not a date")).toBeNull();
    expect(dayKey(5)).toBeNull();
    expect(dayKey("")).toBeNull();
  });
});

describe("formatDay", () => {
  it("uses relative words near today and short dates otherwise", () => {
    expect(formatDay("2026-10-16", now)).toBe("Today");
    expect(formatDay("2026-10-17", now)).toBe("Tomorrow");
    expect(formatDay("2026-10-15", now)).toBe("Yesterday");
    expect(formatDay("2026-10-20", now)).toBe("Oct 20");
    expect(formatDay("2027-01-05", now)).toBe("Jan 5, 2027");
  });

  it("adds the time for datetimes", () => {
    expect(formatDay("2026-10-16T14:30", now)).toBe("Today, 2:30 PM");
  });
});

describe("withDay", () => {
  it("moves dates, and datetimes keeping their time", () => {
    expect(withDay("2026-10-16", "2026-10-20", "date")).toBe("2026-10-20");
    expect(withDay("2026-10-16T14:30", "2026-10-20", "datetime")).toBe("2026-10-20T14:30");
    expect(withDay(null, "2026-10-20", "datetime")).toBe("2026-10-20T09:00");
  });
});

describe("monthMatrix", () => {
  it("returns whole Monday-first weeks covering the month", () => {
    const weeks = monthMatrix(new Date(2026, 9, 1));
    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0]![0]!.getDate()).toBe(28); // Mon 28 Sep
    expect(weeks[4]![6]!.getDate()).toBe(1); // Sun 1 Nov
  });
});
