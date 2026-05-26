'use client';

import { startTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import { getConversations } from '@/lib/api/chat';
import { matchingAPI } from '@/lib/api/matching';
import { getPeople, getPeopleFromSameCollege, getSuggestions, getFilterOptions } from '@/lib/api/people';
import { getProfile, getActivityYears } from '@/lib/api/profile';
import { initializeSocket } from '@/lib/socket';
import {
  ACTIVITY_STALE_TIME,
  CHAT_STALE_TIME,
  FIND_PEOPLE_STALE_TIME,
  PROFILE_STALE_TIME,
  queryKeys,
} from '@/lib/queryKeys';

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function AppWarmup() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const warmedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user?.id) return;
    if (warmedUserIdRef.current === user.id) return;

    warmedUserIdRef.current = user.id;
    initializeSocket();

    const profileTargets = [user.id, user.username].filter(
      (value, index, values) => !!value && values.indexOf(value) === index
    );
    const routeTargets = ['/', '/reels', '/find-people', '/profile', '/messages'];
    const safeWarm = async (job: () => Promise<unknown>) => {
      try {
        await job();
      } catch {
        // Warmup is best-effort only. Failed prefetches should never block navigation.
      }
    };

    const warmRoutes = () => {
      startTransition(() => {
        routeTargets.forEach((route) => router.prefetch(route));
      });
    };

    const warmQueries = async () => {
      for (const profileTarget of profileTargets) {
        await safeWarm(() =>
          queryClient.prefetchQuery({
            queryKey: queryKeys.profile(profileTarget),
            queryFn: () => getProfile(profileTarget),
            staleTime: PROFILE_STALE_TIME,
          })
        );
      }

      await safeWarm(() =>
        queryClient.prefetchQuery({
          queryKey: queryKeys.profileActivityYears(user.id),
          queryFn: () => getActivityYears(user.id),
          staleTime: ACTIVITY_STALE_TIME,
        })
      );

      await safeWarm(() =>
        queryClient.prefetchQuery({
          queryKey: queryKeys.chatConversations(user.id),
          queryFn: () => getConversations(30),
          staleTime: CHAT_STALE_TIME,
        })
      );

      await safeWarm(() =>
        queryClient.prefetchQuery({
          queryKey: queryKeys.findPeopleInitial(),
          queryFn: async () => {
            const [allPeopleRes, suggestionsRes, collegeRes] = await Promise.all([
              getPeople({}, { page: 1, limit: 20 }),
              getSuggestions(10).catch(() => ({ suggestions: [] })),
              getPeopleFromSameCollege(10).catch(() => ({ people: [] })),
            ]);

            return {
              people: allPeopleRes.people,
              total: allPeopleRes.total,
              hasMore: allPeopleRes.hasMore,
              suggestions: suggestionsRes.suggestions,
              colleaguePeople: collegeRes.people,
            };
          },
          staleTime: FIND_PEOPLE_STALE_TIME,
        })
      );

      await safeWarm(() =>
        queryClient.prefetchQuery({
          queryKey: queryKeys.peopleFilterOptions(),
          queryFn: getFilterOptions,
          staleTime: FIND_PEOPLE_STALE_TIME,
        })
      );

      await safeWarm(() =>
        queryClient.prefetchQuery({
          queryKey: queryKeys.smartMatches('all'),
          queryFn: () => matchingAPI.getSmartMatches({ type: 'all', limit: 20 }),
          staleTime: FIND_PEOPLE_STALE_TIME,
        })
      );
    };

    const idleWindow = window as IdleWindow;
    const connection = (navigator as Navigator & {
      connection?: {
        saveData?: boolean;
        effectiveType?: string;
      };
    }).connection as
      | {
          saveData?: boolean;
          effectiveType?: string;
        }
      | undefined;
    const shouldDelay =
      connection?.saveData || connection?.effectiveType?.includes('2g');

    const routeTimeoutId = window.setTimeout(warmRoutes, 120);
    let queryTimeoutId: number | undefined;
    let idleId: number | undefined;

    if (idleWindow.requestIdleCallback && !shouldDelay) {
      idleId = idleWindow.requestIdleCallback(() => {
        void warmQueries();
      }, { timeout: 4000 });
    } else {
      queryTimeoutId = window.setTimeout(() => {
        void warmQueries();
      }, shouldDelay ? 2200 : 900);
    }

    return () => {
      if (idleId !== undefined) {
        idleWindow.cancelIdleCallback?.(idleId);
      }
      if (routeTimeoutId !== undefined) {
        window.clearTimeout(routeTimeoutId);
      }
      if (queryTimeoutId !== undefined) {
        window.clearTimeout(queryTimeoutId);
      }
    };
  }, [loading, queryClient, router, user?.id, user?.username]);

  return null;
}
