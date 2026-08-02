'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { matchingAPI, type SmartMatch } from '@/lib/api/matching';
import { ChevronRight } from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth } from '@/lib/auth/useAuth';
import {
  DAILY_MODULE_CACHE_TTL_MS,
  readDailyModule,
  writeDailyModule,
} from '@/lib/feed/dailyModulesCache';

function isSmartMatchList(value: unknown): value is SmartMatch[] {
  return Array.isArray(value) && value.every((match) => (
    typeof match === 'object' &&
    match !== null &&
    typeof (match as SmartMatch).user?.id === 'string'
  ));
}

export function RecommendedPeople() {
  const router = useRouter();
  const { user } = useAuth();
  const cachedMatches = useMemo(
    () => readDailyModule(user?.id, 'smart-matches', isSmartMatchList),
    [user?.id]
  );

  const { data, dataUpdatedAt, isLoading } = useQuery({
    queryKey: ['smart-matches', 'feed', user?.id],
    queryFn: async () => {
      const res = await matchingAPI.getSmartMatches({ type: 'all', limit: 8 });
      return res.matches;
    },
    enabled: Boolean(user?.id),
    initialData: cachedMatches?.value,
    initialDataUpdatedAt: cachedMatches?.savedAt,
    staleTime: DAILY_MODULE_CACHE_TTL_MS,
    gcTime: DAILY_MODULE_CACHE_TTL_MS,
  });

  useEffect(() => {
    if (user?.id && data && dataUpdatedAt > (cachedMatches?.savedAt ?? 0)) {
      writeDailyModule(user.id, 'smart-matches', data, dataUpdatedAt);
    }
  }, [cachedMatches?.savedAt, data, dataUpdatedAt, user?.id]);

  const matches = data ?? [];

  if (isLoading && matches.length === 0) {
    return (
      <div className="px-3 py-2.5 sm:px-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="h-4 w-32 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="flex gap-2.5 overflow-hidden sm:gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[134px] w-[128px] flex-shrink-0 animate-pulse rounded-xl bg-gray-100 dark:bg-neutral-900" />
          ))}
        </div>
      </div>
    );
  }

  if (matches.length === 0) return null;

  return (
    <div className="py-3">
      <div className="mb-2 flex items-center justify-between px-3 sm:px-4">
        <h3 className="text-[13px] font-semibold text-gray-900 sm:text-sm dark:text-white">People like you</h3>
        <button
          onClick={() => router.push('/find-people')}
          className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-50 sm:text-xs dark:text-blue-400 dark:hover:bg-blue-900/20"
        >
          See all <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="scrollbar-hide flex gap-2.5 overflow-x-auto px-3 pb-1 sm:gap-3 sm:px-4">
        {matches.map((match, i) => {
          const strongMatch = match.matchPercentage >= 60;
          return (
            <motion.button
              key={match.user.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => router.push(`/profile/${match.user.username}`)}
              className="flex w-[128px] flex-shrink-0 cursor-pointer flex-col items-center rounded-xl border border-gray-100 bg-white px-2 pb-2.5 pt-3 transition-all hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
            >
              <div
                className={`h-14 w-14 rounded-full p-[2px] ${
                  strongMatch
                    ? 'bg-gradient-to-br from-emerald-400 to-green-500'
                    : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                }`}
              >
                <UserAvatar
                  imageSrc={match.user.profileImage}
                  name={match.user.name}
                  className="h-full w-full border-2 border-white bg-gray-100 text-base font-bold text-gray-400 dark:border-neutral-900 dark:bg-neutral-800"
                  fallbackClassName="text-base font-bold"
                />
              </div>

              <span
                className={`z-10 -mt-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm ${
                  strongMatch ? 'bg-green-500' : 'bg-blue-500'
                }`}
              >
                {match.matchPercentage}% match
              </span>

              <p className="mt-1.5 w-full truncate text-center text-xs font-semibold text-gray-900 dark:text-white">
                {match.user.name}
              </p>
              {(match.user.college || match.user.headline) && (
                <p className="mt-0.5 w-full truncate text-center text-[10px] text-gray-500 dark:text-neutral-500">
                  {match.user.college || match.user.headline}
                </p>
              )}

              {match.reasons[0] && (
                <span className="mt-1.5 max-w-full truncate rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  {match.reasons[0]}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
