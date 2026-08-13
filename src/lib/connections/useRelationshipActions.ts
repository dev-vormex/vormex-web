'use client';

import { useCallback, useRef, useState } from 'react';
import type { PersonRelationship } from '@/lib/api/people';
import {
  acceptConnectionRequest,
  canonicalMutationRelationship,
  getConnectionStatus,
  sendConnectionRequest,
} from '@/lib/api/connections';
import { getStructuredApiError } from '@/lib/api/errors';
import { publishRelationship, readRelationship } from '@/lib/connections/relationshipStore';

/**
 * Relationship mutations that resolve in the UI before they resolve on the wire.
 *
 * `POST /connections/request` is slow — it walks a chain of safety, quota and
 * trust checks before it answers — and every Connect button used to swap itself
 * for a spinner until that returned, which read as the whole site hanging. The
 * request is not something the viewer needs to supervise: it either succeeds,
 * or it fails for a reason worth surfacing. So the button commits to the
 * outcome on click, the call finishes in the background, and the state reverts
 * only if the server actually refuses.
 */
export interface RelationshipActions {
  /** Send a connection request. Callers may ignore the returned promise. */
  connect: (userId: string) => Promise<void>;
  /** Accept a request this person sent us. */
  accept: (userId: string) => Promise<void>;
  /** Ids whose last mutation was refused, so a surface can offer a retry. */
  failedIds: ReadonlySet<string>;
  /** Reason the most recent mutation for this id failed. */
  errorFor: (userId: string) => string | undefined;
}

export function useRelationshipActions(): RelationshipActions {
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set());
  const errors = useRef(new Map<string, string>());
  // Guards double submits without driving anything visual.
  const inFlight = useRef(new Set<string>());

  const clearFailure = useCallback((userId: string) => {
    errors.current.delete(userId);
    setFailedIds((current) => {
      if (!current.has(userId)) return current;
      const next = new Set(current);
      next.delete(userId);
      return next;
    });
  }, []);

  const recordFailure = useCallback((userId: string, error: unknown, fallback: string) => {
    errors.current.set(userId, getStructuredApiError(error).message || fallback);
    setFailedIds((current) => new Set(current).add(userId));
  }, []);

  const run = useCallback(
    async (
      userId: string,
      expected: PersonRelationship['status'],
      optimistic: PersonRelationship,
      mutate: (previous: PersonRelationship) => Promise<PersonRelationship>,
      fallbackError: string
    ) => {
      if (!userId || inFlight.current.has(userId)) return;

      const previous = readRelationship(userId) ?? { status: 'none' as const, connectionId: null };
      // Re-clicking a person whose state already moved on is a no-op, not a
      // second request — the backend would answer "already pending" anyway.
      if (previous.status !== expected) return;

      inFlight.current.add(userId);
      clearFailure(userId);
      // Commit to the outcome before the network call, not after.
      publishRelationship(userId, optimistic);

      try {
        publishRelationship(userId, await mutate(previous));
      } catch (error) {
        publishRelationship(userId, previous);
        recordFailure(userId, error, fallbackError);
      } finally {
        inFlight.current.delete(userId);
      }
    },
    [clearFailure, recordFailure]
  );

  const connect = useCallback(
    (userId: string) =>
      run(
        userId,
        'none',
        { status: 'pending_sent', connectionId: null },
        async () => {
          const response = await sendConnectionRequest(userId);
          // The server is authoritative about the connection id, and about the
          // case where a request already existed in the other direction.
          return canonicalMutationRelationship(response, 'pending_sent');
        },
        'Could not send request.'
      ),
    [run]
  );

  const accept = useCallback(
    (userId: string) =>
      run(
        userId,
        'pending_received',
        { status: 'connected', connectionId: readRelationship(userId)?.connectionId ?? null },
        async (previous) => {
          let connectionId = previous.connectionId ?? null;
          if (!connectionId) {
            connectionId = (await getConnectionStatus(userId)).connectionId ?? null;
          }
          if (!connectionId) throw new Error('Connection request is no longer available.');
          const response = await acceptConnectionRequest(connectionId);
          return canonicalMutationRelationship(response, 'connected');
        },
        'Could not accept request.'
      ),
    [run]
  );

  const errorFor = useCallback((userId: string) => errors.current.get(userId), []);

  return { connect, accept, failedIds, errorFor };
}
