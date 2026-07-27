'use client';

import type { StoryGroup } from '@/lib/api/stories';

const CACHE_VERSION = 1;
const CACHE_PREFIX = `vormex:stories:${CACHE_VERSION}`;
// Stories expire server-side within a day; anything older than this is
// not worth painting optimistically.
export const STORIES_BROWSER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
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

export function activeStoryGroups(
  value: StoryGroup[],
  nowMs: number = Date.now()
): StoryGroup[] {
  return value.flatMap((group) => {
    const stories = group.stories.filter((story) => {
      const expiresAtMs = new Date(story.expiresAt).getTime();
      return Number.isFinite(expiresAtMs) && expiresAtMs > nowMs;
    });
    if (stories.length === 0) return [];
    return [{
      ...group,
      stories,
      hasUnviewed: stories.some((story) => !story.isViewed),
      lastStoryAt: stories[0]?.createdAt || group.lastStoryAt,
    }];
  });
}

export function readCachedStories(
  userId?: string | null,
  nowMs: number = Date.now()
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
      nowMs - parsed.savedAt > STORIES_BROWSER_CACHE_TTL_MS
    ) {
      cacheStorage.removeItem(key);
      return undefined;
    }

    const value = activeStoryGroups(parsed.value, nowMs);
    if (value.length === 0 && parsed.value.length > 0) {
      cacheStorage.removeItem(key);
      return undefined;
    }
    return { savedAt: parsed.savedAt, value };
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
        value: activeStoryGroups(storyGroups).slice(0, MAX_CACHED_GROUPS),
      } satisfies CacheEnvelope)
    );
  } catch {
    // Storage can be full or blocked. The in-memory query cache still works.
  }
}

export function clearCachedStories(userId?: string | null): void {
  if (!userId) return;
  storage()?.removeItem(storiesKey(userId));
}
