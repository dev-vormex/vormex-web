'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Clock, Loader2, UserCheck, UserPlus } from 'lucide-react';
import type { PersonRelationship } from '@/lib/api/people';
import {
  acceptConnectionRequest,
  canonicalMutationRelationship,
  getConnectionStatus,
  sendConnectionRequest,
} from '@/lib/api/connections';
import { normalizeRelationshipStatus } from '@/lib/findPeoplePolicy';

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
  const [current, setCurrent] = useState<PersonRelationship>(relationship);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrent({
      status: normalizeRelationshipStatus(relationship.status),
      connectionId: relationship.connectionId ?? null,
    });
  }, [relationship.connectionId, relationship.status, userId]);

  const publish = useCallback((next: PersonRelationship) => {
    setCurrent(next);
    onChange(next);
  }, [onChange]);

  const send = async () => {
    if (loading || current.status !== 'none') return;
    const previous = current;
    setError(null);
    setLoading(true);
    publish({ status: 'pending_sent', connectionId: null });
    try {
      const response = await sendConnectionRequest(userId);
      publish(canonicalMutationRelationship(response, 'pending_sent'));
    } catch (requestError) {
      publish(previous);
      setError(requestError instanceof Error ? requestError.message : 'Could not connect. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const accept = async () => {
    if (loading || current.status !== 'pending_received') return;
    const previous = current;
    setError(null);
    setLoading(true);
    try {
      let connectionId = current.connectionId ?? null;
      if (!connectionId) {
        const status = await getConnectionStatus(userId);
        connectionId = status.connectionId ?? null;
      }
      if (!connectionId) throw new Error('Connection request is no longer available.');
      publish({ status: 'connected', connectionId });
      const response = await acceptConnectionRequest(connectionId);
      publish(canonicalMutationRelationship(response, 'connected'));
    } catch (requestError) {
      publish(previous);
      setError(requestError instanceof Error ? requestError.message : 'Could not accept. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const baseClass = compact
    ? 'h-9 w-28 shrink-0 rounded-lg px-3 text-sm'
    : portrait
      ? 'h-10 w-full rounded-full px-4 text-sm'
      : 'h-8 w-full rounded-lg px-2 text-xs sm:h-9 sm:px-3 sm:text-sm';

  const button = (() => {
    if (loading) {
      return (
        <button disabled className={`${baseClass} inline-flex items-center justify-center border border-gray-200 text-gray-400 dark:border-neutral-700`}>
          <Loader2 className="h-4 w-4 animate-spin" aria-label="Updating connection" />
        </button>
      );
    }
    if (current.status === 'pending_sent') {
      return (
        <button disabled className={`${baseClass} inline-flex items-center justify-center gap-1.5 border border-gray-200 bg-gray-50 font-semibold text-gray-500 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-400`}>
          <Clock className="h-4 w-4" /> Requested
        </button>
      );
    }
    if (current.status === 'pending_received') {
      return (
        <button onClick={accept} className={`${baseClass} inline-flex items-center justify-center gap-1.5 bg-blue-600 font-semibold text-white hover:bg-blue-700`}>
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
          onClick={current.status === 'pending_received' ? accept : send}
          className="mt-1 block w-full truncate text-center text-[11px] font-medium text-red-600 hover:underline dark:text-red-400"
          title={error}
        >
          Retry
        </button>
      )}
    </div>
  );
}
