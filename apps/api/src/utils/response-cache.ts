/**
 * Lightweight in-memory response cache for expensive analytics queries.
 *
 * Entries are keyed by a caller-provided string (usually gymId + route) and
 * expire after a configurable TTL. The cache is intentionally local to the
 * process — this keeps it zero-dependency and works fine on a single Render
 * instance. For multi-instance setups, swap for Redis-based caching.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 60 * 1000; // 1 minute
const MAX_ENTRIES = 500;

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  // Simple LRU eviction: drop oldest entry if we hit the cap.
  if (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value as string | undefined;
    if (oldestKey) store.delete(oldestKey);
  }
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/**
 * Wrap an async function with caching. First call executes and stores;
 * subsequent calls within the TTL return the cached result.
 */
export async function cached<T>(key: string, fn: () => Promise<T>, ttlMs: number = DEFAULT_TTL_MS): Promise<T> {
  const hit = getCached<T>(key);
  if (hit !== null) return hit;

  const data = await fn();
  setCache(key, data, ttlMs);
  return data;
}
