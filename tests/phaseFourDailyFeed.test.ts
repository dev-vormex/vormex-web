import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test, { afterEach, beforeEach } from 'node:test';
import {
  FEED_BROWSER_CACHE_TTL_MS,
  readCachedFeed,
  writeCachedFeed,
  type PersistedFeed,
} from '../src/lib/feed/browserCache';
import {
  DAILY_MODULE_CACHE_TTL_MS,
  readDailyModule,
  writeDailyModule,
} from '../src/lib/feed/dailyModulesCache';
import {
  activeStoryGroups,
  readCachedStories,
  writeCachedStories,
} from '../src/lib/stories/browserCache';
import type { StoryGroup } from '../src/lib/api/stories';

class TestStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

let originalWindow: PropertyDescriptor | undefined;

beforeEach(() => {
  originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: new TestStorage(), sessionStorage: new TestStorage() },
  });
});

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

test('successful feed pages survive reload for one day without persisting ads', () => {
  const savedAt = Date.UTC(2026, 6, 27, 0, 0, 0);
  const feed = {
    pages: [{ posts: [{ id: 'post-1' }], nextCursor: null, adPlacements: [{ id: 'ad-1' }] }],
    pageParams: [undefined],
  } as unknown as PersistedFeed;

  writeCachedFeed('user-1', feed, savedAt);
  const cached = readCachedFeed('user-1', savedAt + 1_000);
  assert.equal((cached?.value.pages[0].posts[0] as { id: string }).id, 'post-1');
  assert.deepEqual(cached?.value.pages[0].adPlacements, []);
  assert.equal(readCachedFeed('user-1', savedAt + FEED_BROWSER_CACHE_TTL_MS + 1), undefined);
});

test('daily recommendation modules are user scoped and expire after 24 hours', () => {
  const savedAt = 10_000;
  const validator = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((item) => typeof item === 'string');

  writeDailyModule('user-1', 'smart-matches', ['person-1'], savedAt);
  assert.deepEqual(
    readDailyModule('user-1', 'smart-matches', validator, savedAt + 100)?.value,
    ['person-1']
  );
  assert.equal(readDailyModule('user-2', 'smart-matches', validator, savedAt + 100), undefined);
  assert.equal(
    readDailyModule(
      'user-1',
      'smart-matches',
      validator,
      savedAt + DAILY_MODULE_CACHE_TTL_MS + 1
    ),
    undefined
  );
});

test('story cache paints only unexpired stories and drops empty groups', () => {
  const now = Date.now();
  const groups = [{
    user: { id: 'user-1' },
    hasUnviewed: true,
    lastStoryAt: new Date(now - 1_000).toISOString(),
    stories: [
      { id: 'active', isViewed: false, createdAt: new Date(now - 1_000).toISOString(), expiresAt: new Date(now + 5_000).toISOString() },
      { id: 'expired', isViewed: false, createdAt: new Date(now - 2_000).toISOString(), expiresAt: new Date(now - 1).toISOString() },
    ],
  }] as unknown as StoryGroup[];

  assert.deepEqual(activeStoryGroups(groups, now)[0].stories.map((story) => story.id), ['active']);
  writeCachedStories('user-1', groups);
  assert.equal(readCachedStories('user-1', now)?.value[0].stories[0].id, 'active');
});

test('feed UI restores cached pages, retries initial timeouts, and keeps posts on refresh errors', () => {
  const feed = readFileSync(join(process.cwd(), 'src/components/feed/Feed.tsx'), 'utf8');
  assert.match(feed, /initialData: cachedFeed\?\.value/);
  assert.match(feed, /initialDataUpdatedAt: cachedFeed\?\.savedAt/);
  assert.match(feed, /failureCount < 2/);
  assert.match(feed, /queryError && posts\.length === 0/);
  assert.match(feed, /writeCachedFeed/);
});
