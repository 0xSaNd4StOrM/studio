/**
 * Tiny in-process LRU cache for Lingva translations.
 * - Hard cap: 2000 entries (eviction: least-recently-used).
 * - TTL: 24 hours per entry.
 * - Key: `${sourceLang}:${targetLang}:${text}`.
 *
 * NOTE: This cache is per-Node-process. On serverless platforms with many
 * isolates, it will be best-effort only. It still significantly reduces
 * Lingva traffic when the same locale-page renders multiple times in a
 * single warm lambda or long-lived server.
 */

const MAX_ENTRIES = 2000;
const TTL_MS = 24 * 60 * 60 * 1000;

type Entry = {
  value: string;
  expiresAt: number;
};

// Map preserves insertion order, which we leverage as the LRU order.
const store = new Map<string, Entry>();

export function makeKey(sourceLang: string, targetLang: string, text: string) {
  return `${sourceLang}:${targetLang}:${text}`;
}

export function getCached(key: string): string | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  // Refresh LRU position.
  store.delete(key);
  store.set(key, hit);
  return hit.value;
}

export function setCached(key: string, value: string): void {
  if (store.has(key)) {
    store.delete(key);
  } else if (store.size >= MAX_ENTRIES) {
    // Evict the oldest (first-inserted) entry.
    const oldestKey = store.keys().next().value as string | undefined;
    if (oldestKey !== undefined) store.delete(oldestKey);
  }
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

export function clearCache(): void {
  store.clear();
}
