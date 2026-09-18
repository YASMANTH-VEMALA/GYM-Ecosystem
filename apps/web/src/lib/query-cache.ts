import { dehydrate, hydrate, type QueryClient } from '@tanstack/react-query';

const CACHE_PREFIX = 'gymos-query-cache';
const CACHE_VERSION = 'v1';
const CACHE_MAX_AGE = 10 * 60 * 1000;

interface PersistedQueryCache {
  version: string;
  savedAt: number;
  state: ReturnType<typeof dehydrate>;
}

function cacheKey() {
  if (typeof window === 'undefined') return null;

  const userId = window.localStorage.getItem('gymos-user-id');
  const branchId = window.localStorage.getItem('gymos-branch-id');
  if (!userId || !branchId) return null;

  return `${CACHE_PREFIX}:${userId}:${branchId}`;
}

export function restoreQueryCache(queryClient: QueryClient) {
  const key = cacheKey();
  if (!key) return;

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return;

    const cached = JSON.parse(raw) as PersistedQueryCache;
    if (cached.version !== CACHE_VERSION || Date.now() - cached.savedAt > CACHE_MAX_AGE) {
      window.sessionStorage.removeItem(key);
      return;
    }

    hydrate(queryClient, cached.state);
  } catch {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Storage is optional.
    }
  }
}

export function persistQueryCache(queryClient: QueryClient) {
  const key = cacheKey();
  if (!key) return;

  const cached: PersistedQueryCache = {
    version: CACHE_VERSION,
    savedAt: Date.now(),
    state: dehydrate(queryClient, {
      shouldDehydrateQuery: (query) => query.state.status === 'success' && query.meta?.persist !== false,
    }),
  };

  try {
    window.sessionStorage.setItem(key, JSON.stringify(cached));
  } catch {
    // Storage can be unavailable or full. The in-memory cache still works.
  }
}

export function clearPersistedQueryCache() {
  if (typeof window === 'undefined') return;

  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(`${CACHE_PREFIX}:`)) window.sessionStorage.removeItem(key);
    }
  } catch {
    // Storage is optional.
  }
}
