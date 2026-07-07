'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ConnectionSentToast from '@/components/engagement/ConnectionSentToast';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { resolveMediaUrl } from '@/lib/utils/media';
import {
  GraduationCap,
  Users,
  Loader2,
  UserPlus,
  UserCheck,
  Clock,
  Check,
} from 'lucide-react';
import type { PersonCard as PersonCardType } from '@/lib/api/people';
import {
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  cancelConnectionRequest,
  getConnectionStatus,
} from '@/lib/api/connections';

interface PersonCardProps {
  person: PersonCardType;
  onConnectionChange?: (personId: string, newStatus: string) => void;
  badgeLabel?: string;
}

function ProfileBanner({ imageSrc }: { imageSrc?: string | null }) {
  const resolvedSrc = React.useMemo(() => resolveMediaUrl(imageSrc), [imageSrc]);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(resolvedSrc && failedSrc === resolvedSrc);

  return (
    <div className="relative h-16 overflow-hidden bg-gradient-to-r from-slate-100 via-gray-50 to-slate-100 dark:from-neutral-800 dark:via-neutral-800/70 dark:to-neutral-800">
      {resolvedSrc && !failed && (
        <img
          src={resolvedSrc}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailedSrc(resolvedSrc)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}

export function PersonCard({ person, onConnectionChange, badgeLabel }: PersonCardProps) {
  const normalizedStatus: PersonCardType['connectionStatus'] =
    person.connectionStatus === 'pending_sent' ||
    person.connectionStatus === 'pending_received' ||
    person.connectionStatus === 'connected'
      ? person.connectionStatus
      : 'none';

  const [connectionStatus, setConnectionStatus] = useState<PersonCardType['connectionStatus']>(normalizedStatus);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    setConnectionStatus(normalizedStatus);
  }, [normalizedStatus]);

  useEffect(() => {
    setConnectionId(null);
  }, [person.id]);

  const resolveConnectionId = useCallback(async () => {
    if (connectionId) {
      return connectionId;
    }

    const relationship = await getConnectionStatus(person.id);
    const nextConnectionId = relationship.connectionId;

    if (!nextConnectionId) {
      throw new Error(`No connection found for user ${person.id}`);
    }

    const nextStatus: PersonCardType['connectionStatus'] =
      relationship.status === 'pending_sent' ||
      relationship.status === 'pending_received' ||
      relationship.status === 'connected'
        ? relationship.status
        : 'none';

    setConnectionId(nextConnectionId);
    setConnectionStatus(nextStatus);

    return nextConnectionId;
  }, [connectionId, person.id]);

  const handleConnect = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    setLoading(true);
    try {
      const result = await sendConnectionRequest(person.id);
      setConnectionId(result.connection.id);
      setConnectionStatus('pending_sent');
      setShowToast(true);
      onConnectionChange?.(person.id, 'pending_sent');
    } catch (error) {
      console.error('Failed to send connection request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    setLoading(true);
    try {
      const resolvedConnectionId = await resolveConnectionId();
      const result = await acceptConnectionRequest(resolvedConnectionId);
      setConnectionId(result.connection.id);
      setConnectionStatus('connected');
      onConnectionChange?.(person.id, 'connected');
    } catch (error) {
      console.error('Failed to accept connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    setLoading(true);
    try {
      const resolvedConnectionId = await resolveConnectionId();
      await rejectConnectionRequest(resolvedConnectionId);
      setConnectionId(null);
      setConnectionStatus('none');
      onConnectionChange?.(person.id, 'none');
    } catch (error) {
      console.error('Failed to reject connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    setLoading(true);
    try {
      const resolvedConnectionId = await resolveConnectionId();
      await cancelConnectionRequest(resolvedConnectionId);
      setConnectionId(null);
      setConnectionStatus('none');
      onConnectionChange?.(person.id, 'none');
    } catch (error) {
      console.error('Failed to cancel request:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderConnectionButton = () => {
    if (loading) {
      return (
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-full border border-gray-300 dark:border-neutral-700 text-gray-400 text-sm font-semibold"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
        </button>
      );
    }

    switch (connectionStatus) {
      case 'connected':
        return (
          <button
            disabled
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-full border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/60 text-gray-500 dark:text-neutral-400 text-sm font-semibold"
          >
            <UserCheck className="w-4 h-4" />
            Connected
          </button>
        );

      case 'pending_sent':
        return (
          <button
            onClick={handleCancelRequest}
            title="Withdraw request"
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-full border border-gray-400 dark:border-neutral-600 text-gray-600 dark:text-neutral-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-neutral-800 hover:border-gray-500 transition-colors"
          >
            <Clock className="w-4 h-4" />
            Pending
          </button>
        );

      case 'pending_received':
        return (
          <div className="flex w-full items-center gap-2">
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              Accept
            </button>
            <button
              onClick={handleReject}
              className="flex-1 py-1.5 rounded-full border border-gray-300 dark:border-neutral-700 text-gray-600 dark:text-neutral-400 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Ignore
            </button>
          </div>
        );

      default:
        return (
          <button
            onClick={handleConnect}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-full border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:shadow-[inset_0_0_0_1px_currentColor] transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Connect
          </button>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Banner — subtle, professional */}
      <ProfileBanner imageSrc={person.bannerImageUrl} />

      {/* Avatar — centered, overlapping banner */}
      <div className="flex justify-center">
        <Link href={`/profile/${person.username}`} className="relative -mt-10">
          <UserAvatar
            imageSrc={person.profileImage}
            name={person.name}
            className="h-20 w-20 bg-gray-100 text-2xl font-semibold text-gray-500 ring-4 ring-white dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-900"
            fallbackClassName="text-2xl"
          />
          {person.isOnline && (
            <span
              className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 ring-[3px] ring-white dark:ring-neutral-900"
              title="Online"
            />
          )}
        </Link>
      </div>

      {/* Info — centered */}
      <div className="flex flex-col flex-1 items-center text-center px-4 pt-2 pb-4">
        <Link href={`/profile/${person.username}`} className="group/name">
          <h3 className="font-semibold text-base text-gray-900 dark:text-white group-hover/name:underline underline-offset-2">
            {person.name}
          </h3>
        </Link>
        <p className="text-xs text-gray-500 dark:text-neutral-400">@{person.username}</p>

        {badgeLabel && (
          <span className="mt-1.5 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            {badgeLabel}
          </span>
        )}

        {person.headline && (
          <p className="mt-1.5 text-sm text-gray-600 dark:text-neutral-300 line-clamp-2">
            {person.headline}
          </p>
        )}

        {person.college && (
          <div className="mt-2 flex items-center justify-center gap-1.5 max-w-full text-xs text-gray-500 dark:text-neutral-400">
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {person.college}
              {person.branch && ` · ${person.branch}`}
            </span>
          </div>
        )}

        {person.skills && person.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {person.skills.slice(0, 3).map((skill, index) => (
              <span
                key={index}
                className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 text-xs font-medium"
              >
                {skill}
              </span>
            ))}
            {person.skills.length > 3 && (
              <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 text-xs font-medium">
                +{person.skills.length - 3}
              </span>
            )}
          </div>
        )}

        {person.mutualConnections !== undefined && person.mutualConnections > 0 && (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-neutral-400">
            <Users className="w-3.5 h-3.5" />
            {person.mutualConnections} mutual connection{person.mutualConnections !== 1 ? 's' : ''}
          </p>
        )}

        {/* Action — pinned to bottom so cards in a row align */}
        <div className="mt-auto w-full pt-4">{renderConnectionButton()}</div>
      </div>

      <ConnectionSentToast
        show={showToast}
        recipientName={person.name}
        onClose={() => setShowToast(false)}
      />
    </motion.div>
  );
}

export default PersonCard;
