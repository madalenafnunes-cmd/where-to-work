/**
 * Persistent cache layer using localStorage for API results
 * Survives page reloads and navigations
 */

const CACHE_PREFIX = "wtw_cache_";
const CACHE_VERSION = "v1";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function getCached<T>(key: string, maxAgeMs: number = Infinity): T | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(CACHE_PREFIX + key);
    if (!stored) return null;

    const entry = JSON.parse(stored) as CacheEntry<T>;
    const age = Date.now() - entry.timestamp;

    if (age > maxAgeMs) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

export function setCached<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;

  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Silently fail if localStorage is full
  }
}

export function clearCache(pattern?: string): void {
  if (typeof window === "undefined") return;

  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        if (!pattern || key.includes(pattern)) {
          localStorage.removeItem(key);
        }
      }
    });
  } catch {
    // Silently fail
  }
}
