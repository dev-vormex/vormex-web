'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { matchingAPI, type SmartMatch } from '@/lib/api/matching';
import { getDailyMatches, type DailyMatch, type DailyMatchesResponse } from '@/lib/api/engagement';
import { ConnectButton } from '@/components/connections/ConnectButton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { useAuth } from '@/lib/auth/useAuth';
import {
  DAILY_MODULE_CACHE_TTL_MS,
  readDailyModule,
  writeDailyModule,
} from '@/lib/feed/dailyModulesCache';
import {
  RAIL_ACTION,
  RAIL_CARD,
  RAIL_HEADING,
  REASON_CHIP,
  REASON_CHIP_STRONG,
} from '@/components/feed/surface';

/**
 * PeopleRail — the single people-discovery module above the feed.
 *
 * Replaces the two rails that used to stack here (RecommendedPeople, which
 * showed a raw "% match", and TodayMatchesSection, which showed a reply rate).
 * They drew from different endpoints with different card sizes and badges, so
 * the top of the feed read as two teams shipping independently.
 *
 * Two deliberate departures from the old cards:
 *
 * 1. No match percentage. The scores in practice land between 9% and 35%, and
 *    "9% match" reads as a rejection. Every card now carries a human reason
 *    instead ("Same campus", "Both learning ML").
 * 2. Reasons are deduped across the row. Previously every card called
 *    `reasons[0]`, so "You can help with AI/ML" appeared four times in a row
 *    and the rail looked templated.
 */

const CARD_WIDTH = 158;

type RailPerson = {
  id: string;
  username: string;
  name: string;
  headline: string | null;
  college: string | null;
  profileImage: string | null;
  interests: string[];
  isOnline: boolean;
  replyRate: number | null;
  isPremium?: boolean;
  profileBadgeStyle?: string | null;
  /** Candidate reasons in priority order; the rail picks the first unused one. */
  reasonCandidates: string[];
};

function isSmartMatchList(value: unknown): value is SmartMatch[] {
  return Array.isArray(value) && value.every((match) => (
    typeof match === 'object' &&
    match !== null &&
    typeof (match as SmartMatch).user?.id === 'string'
  ));
}

function isDailyMatchesResponse(value: unknown): value is DailyMatchesResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DailyMatchesResponse>;
  return Array.isArray(candidate.matches) && typeof candidate.matchCount === 'number';
}

/**
 * Server reason strings arrive title-cased and sometimes sentence-like
 * ("Shared goals: X, Y."). Trim them to a chip-sized label.
 */
function tidyReason(reason: string): string {
  const cleaned = reason.trim().replace(/\.$/, '');
  if (!cleaned) return '';
  return cleaned.length > 26 ? `${cleaned.slice(0, 25).trimEnd()}…` : cleaned;
}

function dailyMatchToPerson(
  match: DailyMatch,
  viewer: { college?: string | null } | null
): RailPerson {
  /*
   * Only signals that are actually measured get to become a reason.
   * `replyRate` is deliberately excluded: the backend fills it with
   * `Math.random()`, so a "Replies fast" chip would be fabricated behavioural
   * data. `interests` is not returned by this endpoint at all, hence the guard.
   */
  const reasonCandidates: string[] = [];
  if (viewer?.college && match.college && viewer.college === match.college) {
    reasonCandidates.push('Same campus');
  }
  if (match.isOnline) reasonCandidates.push('Online now');
  (match.interests ?? []).slice(0, 2).forEach((interest) => {
    reasonCandidates.push(`Into ${interest}`);
  });
  reasonCandidates.push('Matched for you today');

  return {
    id: match.id,
    username: match.username,
    name: match.name,
    headline: match.headline,
    college: match.college,
    profileImage: match.profileImage,
    interests: match.interests ?? [],
    isOnline: match.isOnline,
    replyRate: typeof match.replyRate === 'number' ? match.replyRate : null,
    isPremium: match.isPremium,
    profileBadgeStyle: match.profileBadgeStyle,
    reasonCandidates,
  };
}

