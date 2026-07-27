import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  decideFindPage,
  normalizePeopleSearch,
  productionDisplayName,
  productionPersonCardContent,
  withPersonRelationship,
} from '../src/lib/findPeoplePolicy';
import type { PersonCard } from '../src/lib/api/people';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
}

const person = (overrides: Partial<PersonCard> = {}): PersonCard => ({
  id: 'u1',
  username: 'ada',
  name: 'Ada Lovelace',
  profileImage: null,
  bannerImageUrl: null,
  headline: null,
  college: null,
  branch: null,
  bio: null,
  skills: [],
  interests: [],
  isOnline: false,
  connectionStatus: 'none',
  ...overrides,
});

test('search normalization and display fallback are production safe', () => {
  assert.equal(normalizePeopleSearch('  Machine   Learning '), 'machine learning');
  assert.equal(productionDisplayName(person({ name: '  ', username: 'grace' })), 'grace');
  assert.equal(productionDisplayName(person({ name: '', username: '' })), 'Vormex user');
});

test('rich person card content uses summary data without a profile request', () => {
  assert.deepEqual(productionPersonCardContent(person({
    headline: 'Builder and AI enthusiast',
    college: 'NIAT',
    branch: 'CSE',
    skills: ['AWS', ' C++ ', 'Python'],
  })), {
    headline: 'Builder and AI enthusiast',
    education: 'NIAT · CSE',
    visibleTags: ['AWS', 'C++', 'Python'],
    remainingTags: 0,
  });

  assert.equal(productionPersonCardContent(person({
    headline: 'Engineer',
    bio: 'Product-minded engineer',
  })).headline, 'Engineer · Product-minded engineer');
});

test('cursor policy stops repeated cursors and pages with no new users', () => {
  assert.deepEqual(decideFindPage({
    existingUserIds: new Set(['u1']),
    incomingUserIds: ['u2', 'u3'],
    previousCursor: 'cursor-1',
    serverNextCursor: 'cursor-2',
    serverHasMore: true,
  }), { hasMore: true, nextCursor: 'cursor-2', newUserCount: 2 });

  assert.equal(decideFindPage({
    existingUserIds: new Set(['u1']),
    incomingUserIds: ['u1'],
    previousCursor: 'cursor-1',
    serverNextCursor: 'cursor-2',
    serverHasMore: true,
  }).hasMore, false);

  assert.equal(decideFindPage({
    existingUserIds: new Set<string>(),
    incomingUserIds: ['u2'],
    previousCursor: 'cursor-1',
    serverNextCursor: 'cursor-1',
    serverHasMore: true,
  }).hasMore, false);
});

test('canonical relationship updates flat and nested compatibility fields', () => {
  const updated = withPersonRelationship(person(), {
    status: 'pending_received',
    connectionId: 'connection-1',
  });
  assert.equal(updated.connectionStatus, 'pending_received');
  assert.equal(updated.connectionId, 'connection-1');
  assert.deepEqual(updated.relationship, {
    status: 'pending_received',
    connectionId: 'connection-1',
  });
});

test('Find uses indexed cancellable search and Instagram rows', () => {
  const find = source('src/components/find-people/FindPeople.tsx');
  const api = source('src/lib/api/people.ts');
  const card = source('src/components/find-people/PersonCard.tsx');
  const skeleton = source('src/components/find-people/PersonCardSkeleton.tsx');

  assert.match(api, /\/people\/search\?/);
  assert.match(find, /SEARCH_DEBOUNCE_MS/);
  assert.match(find, /new AbortController\(\)/);
  assert.match(find, /requestVersion !== searchRequestVersionRef\.current/);
  assert.match(find, /SEARCH_PAGE_SIZE/);
  assert.match(find, /PREFETCH_REMAINING_ITEMS/);
  assert.match(find, /SearchPersonRow/);
  assert.match(find, /grid-cols-1/);
  assert.match(find, /sm:grid-cols-2/);
  assert.match(card, /aspect-\[31\/40\]/);
  assert.match(card, /bannerImageUrl/);
  assert.match(card, /mutualConnections/);
  assert.match(card, /visibleTags/);
  assert.match(card, /truncate/);
  assert.match(skeleton, /aspect-\[31\/40\]/);
});
