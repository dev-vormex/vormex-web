'use client';

const CACHE_VERSION = 1;
const CACHE_PREFIX = `vormex:daily-feed-module:${CACHE_VERSION}`;
export const DAILY_MODULE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type DailyFeedModule = 'daily-matches' | 'smart-matches';

export type DailyModuleSnapshot<T> = {
  savedAt: number;
  value: T;
};

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function moduleKey(userId: string, module: DailyFeedModule): string {
  return `${CACHE_PREFIX}:${encodeURIComponent(userId)}:${module}`;
}

function removeLegacySnapshot(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore blocked storage; the session cache remains optional.
  }
}

export function readDailyModule<T>(
  userId: string | undefined | null,
  module: DailyFeedModule,
  isValid: (value: unknown) => value is T,
  nowMs: number = Date.now()
): DailyModuleSnapshot<T> | undefined {
  if (!userId) return undefined;
  const cacheStorage = storage();
  if (!cacheStorage) return undefined;
  const key = moduleKey(userId, module);
  removeLegacySnapshot(key);

  try {
    const raw = cacheStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<DailyModuleSnapshot<unknown>>;
    if (
      typeof parsed.savedAt !== 'number' ||
      nowMs - parsed.savedAt > DAILY_MODULE_CACHE_TTL_MS ||
      !isValid(parsed.value)
    ) {
      cacheStorage.removeItem(key);
      return undefined;
    }
    return { savedAt: parsed.savedAt, value: parsed.value };
  } catch {
    cacheStorage.removeItem(key);
    return undefined;
  }
}

export function writeDailyModule<T>(
  userId: string | undefined | null,
  module: DailyFeedModule,
  value: T,
  savedAt: number = Date.now()
): void {
  if (!userId) return;
  try {
    const key = moduleKey(userId, module);
    removeLegacySnapshot(key);
    storage()?.setItem(key, JSON.stringify({ savedAt, value }));
  } catch {
    // React Query remains the in-memory fallback if browser storage is unavailable.
  }
}

export function clearDailyModules(userId: string | undefined | null): void {
  if (!userId) return;
  const cacheStorage = storage();
  if (!cacheStorage) return;
  try {
    cacheStorage.removeItem(moduleKey(userId, 'daily-matches'));
    cacheStorage.removeItem(moduleKey(userId, 'smart-matches'));
    window.localStorage.removeItem(moduleKey(userId, 'daily-matches'));
    window.localStorage.removeItem(moduleKey(userId, 'smart-matches'));
  } catch {
    // Best-effort cleanup of snapshots created by older releases.
  }
}