function smartMatchToPerson(match: SmartMatch): RailPerson {
  // Server reasons are already human-readable ("Same college", "Shared goal",
  // "You can help with X") — they just need trimming and a fallback.
  const reasonCandidates = (match.reasons || [])
    .map(tidyReason)
    .filter(Boolean);
  (match.user.interests || []).slice(0, 2).forEach((interest) => {
    reasonCandidates.push(`Into ${interest}`);
  });
  reasonCandidates.push('Similar to you');

  return {
    id: match.user.id,
    username: match.user.username,
    name: match.user.name,
    headline: match.user.headline,
    college: match.user.college,
    profileImage: match.user.profileImage,
    interests: match.user.interests || [],
    isOnline: false,
    replyRate: null,
    isPremium: match.user.isPremium,
    profileBadgeStyle: match.user.profileBadgeStyle,
    reasonCandidates,
  };
}

/**
 * Assigns each person the highest-priority reason not already shown in the row,
 * so no label repeats. Falls back to the person's own top reason once every
 * candidate is taken.
 */
function assignDistinctReasons(people: RailPerson[]): Array<RailPerson & { reason: string }> {
  const used = new Set<string>();
  return people.map((person) => {
    const fresh = person.reasonCandidates.find((reason) => reason && !used.has(reason));
    const reason = fresh || person.reasonCandidates[0] || 'Suggested for you';
    used.add(reason);
    return { ...person, reason };
  });
}

const STRONG_REASONS = new Set(['Online now', 'Same campus']);

export function PeopleRail() {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const cachedDaily = useMemo(
    () => readDailyModule(user?.id, 'daily-matches', isDailyMatchesResponse),
    [user?.id]
  );
  const cachedSmart = useMemo(
    () => readDailyModule(user?.id, 'smart-matches', isSmartMatchList),
    [user?.id]
  );

  const daily = useQuery({
    queryKey: ['daily-matches', user?.id],
    queryFn: getDailyMatches,
    enabled: Boolean(user?.id),
    initialData: cachedDaily?.value,
    initialDataUpdatedAt: cachedDaily?.savedAt,
    staleTime: DAILY_MODULE_CACHE_TTL_MS,
    gcTime: DAILY_MODULE_CACHE_TTL_MS,
  });

  const smart = useQuery({
    queryKey: ['smart-matches', 'feed', user?.id],
    queryFn: async () => {
      const res = await matchingAPI.getSmartMatches({ type: 'all', limit: 8 });
      return res.matches;
    },
    enabled: Boolean(user?.id),
    initialData: cachedSmart?.value,
    initialDataUpdatedAt: cachedSmart?.savedAt,
    staleTime: DAILY_MODULE_CACHE_TTL_MS,
    gcTime: DAILY_MODULE_CACHE_TTL_MS,
  });

  useEffect(() => {
    if (user?.id && daily.data && daily.dataUpdatedAt > (cachedDaily?.savedAt ?? 0)) {
      writeDailyModule(user.id, 'daily-matches', daily.data, daily.dataUpdatedAt);
    }
  }, [cachedDaily?.savedAt, daily.data, daily.dataUpdatedAt, user?.id]);

  useEffect(() => {
    if (user?.id && smart.data && smart.dataUpdatedAt > (cachedSmart?.savedAt ?? 0)) {
      writeDailyModule(user.id, 'smart-matches', smart.data, smart.dataUpdatedAt);
    }
  }, [cachedSmart?.savedAt, smart.data, smart.dataUpdatedAt, user?.id]);

  // Today's curated matches lead; smart matches backfill the tail so the rail
  // still fills out on days when the daily set is thin.
  const people = useMemo(() => {
    const seen = new Set<string>();
    const merged: RailPerson[] = [];

    for (const match of daily.data?.matches ?? []) {
      if (seen.has(match.id)) continue;
      seen.add(match.id);
      merged.push(dailyMatchToPerson(match, user ?? null));
    }
    for (const match of smart.data ?? []) {
      if (seen.has(match.user.id)) continue;
      seen.add(match.user.id);
      merged.push(smartMatchToPerson(match));
    }

    return assignDistinctReasons(merged.slice(0, 12));
  }, [daily.data, smart.data, user]);

  const syncScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    syncScrollState();
    el.addEventListener('scroll', syncScrollState, { passive: true });
    window.addEventListener('resize', syncScrollState);
    return () => {
      el.removeEventListener('scroll', syncScrollState);
      window.removeEventListener('resize', syncScrollState);
    };
  }, [people.length, syncScrollState]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({
      left: dir === 'left' ? -(CARD_WIDTH * 2) : CARD_WIDTH * 2,
      behavior: 'smooth',
    });
  };

  const isLoading = (daily.isLoading && !daily.data) || (smart.isLoading && !smart.data);

  if (isLoading && people.length === 0) {
    return (
      <section className="py-3">
        <div className="mb-2.5 px-3 sm:px-4 lg:px-0">
          <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-neutral-800" />
        </div>
        <div className="flex gap-3 overflow-hidden px-3 sm:px-4 lg:px-0">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[214px] flex-shrink-0 animate-pulse rounded-2xl bg-gray-100 dark:bg-neutral-800/60"
              style={{ width: CARD_WIDTH }}
            />
          ))}
        </div>
      </section>
    );
  }

  if (people.length === 0) return null;

  return (
    <section className="relative py-3">
      {/* Padding mirrors the post column so the rail lines up with the cards. */}
      <div className="mb-2.5 flex items-baseline justify-between px-3 sm:px-4 lg:px-0">
        <div className="flex items-baseline gap-2">
          <h2 className={RAIL_HEADING}>People worth knowing</h2>
          <span className="text-[11px] text-gray-400 dark:text-neutral-500">
            {people.length}
          </span>
        </div>
        <Link href="/find-people" className={RAIL_ACTION}>
          See all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          className="absolute left-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 shadow-md backdrop-blur transition-colors hover:bg-gray-50 lg:flex dark:border-neutral-700 dark:bg-neutral-800/95 dark:hover:bg-neutral-700"
        >
          <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-neutral-300" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          className="absolute right-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 shadow-md backdrop-blur transition-colors hover:bg-gray-50 lg:flex dark:border-neutral-700 dark:bg-neutral-800/95 dark:hover:bg-neutral-700"
        >
          <ChevronRight className="h-4 w-4 text-gray-600 dark:text-neutral-300" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-3 overflow-x-auto px-3 pb-1 sm:px-4 lg:px-0"
        style={{ scrollSnapType: 'x proximity' }}
      >
        {people.map((person, index) => (
          <PersonCard key={person.id} person={person} index={index} />
        ))}
      </div>
    </section>
  );
}

