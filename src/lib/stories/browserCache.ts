'use client';

import type { StoryGroup } from '@/lib/api/stories';

const CACHE_VERSION = 1;
const CACHE_PREFIX = `vormex:stories:${CACHE_VERSION}`;
// Stories expire server-side within a day; anything older than this is
// not worth painting optimistically.
const BROWSER_CACHE_TTL = 6 * 60 * 60 * 1000;
const MAX_CACHED_GROUPS = 30;

type CacheEnvelope = {
  savedAt: number;
  value: StoryGroup[];
};

export type StoriesCacheSnapshot = {
  savedAt: number;
  value: StoryGroup[];
};

function storage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function storiesKey(userId: string): string {
  return `${CACHE_PREFIX}:${encodeURIComponent(userId)}`;
}

function isStoryGroupList(value: unknown): value is StoryGroup[] {
  return (
    Array.isArray(value) &&
    value.every(
      (group) =>
        typeof group === 'object' &&
        group !== null &&
        typeof (group as StoryGroup).user === 'object' &&
        Array.isArray((group as StoryGroup).stories)
    )
  );
}

export function readCachedStories(
  userId?: string | null
): StoriesCacheSnapshot | undefined {
  if (!userId) return undefined;
  const cacheStorage = storage();
  if (!cacheStorage) return undefined;

  const key = storiesKey(userId);
  try {
    const raw = cacheStorage.getItem(key);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as Partial<CacheEnvelope>;
    if (
      typeof parsed.savedAt !== 'number' ||
      !isStoryGroupList(parsed.value) ||
      Date.now() - parsed.savedAt > BROWSER_CACHE_TTL
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

export function writeCachedStories(
  userId: string | undefined | null,
  storyGroups: StoryGroup[]
): void {
  if (!userId) return;
  const cacheStorage = storage();
  if (!cacheStorage) return;

  try {
    cacheStorage.setItem(
      storiesKey(userId),
      JSON.stringify({
        savedAt: Date.now(),
        value: storyGroups.slice(0, MAX_CACHED_GROUPS),
      } satisfies CacheEnvelope)
    );
  } catch {
    // Storage can be full or blocked. The in-memory query cache still works.
  }
}
