'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { matchingAPI } from '@/lib/api/matching';
import { Zap, ChevronRight } from 'lucide-react';

export function RecommendedPeople() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['smart-matches', 'feed'],
    queryFn: async () => {
      const res = await matchingAPI.getSmartMatches({ type: 'all', limit: 8 });
      return res.matches;
    },
    staleTime: 5 * 60 * 1000, // 5 min - cached when navigating back
    gcTime: 10 * 60 * 1000,
  });

  const matches = data ?? [];

  if (isLoading && matches.length === 0) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-32 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-shrink-0 w-[140px] h-[160px] rounded-2xl bg-gray-100 dark:bg-neutral-900 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (matches.length === 0) return null;

  return (
    <div className="py-4">
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-blue-500" />
          </span>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">People like you</h3>
        </div>
        <button
          onClick={() => router.push('/find-people')}
          className="flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        >
          See all <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {matches.map((match, i) => {
          const strongMatch = match.matchPercentage >= 60;
          return (
            <motion.button
              key={match.user.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => router.push(`/profile/${match.user.username}`)}
              className="flex-shrink-0 w-[150px] flex flex-col items-center bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 px-3 pt-4 pb-3.5 cursor-pointer hover:shadow-md hover:border-gray-200 dark:hover:border-neutral-700 hover:-translate-y-0.5 transition-all"
            >
              <div
                className={`w-[68px] h-[68px] rounded-full p-[2px] ${
                  strongMatch
                    ? 'bg-gradient-to-br from-emerald-400 to-green-500'
                    : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                }`}
              >
                <div className="w-full h-full rounded-full border-2 border-white dark:border-neutral-900 bg-gray-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden">
                  {match.user.profileImage ? (
                    <img src={match.user.profileImage} alt={match.user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-gray-400 text-xl">{match.user.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </div>

              <span
                className={`-mt-2 z-10 px-2 py-[3px] rounded-full text-[10px] font-bold text-white shadow-sm ${
                  strongMatch ? 'bg-green-500' : 'bg-blue-500'
                }`}
              >
                {match.matchPercentage}% match
              </span>

              <p className="mt-2 w-full text-[13px] font-semibold text-gray-900 dark:text-white text-center truncate">
                {match.user.name}
              </p>
              {(match.user.college || match.user.headline) && (
                <p className="w-full text-[11px] text-gray-500 dark:text-neutral-500 text-center truncate mt-0.5">
                  {match.user.college || match.user.headline}
                </p>
              )}

              {match.reasons[0] && (
                <span className="mt-2 max-w-full px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-medium truncate">
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
