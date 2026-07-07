'use client';

export const STANDARD_STALE_TIME = 60 * 1000;
export const STANDARD_GC_TIME = 10 * 60 * 1000;
export const FEED_STALE_TIME = 30 * 1000;
export const PROFILE_STALE_TIME = 2 * 60 * 1000;
export const ACTIVITY_STALE_TIME = 60 * 60 * 1000;
export const FIND_PEOPLE_STALE_TIME = 5 * 60 * 1000;
export const CHAT_STALE_TIME = 2 * 60 * 1000;
export const CHAT_GC_TIME = 60 * 60 * 1000;
export const NOTIFICATION_STALE_TIME = 15 * 1000;

export const queryKeys = {
  gamification: () => ['gamification'] as const,
  streaks: () => ['gamification', 'streaks'] as const,
  streakHistory: (limit: number = 20) =>
    ['gamification', 'streak-history', limit] as const,
  xpBalance: () => ['gamification', 'xp-balance'] as const,
  gameStats: () => ['gamification', 'game-stats'] as const,
  gameLeaderboard: (
    gameType: string = 'all',
    period: string = 'alltime',
    limit: number = 20
  ) => ['gamification', 'game-leaderboard', gameType, period, limit] as const,
  feed: (userId?: string | null) => ['feed', userId] as const,
  reelsFeed: (mode: 'foryou' | 'following' = 'foryou') =>
    ['reels-feed', mode] as const,
  stories: (userId?: string | null) => ['stories', userId] as const,
  dailyHooks: () => ['daily-hooks'] as const,
  dailyMatches: () => ['daily-matches'] as const,
  smartMatchesFeed: () => ['smart-matches', 'feed'] as const,
  smartMatches: (type: string = 'all') => ['smart-matches', type] as const,
  peopleFromCollege: () => ['people-from-college'] as const,
  findPeopleInitial: () => ['find-people-initial'] as const,
  peopleFilterOptions: () => ['people-filter-options'] as const,
  profile: (userId: string) => ['profile', userId] as const,
  profileActivityYears: (userId: string) =>
    ['profile-activity-years', userId] as const,
  profileActivityHeatmap: (userId: string, year?: number | null) =>
    ['profile-activity-heatmap', userId, year ?? 'recent'] as const,
  chatConversations: (userId?: string | null) =>
    ['chat-conversations', userId] as const,
  chatConversation: (conversationId: string) =>
    ['chat-conversation', conversationId] as const,
  chatMessages: (conversationId: string) =>
    ['chat-messages', conversationId] as const,
};
