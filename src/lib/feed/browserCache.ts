'use client';

import type { InfiniteData } from '@tanstack/react-query';
import type { FeedResponse } from '@/types/post';

const CACHE_VERSION = 1;
const CACHE_PREFIX = `vormex:feed:${CACHE_VERSION}`;
export const FEED_BROWSER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHED_PAGES = 3;

export type PersistedFeed = InfiniteData<FeedResponse, unknown>;

type CacheEnvelope = {
  savedAt: number;
  value: PersistedFeed;
};

export type FeedCacheSnapshot = CacheEnvelope;

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function feedKey(userId: string): string {
  return `${CACHE_PREFIX}:${encodeURIComponent(userId)}`;
}

function isFeedResponse(value: unknown): value is FeedResponse {
  if (!value || typeof value !== 'object') return false;
  const page = value as Partial<FeedResponse>;
  return (
    Array.isArray(page.posts) &&
    (page.nextCursor === null || typeof page.nextCursor === 'string')
  );
}

function normalizePersistedFeed(value: unknown): PersistedFeed | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<PersistedFeed>;
  if (!Array.isArray(candidate.pages) || !candidate.pages.every(isFeedResponse)) {
    return undefined;
  }

  const pages = candidate.pages.slice(0, MAX_CACHED_PAGES).map((page) => ({
    ...page,
    // Ad delivery/frequency state is session-specific. Posts are persisted;
    // ads are selected again by the server for the current session.
    adPlacements: [],
  }));
  const pageParams = Array.isArray(candidate.pageParams)
    ? candidate.pageParams
        .slice(0, pages.length)
        .map((value) => typeof value === 'string' ? value : undefined)
    : pages.map(() => undefined);

  return { pages, pageParams };
}

export function readCachedFeed(
  userId?: string | null,
  nowMs: number = Date.now()
): FeedCacheSnapshot | undefined {
  if (!userId) return undefined;
  const cacheStorage = storage();
  if (!cacheStorage) return undefined;

  const key = feedKey(userId);
  try {
    const raw = cacheStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<CacheEnvelope>;
    const value = normalizePersistedFeed(parsed.value);
    if (
      typeof parsed.savedAt !== 'number' ||
      nowMs - parsed.savedAt > FEED_BROWSER_CACHE_TTL_MS ||
      !value
    ) {
      cacheStorage.removeItem(key);
      return undefined;
    }
    return { savedAt: parsed.savedAt, value };
  } catch {
    cacheStorage.removeItem(key);
    return undefined;
  }
}

export function writeCachedFeed(
  userId: string | undefined | null,
  value: PersistedFeed,
  savedAt: number = Date.now()
): void {
  if (!userId) return;
  const cacheStorage = storage();
  const normalized = normalizePersistedFeed(value);
  if (!cacheStorage || !normalized) return;

  try {
    cacheStorage.setItem(
      feedKey(userId),
      JSON.stringify({ savedAt, value: normalized } satisfies CacheEnvelope)
    );
  } catch {
    // Storage may be unavailable or full. React Query remains the in-memory fallback.
  }
}

export function clearCachedFeed(userId?: string | null): void {
  if (!userId) return;
  storage()?.removeItem(feedKey(userId));
}
