/**
 * Subsequence match score, or null when the query's letters do not all appear in order.
 * Consecutive letters and word starts score higher; shorter texts win ties. Every occurrence of
 * the first letter is tried as a starting point, so "note" finds the word in "New note".
 */
export function fuzzyScore(text: string, query: string): number | null {
  const needle = query.toLowerCase().replace(/\s+/g, "");
  if (!needle) return 0;
  const haystack = text.toLowerCase();
  const first = needle.charAt(0);
  let best: number | null = null;
  for (let start = haystack.indexOf(first); start !== -1; start = haystack.indexOf(first, start + 1)) {
    const score = scoreFrom(haystack, needle, start);
    if (score !== null && (best === null || score > best)) best = score;
  }
  return best === null ? null : best - haystack.length * 0.01;
}

function scoreFrom(haystack: string, needle: string, start: number): number | null {
  let score = 0;
  let run = 0;
  let previous = -2;
  let at = start;
  for (let i = 0; i < needle.length; i++) {
    if (i > 0) at = haystack.indexOf(needle.charAt(i), previous + 1);
    if (at === -1) return null;
    const wordStart = at === 0 || /[\s\-_/:]/.test(haystack.charAt(at - 1));
    run = at === previous + 1 ? run + 1 : 1;
    score += 1 + run * 2 + (wordStart ? 3 : 0);
    previous = at;
  }
  return score;
}

/** Entries matching the query, best first. An empty query keeps the original order. */
export function fuzzyFilter<T extends { title: string; keywords?: string }>(
  entries: T[],
  query: string,
): T[] {
  if (!query.trim()) return entries;
  const scored: { entry: T; score: number }[] = [];
  for (const entry of entries) {
    const title = fuzzyScore(entry.title, query);
    const keywords = entry.keywords ? fuzzyScore(entry.keywords, query) : null;
    const best = Math.max(title ?? -Infinity, keywords === null ? -Infinity : keywords - 1);
    if (best > -Infinity) scored.push({ entry, score: best });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.entry);
}
