'use client';

import { useEffect } from 'react';
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getStreakHistory,
  getStreaks,
  type StreakData,
  type StreakHistoryItem,
  type StreakLeaderboardResponse,
  type StreakType,
  getStreakLeaderboard,
} from '@/lib/api/engagement';
import { getMyGameStats, getLeaderboard, type GameStats, type LeaderboardEntry } from '@/lib/api/games';
import { getWalletXpBalance } from '@/lib/api/store';
import { useAuth } from '@/lib/auth/useAuth';
import { queryKeys } from '@/lib/queryKeys';
import { getSocket, initializeSocket } from '@/lib/socket';

export const LIVE_GAMIFICATION_STALE_TIME = 15_000;
export const LIVE_GAMIFICATION_REFETCH_INTERVAL = 30_000;

function useGamificationEnabled(enabled: boolean = true): boolean {
  const { isAuthenticated, loading } = useAuth();
  return enabled && !loading && isAuthenticated;
}

export async function invalidateGamificationQueries(
  queryClient: QueryClient
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: queryKeys.gamification() });
}

export function useLiveStreaks(options?: { enabled?: boolean }) {
  const enabled = useGamificationEnabled(options?.enabled);

  return useQuery<StreakData>({
    queryKey: queryKeys.streaks(),
    queryFn: getStreaks,
    enabled,
    staleTime: LIVE_GAMIFICATION_STALE_TIME,
    refetchInterval: LIVE_GAMIFICATION_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

export function useLiveStreakHistory(limit: number = 20, options?: { enabled?: boolean }) {
  const enabled = useGamificationEnabled(options?.enabled);

  return useQuery<StreakHistoryItem[]>({
    queryKey: queryKeys.streakHistory(limit),
    queryFn: () => getStreakHistory(limit),
    enabled,
    staleTime: LIVE_GAMIFICATION_STALE_TIME,
    refetchInterval: LIVE_GAMIFICATION_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

export function useLiveWalletXpBalance(options?: { enabled?: boolean }) {
  const enabled = useGamificationEnabled(options?.enabled);

  return useQuery<number>({
    queryKey: queryKeys.xpBalance(),
    queryFn: getWalletXpBalance,
    enabled,
    staleTime: LIVE_GAMIFICATION_STALE_TIME,
    refetchInterval: LIVE_GAMIFICATION_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

export const useLiveXpBalance = useLiveWalletXpBalance;

export function useLiveGameStats(options?: { enabled?: boolean }) {
  const enabled = useGamificationEnabled(options?.enabled);

  return useQuery<{ stats: GameStats }>({
    queryKey: queryKeys.gameStats(),
    queryFn: getMyGameStats,
    enabled,
    staleTime: LIVE_GAMIFICATION_STALE_TIME,
    refetchInterval: LIVE_GAMIFICATION_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

export function useLiveGameLeaderboard(
  gameType: string = 'all',
  period: string = 'alltime',
  limit: number = 20,
  options?: { enabled?: boolean }
) {
  const enabled = useGamificationEnabled(options?.enabled);

  return useQuery<{ leaderboard: LeaderboardEntry[] }>({
    queryKey: queryKeys.gameLeaderboard(gameType, period, limit),
    queryFn: () => getLeaderboard(gameType, period, limit),
    enabled,
    staleTime: LIVE_GAMIFICATION_STALE_TIME,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });
}

export function useLiveStreakLeaderboard(
  type: StreakType = 'connection',
  limit: number = 20,
  options?: { enabled?: boolean }
) {
  const enabled = useGamificationEnabled(options?.enabled);

  return useQuery<StreakLeaderboardResponse>({
    queryKey: ['gamification', 'streak-leaderboard', type, limit],
    queryFn: () => getStreakLeaderboard(type, limit),
    enabled,
    staleTime: LIVE_GAMIFICATION_STALE_TIME,
    refetchInterval: LIVE_GAMIFICATION_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

export function useGamificationRealtimeSync() {
  const enabled = useGamificationEnabled();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket() ?? initializeSocket();
    const invalidate = () => {
      void invalidateGamificationQueries(queryClient);
    };

    const handleStreakUpdated = () => {
      invalidate();
    };

    const handleNotificationNew = (payload: { type?: string } | undefined) => {
      if (
        payload?.type === 'xp_earned' ||
        payload?.type === 'streak_milestone' ||
        payload?.type === 'streak_lost'
      ) {
        invalidate();
      }
    };

    socket.on('streak:updated', handleStreakUpdated);
    socket.on('notification:new', handleNotificationNew);

    return () => {
      socket.off('streak:updated', handleStreakUpdated);
      socket.off('notification:new', handleNotificationNew);
    };
  }, [enabled, queryClient]);
}
