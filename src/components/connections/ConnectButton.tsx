'use client';

import { useEffect } from 'react';
import { Check, Clock, UserCheck, UserPlus } from 'lucide-react';
import type { PersonRelationshipStatus } from '@/lib/api/people';
import { hydrateRelationship, useRelationship } from '@/lib/connections/relationshipStore';
import { useRelationshipActions } from '@/lib/connections/useRelationshipActions';

/**
 * The Connect control used by the feed discovery rails.
 *
 * Each rail used to carry its own copy of this — a local `connectingIds` set, a
 * spinner while the request was in flight, and a `connectedIds` set that no
 * other rail could see. That meant a person suggested in two rails at once
 * (which happens constantly) stayed on "Connect" in the second rail after you
 * had already asked them, and every click parked a spinner for as long as the
 * server took. State now lives in the shared relationship store and the request
 * runs in the background.
 */

type ConnectButtonVariant = 'solid' | 'outline';

interface ConnectButtonProps {
  userId: string;
  /** Relationship the surface's own payload reported, if it reports one. */
  serverStatus?: PersonRelationshipStatus;
  serverConnectionId?: string | null;
  variant?: ConnectButtonVariant;
  className?: string;
}

const SHELL: Record<ConnectButtonVariant, string> = {
  solid: 'flex w-full items-center justify-center gap-1.5 rounded-full py-[7px] text-[11px] font-semibold transition-colors',
  outline: 'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors flex-shrink-0',
};

const TONE: Record<ConnectButtonVariant, Record<'action' | 'settled' | 'failed', string>> = {
  solid: {
    action: 'bg-blue-600 text-white shadow-sm hover:bg-blue-700',
    settled: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    failed: 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60',
  },
  outline: {
    action: 'border border-blue-500 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20',
    settled: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    failed: 'border border-red-400 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30',
  },
};

export function ConnectButton({
  userId,
  serverStatus = 'none',
  serverConnectionId = null,
  variant = 'solid',
  className = '',
}: ConnectButtonProps) {
  useEffect(() => {
    hydrateRelationship(userId, { status: serverStatus, connectionId: serverConnectionId });
  }, [serverConnectionId, serverStatus, userId]);

  const relationship = useRelationship(userId, serverStatus, serverConnectionId);
  const { connect, accept, failedIds, errorFor } = useRelationshipActions();

  const shell = `${SHELL[variant]} ${className}`.trim();
  const tone = TONE[variant];
  const hasFailed = failedIds.has(userId);

  // Stopping propagation keeps the click off the surrounding profile link.
  const guard = (run: () => void) => (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    run();
  };

  if (relationship.status === 'pending_sent') {
    return (
      <span className={`${shell} ${tone.settled}`}>
        <Clock className="h-3 w-3" /> Requested
      </span>
    );
  }

  if (relationship.status === 'connected') {
    return (
      <span className={`${shell} ${tone.settled}`}>
        <UserCheck className="h-3 w-3" /> Connected
      </span>
    );
  }

  if (relationship.status === 'pending_received') {
    return (
      <button
        type="button"
        onClick={guard(() => void accept(userId))}
        className={`${shell} ${hasFailed ? tone.failed : tone.action}`}
        title={hasFailed ? errorFor(userId) : undefined}
      >
        <Check className="h-3 w-3" />
        {hasFailed ? 'Retry' : 'Accept'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={guard(() => void connect(userId))}
      className={`${shell} ${hasFailed ? tone.failed : tone.action}`}
      title={hasFailed ? errorFor(userId) : undefined}
    >
      <UserPlus className="h-3 w-3" />
      {hasFailed ? 'Retry' : 'Connect'}
    </button>
  );
}

export default ConnectButton;
