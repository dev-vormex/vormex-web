'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Check, Clock, UserCheck, UserPlus } from 'lucide-react';
import type { PersonRelationship } from '@/lib/api/people';
import { normalizeRelationshipStatus } from '@/lib/findPeoplePolicy';
import { hydrateRelationship, useRelationship } from '@/lib/connections/relationshipStore';
import { useRelationshipActions } from '@/lib/connections/useRelationshipActions';

interface RelationshipActionButtonProps {
  userId: string;
  relationship: PersonRelationship;
  onChange: (relationship: PersonRelationship) => void;
  compact?: boolean;
  portrait?: boolean;
}

export function RelationshipActionButton({
  userId,
  relationship,
  onChange,
  compact = false,
  portrait = false,
}: RelationshipActionButtonProps) {
  const serverStatus = normalizeRelationshipStatus(relationship.status);
  const serverConnectionId = relationship.connectionId ?? null;

  // The shared store is the source of truth so this button agrees with the same
  // person's card in the feed rails; the server payload only seeds it.
  useEffect(() => {
    hydrateRelationship(userId, { status: serverStatus, connectionId: serverConnectionId });
  }, [serverConnectionId, serverStatus, userId]);

  const current = useRelationship(userId, serverStatus, serverConnectionId);
  const { connect, accept, failedIds, errorFor } = useRelationshipActions();

  // Keep list owners in step when the relationship moves — including when it
  // moved because another surface acted on the same person.
  const lastNotified = useRef<string | null>(null);
  useEffect(() => {
    const signature = `${current.status}:${current.connectionId ?? ''}`;
    if (lastNotified.current === null) {
      lastNotified.current = signature;
      return;
    }
    if (lastNotified.current === signature) return;
    lastNotified.current = signature;
    onChange(current);
  }, [current, onChange]);

  const send = useCallback(() => void connect(userId), [connect, userId]);
  const approve = useCallback(() => void accept(userId), [accept, userId]);

  const error = failedIds.has(userId) ? errorFor(userId) ?? 'Could not update. Try again.' : null;

  const baseClass = compact
    ? 'h-9 w-28 shrink-0 rounded-lg px-3 text-sm'
    : portrait
      ? 'h-10 w-full rounded-full px-4 text-sm'
      : 'h-8 w-full rounded-lg px-2 text-xs sm:h-9 sm:px-3 sm:text-sm';

  /*
   * There is deliberately no spinner state. The mutation runs in the background
   * and the button already shows the outcome it committed to; swapping in a
   * loader made every Connect feel as slow as the slowest safety check on the
   * server, even though the optimistic result was already computed.
   */
  const button = (() => {
    if (current.status === 'pending_sent') {
      return (
        <button disabled className={`${baseClass} inline-flex items-center justify-center gap-1.5 border border-gray-200 bg-gray-50 font-semibold text-gray-500 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-400`}>
          <Clock className="h-4 w-4" /> Requested
        </button>
      );
    }
    if (current.status === 'pending_received') {
      return (
        <button onClick={approve} className={`${baseClass} inline-flex items-center justify-center gap-1.5 bg-blue-600 font-semibold text-white hover:bg-blue-700`}>
          <Check className="h-4 w-4" /> Accept
        </button>
      );
    }
    if (current.status === 'connected') {
      return (
        <button disabled className={`${baseClass} inline-flex items-center justify-center gap-1.5 border border-gray-200 bg-gray-50 font-semibold text-gray-500 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-400`}>
          <UserCheck className="h-4 w-4" /> Connected
        </button>
      );
    }
    return (
      <button onClick={send} className={`${baseClass} inline-flex items-center justify-center gap-1.5 border border-blue-600 font-semibold text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950/40`}>
        <UserPlus className="h-4 w-4" /> Connect
      </button>
    );
  })();

  return (
    <div className={compact ? 'w-28 shrink-0' : 'w-full'}>
      {button}
      {error && (
        <button
          type="button"
          onClick={current.status === 'pending_received' ? approve : send}
          className="mt-1 block w-full truncate text-center text-[11px] font-medium text-red-600 hover:underline dark:text-red-400"
          title={error}
        >
          Retry
        </button>
      )}
    </div>
  );
}
