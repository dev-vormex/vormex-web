'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, ChevronRight, ChevronLeft, Check, Loader2, MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getDailyMatches, type DailyMatch, type DailyMatchesResponse } from '@/lib/api/engagement';
import { sendConnectionRequest } from '@/lib/api/connections';
import Link from 'next/link';
import { TodayMatchesSkeleton } from './TodayMatchesSkeleton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { useAuth } from '@/lib/auth/useAuth';
import {
  DAILY_MODULE_CACHE_TTL_MS,
  readDailyModule,
  writeDailyModule,
} from '@/lib/feed/dailyModulesCache';

function isDailyMatchesResponse(value: unknown): value is DailyMatchesResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DailyMatchesResponse>;
  return Array.isArray(candidate.matches) && typeof candidate.matchCount === 'number';
}

/**
 * TodayMatchesSection - Horizontal scrollable match cards at top of feed
 * Like Android's TodayMatchesSection — prominent, above posts
 */
export default function TodayMatchesSection() {
  const { user } = useAuth();
  const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set());
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const cachedMatches = useMemo(
    () => readDailyModule(user?.id, 'daily-matches', isDailyMatchesResponse),
    [user?.id]
  );
  const { data: matchData, dataUpdatedAt, isLoading } = useQuery({
    queryKey: ['daily-matches', user?.id],
    queryFn: getDailyMatches,
    enabled: Boolean(user?.id),
    initialData: cachedMatches?.value,
    initialDataUpdatedAt: cachedMatches?.savedAt,
    staleTime: DAILY_MODULE_CACHE_TTL_MS,
    gcTime: DAILY_MODULE_CACHE_TTL_MS,
  });

  useEffect(() => {
    if (
      user?.id &&
      matchData &&
      dataUpdatedAt > (cachedMatches?.savedAt ?? 0)
    ) {
      writeDailyModule(user.id, 'daily-matches', matchData, dataUpdatedAt);
    }
  }, [cachedMatches?.savedAt, dataUpdatedAt, matchData, user?.id]);

  // Track scroll state for arrow visibility
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      setCanScrollLeft(el.scrollLeft > 8);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    return () => el.removeEventListener('scroll', check);
  }, [matchData]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' });
  };

  const handleConnect = async (e: React.MouseEvent, userId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (connectingIds.has(userId) || connectedIds.has(userId)) return;

    setConnectingIds(prev => new Set([...prev, userId]));
    setFailedIds(prev => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    try {
      await sendConnectionRequest(userId);
      setConnectedIds(prev => new Set([...prev, userId]));
    } catch (error) {
      console.error('Failed to send connection request:', error);
      setFailedIds(prev => new Set([...prev, userId]));
    } finally {
      setConnectingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  if (isLoading && !matchData) return <TodayMatchesSkeleton />;
  if (!matchData || matchData.matches.length === 0) return null;

  return (
    <div className="relative mb-3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[13px] font-semibold text-gray-900 sm:text-sm dark:text-white">Today&apos;s Matches</h3>
          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500 sm:text-[10px] dark:bg-neutral-800 dark:text-neutral-400">
            {matchData.matches.length}
          </span>
        </div>
        <Link
          href="/find-people"
          className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-50 sm:text-xs dark:text-blue-400 dark:hover:bg-blue-900/20"
        >
          See all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Scroll arrows (desktop) */}
      <AnimatePresence>
        {canScrollLeft && (
          <motion.button
            key="scroll-left"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            className="hidden lg:flex absolute left-2 top-1/2 mt-3 z-10 w-8 h-8 items-center justify-center rounded-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-md hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-neutral-300" />
          </motion.button>
        )}
        {canScrollRight && (
          <motion.button
            key="scroll-right"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            className="hidden lg:flex absolute right-2 top-1/2 mt-3 z-10 w-8 h-8 items-center justify-center rounded-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-md hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-neutral-300" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-2.5 overflow-x-auto px-3 pb-1 sm:gap-3 sm:px-4"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {matchData.matches.map((match, i) => (
          <MatchCard
            key={match.id}
            match={match}
            index={i}
            isConnecting={connectingIds.has(match.id)}
            isConnected={connectedIds.has(match.id)}
            hasFailed={failedIds.has(match.id)}
            onConnect={handleConnect}
          />
        ))}
      </div>
    </div>
  );
}

function MatchCard({
  match,
  index,
  isConnecting,
  isConnected,
  hasFailed,
  onConnect,
}: {
  match: DailyMatch;
  index: number;
  isConnecting: boolean;
  isConnected: boolean;
  hasFailed: boolean;
  onConnect: (e: React.MouseEvent, userId: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="w-[164px] flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white transition-all hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
      style={{ scrollSnapAlign: 'start' }}
    >
      <Link href={`/profile/${match.username}`} className="block">
        {/* Avatar + Online indicator */}
        <div className="relative flex justify-center pb-1.5 pt-3">
          <div className="relative">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-[2px]">
              <div className="w-full h-full rounded-full border-2 border-white dark:border-neutral-900 overflow-hidden bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">
                <UserAvatar
                  imageSrc={match.profileImage}
                  name={match.name}
                  className="h-full w-full rounded-full text-base font-bold text-gray-400"
                  fallbackClassName="text-base"
                />
              </div>
            </div>
            {match.isOnline && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-neutral-900" />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="px-2.5 pb-1.5 text-center">
          <p className="flex items-center justify-center gap-1 text-[13px] font-semibold text-gray-900 dark:text-white">
            <span className="truncate">{match.name}</span>
            <VerificationBadge
              profileBadgeStyle={match.profileBadgeStyle}
              isPremium={match.isPremium}
              size="small"
            />
          </p>
          {match.college && (
            <p className="mt-0.5 truncate text-[10px] text-gray-400 dark:text-neutral-500">{match.college}</p>
          )}
          {match.headline && (
            <p className="mt-0.5 truncate text-[10px] text-gray-500 dark:text-neutral-400">{match.headline}</p>
          )}
        </div>

        {/* Interest chips */}
        {match.interests && match.interests.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 px-2.5 pb-1.5">
            {match.interests.slice(0, 2).map((interest) => (
              <span
                key={interest}
                className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
              >
                {interest}
              </span>
            ))}
            {match.interests.length > 2 && (
              <span className="px-1 py-0.5 text-[9px] text-gray-400 dark:text-neutral-500">
                +{match.interests.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Reply rate badge */}
        {match.replyRate !== undefined && match.replyRate >= 50 && (
          <div className="flex justify-center pb-1.5">
            <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
              match.replyRate >= 80
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
            }`}>
              <MessageCircle className="w-2.5 h-2.5" />
              {match.replyRate}% reply rate
            </span>
          </div>
        )}
      </Link>

      {/* Connect button */}
      <div className="px-2.5 pb-2.5">
        {isConnected ? (
          <div className="flex w-full items-center justify-center gap-1.5 rounded-full bg-green-50 py-1.5 text-[11px] font-semibold text-green-600 dark:bg-green-900/20 dark:text-green-400">
            <Check className="w-3 h-3" />
            Request Sent
          </div>
        ) : (
          <button
            onClick={(e) => onConnect(e, match.id)}
            disabled={isConnecting}
            className={`flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-60 ${
              hasFailed
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            }`}
          >
            {isConnecting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <UserPlus className="w-3 h-3" />
            )}
            {hasFailed ? 'Failed — tap to retry' : 'Connect'}
          </button>
        )}
      </div>
    </motion.div>
  );
}
