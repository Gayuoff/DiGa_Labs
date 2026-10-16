import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

/** A date ("2026-10-16") or datetime field value as a Date. Plain dates are local calendar days. */
export function parseDayValue(value: unknown): Date | null {
  if (typeof value !== "string" || value === "") return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

/** The local calendar day ("yyyy-MM-dd") a date or datetime value falls on. */
export function dayKey(value: unknown): string | null {
  const date = parseDayValue(value);
  return date ? format(date, "yyyy-MM-dd") : null;
}

/** Short, human date: Today / Tomorrow / Yesterday / Oct 18 / Oct 18, 2027, plus time if any. */
export function formatDay(value: unknown, now: Date = new Date()): string {
  const date = parseDayValue(value);
  if (!date) return typeof value === "string" ? value : "";
  const diff = differenceInCalendarDays(date, now);
  const day =
    diff === 0
      ? "Today"
      : diff === 1
        ? "Tomorrow"
        : diff === -1
          ? "Yesterday"
          : format(date, date.getFullYear() === now.getFullYear() ? "MMM d" : "MMM d, yyyy");
  const hasTime = typeof value === "string" && value.length > 10;
  return hasTime ? `${day}, ${format(date, "p")}` : day;
}

/** Move a date or datetime value to another day, keeping its time of day. */
export function withDay(value: unknown, day: string, fieldType: string): string {
  if (fieldType !== "datetime") return day;
  const date = parseDayValue(value);
  return `${day}T${date ? format(date, "HH:mm") : "09:00"}`;
}

/** The weeks shown for a month: full weeks, so leading and trailing days of nearby months too. */
export function monthMatrix(month: Date, weekStartsOn: 0 | 1 = 1): Date[][] {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn }),
  });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}
