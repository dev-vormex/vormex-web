'use client';

import { useSyncExternalStore } from 'react';
import type { PersonRelationship, PersonRelationshipStatus } from '@/lib/api/people';

/**
 * One shared, page-wide view of "where do I stand with this person".
 *
 * The same person routinely appears in several surfaces at once — the feed
 * rails render "People worth knowing", "People you may know" and "People from
 * your college" side by side, and a given suggestion often shows up in two of
 * them. Each surface used to keep its own `connectedIds` set, so sending a
 * request in one rail left the other rails still offering "Connect" for someone
 * you had already asked, and a refetch was the only thing that reconciled them.
 *
 * Every surface now reads and writes here instead, keyed by user id, so one
 * click settles the button everywhere it appears.
 *
 * Scope note: this is shared state within a tab, not a live feed. Nothing here
 * learns that the other person accepted while you are watching — the backend
 * emits no socket event for connection state, so that would need a server
 * change first.
 */

const relationships = new Map<string, PersonRelationship>();
const listeners = new Set<() => void>();

/**
 * Connection rows the viewer deliberately walked back, keyed by person.
 *
 * Cancelling a request deletes the row, but every server-cached payload that
 * described it keeps describing it until its TTL lapses — the discovery lists,
 * the profile query React Query already holds. Because `hydrateRelationship`
 * only moves forward, the next rail to mount used to write that dead request
 * straight back over the retreat, and the id it carried now pointed at nothing.
 * The button read "Pending" again and no amount of clicking Cancel could clear
 * it, since the row it named was already gone.
 *
 * Remembering the ids we retired lets a stale payload be recognised for what it
 * is. A genuinely new request is a new row with a new id, so it still hydrates.
 */
const retiredConnectionIds = new Map<string, Set<string>>();

function retire(userId: string, connectionId: string | null | undefined): void {
  if (!connectionId) return;
  const retired = retiredConnectionIds.get(userId) ?? new Set<string>();
  retired.add(connectionId);
  retiredConnectionIds.set(userId, retired);
}

function isRetired(userId: string, connectionId: string | null | undefined): boolean {
  return Boolean(connectionId && retiredConnectionIds.get(userId)?.has(connectionId));
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function normalize(relationship: PersonRelationship): PersonRelationship {
  return {
    status: relationship.status,
    connectionId: relationship.connectionId ?? null,
  };
}

function same(left: PersonRelationship | undefined, right: PersonRelationship): boolean {
  return Boolean(
    left && left.status === right.status && (left.connectionId ?? null) === (right.connectionId ?? null)
  );
}

export function readRelationship(userId: string): PersonRelationship | undefined {
  return relationships.get(userId);
}

/**
 * Record a relationship the viewer just caused — an optimistic "Requested", or
 * the server's confirmation of it. Always wins over server list data.
 */
export function publishRelationship(userId: string, relationship: PersonRelationship): void {
  if (!userId) return;
  const next = normalize(relationship);
  const current = relationships.get(userId);
  // A retreat retires the row it left behind, so stale server copies of that
  // same row can never reinstate it. See `retiredConnectionIds`.
  if (next.status === 'none') {
    retire(userId, current?.connectionId);
    retire(userId, next.connectionId);
  }
  if (same(current, next)) return; // no-op write, skip the re-render
  relationships.set(userId, next);
  emit();
}

/**
 * How far along a relationship is. Used to decide whether server data may
 * overwrite what the store already holds.
 */
const PROGRESS: Record<PersonRelationshipStatus, number> = {
  none: 0,
  pending_sent: 1,
  pending_received: 1,
  connected: 2,
};

/**
 * Seed from a list payload. Server data may only move a relationship *forward*
 * — several of these endpoints are server-cached, so a refetch can still
 * describe someone as unconnected seconds after you requested them, and that
 * stale "none" must not undo the click the viewer just made. A genuine
 * advance (they accepted, so the server now says connected) still lands.
 *
 * Deliberate retreats — cancelling a request, removing a connection — go
 * through `publishRelationship`, which always wins.
 */
export function hydrateRelationship(userId: string, relationship: PersonRelationship): void {
  if (!userId) return;
  const next = normalize(relationship);
  // A payload still describing a row the viewer already retired is stale by
  // definition, however far "forward" it looks.
  if (isRetired(userId, next.connectionId)) return;
  const current = relationships.get(userId);
  if (current && PROGRESS[next.status] <= PROGRESS[current.status]) return;
  if (same(current, next)) return;
  relationships.set(userId, next);
  emit();
}

/**
 * Test seam — the store outlives individual components by design. Subscribers
 * are left attached and the version keeps climbing, so anything still mounted
 * re-reads rather than being silently orphaned.
 */
export function resetRelationshipStore(): void {
  relationships.clear();
  retiredConnectionIds.clear();
  emit();
}

/**
 * Current relationship for one person, falling back to whatever the surface's
 * own payload claimed until something more authoritative lands.
 *
 * The subscribed value has to be the stored entry itself, not a version
 * counter. Subscribing to a counter and then reading the map separately leaves
 * the map read invisible to React Compiler — which this app builds with — so it
 * memoises the result against `userId` and the button never repaints after a
 * click. Returning the entry makes the dependency real.
 *
 * This is safe against the "getSnapshot should be cached" loop because writes
 * store one normalised object per user and no-op writes are dropped, so the
 * identity only changes when the relationship actually changes.
 */
export function useRelationship(
  userId: string,
  fallbackStatus: PersonRelationshipStatus = 'none',
  fallbackConnectionId: string | null = null
): PersonRelationship {
  const stored = useSyncExternalStore(
    subscribe,
    () => relationships.get(userId),
    () => undefined
  );
  return stored ?? { status: fallbackStatus, connectionId: fallbackConnectionId };
}
