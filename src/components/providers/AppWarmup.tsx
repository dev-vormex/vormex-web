'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import { initializeSocket, SAFETY_STATE_CHANGED_EVENT } from '@/lib/socket';
import { reelsApi, type ReelsFeedResponse } from '@/lib/api/reels';
import { queryKeys } from '@/lib/queryKeys';
import { refreshSafetySensitiveQueries } from '@/lib/safety/clientCleanup';

export function AppWarmup() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const warmedUserIdRef = useRef<string | null>(null);
  const reelWarmersRef = useRef<HTMLVideoElement[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const handleSafetyStateChanged = () => {
      void refreshSafetySensitiveQueries(queryClient, user.id);
    };
    window.addEventListener(SAFETY_STATE_CHANGED_EVENT, handleSafetyStateChanged);
    return () => window.removeEventListener(SAFETY_STATE_CHANGED_EVENT, handleSafetyStateChanged);
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (loading || !user?.id || warmedUserIdRef.current === user.id) return;

    warmedUserIdRef.current = user.id;
    initializeSocket();

    let cancelled = false;
    const reelsKey = queryKeys.reelsFeed('foryou');

    void queryClient.prefetchInfiniteQuery({
      queryKey: reelsKey,
      queryFn: async ({ pageParam }) => (
        await reelsApi.getFeed({
          cursor: pageParam as string | undefined,
          limit: 6,
          mode: 'foryou',
        }) as unknown as ReelsFeedResponse
      ),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      staleTime: 5 * 60 * 1000,
      pages: 1,
    }).then(() => {
      if (cancelled) return;

      const cached = queryClient.getQueryData<InfiniteData<ReelsFeedResponse>>(reelsKey);
      const firstReels = cached?.pages[0]?.reels.slice(0, 3) ?? [];

      reelWarmersRef.current.forEach((video) => {
        video.removeAttribute('src');
        video.load();
      });

      reelWarmersRef.current = firstReels.map((reel) => {
        if (reel.thumbnailUrl) {
          const thumbnail = new Image();
          thumbnail.src = reel.thumbnailUrl;
        }

        const video = document.createElement('video');
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        video.src = reel.videoUrl;
        video.load();
        return video;
      });
    }).catch(() => {
      // Reels still retain their page-level retry state if background warm-up fails.
    });

    return () => {
      cancelled = true;
      warmedUserIdRef.current = null;
      reelWarmersRef.current.forEach((video) => {
        video.removeAttribute('src');
        video.load();
      });
      reelWarmersRef.current = [];
    };
  }, [loading, queryClient, user?.id]);

  return null;
}