function PersonCard({
  person,
  index,
}: {
  person: RailPerson & { reason: string };
  index: number;
}) {
  const subtitle = person.college || person.headline;
  const strong = STRONG_REASONS.has(person.reason);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index, 6) * 0.03 }}
      className={RAIL_CARD}
      style={{ width: CARD_WIDTH, scrollSnapAlign: 'start' }}
    >
      {/*
        Fixed-height rows rather than natural flow. The old cards let optional
        fields (college, headline, interests) collapse, so a person missing a
        headline produced a shorter card and the Connect buttons in a row never
        lined up.
      */}
      <Link href={`/profile/${person.username}`} className="block px-2.5 pt-3.5">
        <div className="flex justify-center">
          <div className="relative">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 p-[2px]">
              <UserAvatar
                imageSrc={person.profileImage}
                name={person.name}
                className="h-full w-full border-2 border-white bg-gray-100 text-base font-bold text-gray-400 dark:border-neutral-900 dark:bg-neutral-800"
                fallbackClassName="text-base font-bold"
              />
            </div>
            {person.isOnline && (
              <span
                className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-neutral-900"
                aria-label="Online"
              />
            )}
          </div>
        </div>

        <div className="mt-2 flex h-4 items-center justify-center gap-1">
          <span className="truncate text-[13px] font-semibold text-gray-900 dark:text-white">
            {person.name}
          </span>
          <VerificationBadge
            profileBadgeStyle={person.profileBadgeStyle}
            isPremium={person.isPremium}
            size="small"
          />
        </div>

        <p className="mt-1 flex h-4 items-center justify-center truncate text-[10.5px] text-gray-500 dark:text-neutral-400">
          {subtitle || ' '}
        </p>

        <div className="mt-2 flex h-[18px] items-center justify-center">
          <span className={strong ? REASON_CHIP_STRONG : REASON_CHIP}>{person.reason}</span>
        </div>
      </Link>

      <div className="px-2.5 pb-2.5 pt-2.5">
        {/*
          The daily-match and smart-match endpoints both exclude anyone the
          viewer already has a connection row with, so these cards start at
          "none" and only the shared store can move them.
        */}
        <ConnectButton userId={person.id} variant="solid" />
      </div>
    </motion.div>
  );
}

export default PeopleRail;
