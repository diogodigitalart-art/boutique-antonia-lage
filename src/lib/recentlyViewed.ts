const KEY = "recently_viewed";
const MAX = 8;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === "string").slice(0, MAX);
  } catch {
    return [];
  }
}

export function getRecentlyViewed(): string[] {
  return read();
}

export function pushRecentlyViewed(id: string): string[] {
  if (typeof window === "undefined" || !id) return [];
  const prev = read().filter((x) => x !== id);
  const next = [id, ...prev].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}