import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test, { beforeEach } from 'node:test';
import {
  hydrateRelationship,
  publishRelationship,
  readRelationship,
  resetRelationshipStore,
} from '../src/lib/connections/relationshipStore';

beforeEach(() => {
  resetRelationshipStore();
});

test('a click settles the relationship for every surface at once', () => {
  // Two rails render the same suggestion; both read the one store.
  hydrateRelationship('user-a', { status: 'none', connectionId: null });
  publishRelationship('user-a', { status: 'pending_sent', connectionId: null });

  assert.deepEqual(readRelationship('user-a'), {
    status: 'pending_sent',
    connectionId: null,
  });
});

test('a stale cached list cannot undo a request the viewer just sent', () => {
  publishRelationship('user-a', { status: 'pending_sent', connectionId: 'conn-1' });

  // The daily-match and same-college endpoints are server-cached, so a refetch
  // moments later can still describe this person as unconnected.
  hydrateRelationship('user-a', { status: 'none', connectionId: null });

  assert.equal(readRelationship('user-a')?.status, 'pending_sent');
  assert.equal(readRelationship('user-a')?.connectionId, 'conn-1');
});

test('a cancelled request cannot be reinstated by a cached list still describing it', () => {
  hydrateRelationship('user-a', { status: 'pending_sent', connectionId: 'conn-1' });
  // The viewer cancels on the profile; conn-1 no longer exists server-side.
  publishRelationship('user-a', { status: 'none', connectionId: null });

  // Find People and the feed rails are server-cached and keep reporting conn-1
  // for the rest of their TTL. Forward-progress alone used to let that back in —
  // and because the row was gone, cancelling again answered 404 forever.
  hydrateRelationship('user-a', { status: 'pending_sent', connectionId: 'conn-1' });

  assert.equal(readRelationship('user-a')?.status, 'none');
  assert.equal(readRelationship('user-a')?.connectionId, null);
});

test('a genuinely new request after a cancel still hydrates', () => {
  hydrateRelationship('user-a', { status: 'pending_sent', connectionId: 'conn-1' });
  publishRelationship('user-a', { status: 'none', connectionId: null });
  // Asking again creates a different row, so nothing about it is stale.
  hydrateRelationship('user-a', { status: 'pending_sent', connectionId: 'conn-2' });

  assert.equal(readRelationship('user-a')?.status, 'pending_sent');
  assert.equal(readRelationship('user-a')?.connectionId, 'conn-2');
});

test('cancelling stays available when the header never learned a connection id', () => {
  const header = readFileSync(
    join(process.cwd(), 'src/components/profile/ProfileHeader.tsx'),
    'utf8'
  );

  // Guarding the retreat on connectionId made Cancel a button that fired no
  // request and reported nothing whenever the payload lacked the id.
  assert.match(header, /cancelSentRequestToUser\(user\.id\)/);
  assert.doesNotMatch(header, /if \(!connectionId \|\| loadingConnection\) return;/);
  // The server's verdict wins, so a retreat that lost a race repaints.
  assert.match(header, /canonicalMutationRelationship\(await run\(\), 'none'\)/);
});

test('server data may still move a relationship forward', () => {
  publishRelationship('user-a', { status: 'pending_sent', connectionId: 'conn-1' });
  // They accepted, and a later payload reports it.
  hydrateRelationship('user-a', { status: 'connected', connectionId: 'conn-1' });

  assert.equal(readRelationship('user-a')?.status, 'connected');
});

test('a refused request reverts to exactly the previous relationship', () => {
  hydrateRelationship('user-a', { status: 'none', connectionId: null });
  publishRelationship('user-a', { status: 'pending_sent', connectionId: null });
  // What the failure path does: republish what was there before.
  publishRelationship('user-a', { status: 'none', connectionId: null });

  assert.equal(readRelationship('user-a')?.status, 'none');
});

test('publish normalises a missing connection id rather than leaving it undefined', () => {
  publishRelationship('user-a', { status: 'pending_sent' });
  assert.equal(readRelationship('user-a')?.connectionId, null);
});

test('connect surfaces commit before the request instead of showing a spinner', () => {
  const actions = readFileSync(
    join(process.cwd(), 'src/lib/connections/useRelationshipActions.ts'),
    'utf8'
  );

  // The optimistic publish must precede the awaited mutation, otherwise the
  // button is back to waiting on the network.
  const optimisticAt = actions.indexOf('publishRelationship(userId, optimistic)');
  const mutateAt = actions.indexOf('await mutate(previous)');
  assert.ok(optimisticAt > 0 && mutateAt > 0);
  assert.ok(optimisticAt < mutateAt, 'optimistic publish must happen before the network call');
  assert.match(actions, /publishRelationship\(userId, previous\)/); // revert on failure
});

test('no discovery surface renders a spinner while a connect is in flight', () => {
  const surfaces = [
    'src/components/connections/ConnectButton.tsx',
    'src/components/find-people/RelationshipActionButton.tsx',
    'src/components/feed/PeopleRail.tsx',
    'src/components/engagement/DailyMatchCard.tsx',
    'src/components/engagement/PeopleFromYourCollege.tsx',
  ];

  for (const surface of surfaces) {
    const source = readFileSync(join(process.cwd(), surface), 'utf8');
    assert.doesNotMatch(source, /animate-spin/, `${surface} still shows a connect spinner`);
    assert.doesNotMatch(
      source,
      /sendConnectionRequest/,
      `${surface} should connect through the shared relationship actions`
    );
  }
});

test('connecting on a profile settles the same person in the feed rails', () => {
  // The profile header seeds the store from its viewerContext...
  hydrateRelationship('user-a', { status: 'none', connectionId: null });
  // ...and publishes when the viewer connects there.
  publishRelationship('user-a', { status: 'pending_sent', connectionId: 'conn-9' });

  // A rail rendering the same suggestion reads that without a reload. Before,
  // the header kept this in local state and the rails still offered "Connect"
  // until the page was refreshed.
  assert.equal(readRelationship('user-a')?.status, 'pending_sent');
});

test('the profile header shares connection state instead of owning it', () => {
  const header = readFileSync(
    join(process.cwd(), 'src/components/profile/ProfileHeader.tsx'),
    'utf8'
  );

  assert.doesNotMatch(header, /sendConnectionRequest/);
  assert.doesNotMatch(header, /acceptConnectionRequest/);
  assert.match(header, /useRelationship\(/);
  assert.match(header, /useRelationshipActions\(\)/);
  assert.match(header, /publishRelationship\(user\.id/);
  // Local connection state here is what made the rails go stale.
  assert.doesNotMatch(header, /setConnectionStatus/);
  assert.doesNotMatch(header, /setConnectionId/);
});

test('subscribers read the stored entry, not a counter alongside a map read', () => {
  const store = readFileSync(
    join(process.cwd(), 'src/lib/connections/relationshipStore.ts'),
    'utf8'
  );

  // This app builds with React Compiler. Subscribing to a version counter and
  // then reading the map separately leaves the map read untracked, so the
  // memoised result never changes and a clicked button never repaints.
  assert.match(store, /useSyncExternalStore\(\s*subscribe,\s*\(\) => relationships\.get\(userId\)/);
  assert.doesNotMatch(store, /let version/);
});

test('the college rail honours the relationship its endpoint already reports', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/components/engagement/PeopleFromYourCollege.tsx'),
    'utf8'
  );

  assert.match(source, /canonicalPersonRelationship\(person\)/);
  assert.match(source, /serverStatus=\{relationship\.status\}/);
});
