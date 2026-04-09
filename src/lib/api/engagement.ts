import apiClient from './client';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface StreakData {
  connectionStreak: number;
  longestConnectionStreak: number;
  loginStreak: number;
  longestLoginStreak: number;
  postingStreak: number;
  longestPostingStreak: number;
  messagingStreak: number;
  longestMessagingStreak: number;
  overallBestStreak: number;
  weeklyConnectionsMade: number;
  weeklyConnectionsGoal: number;
  streakFreezes: number;
  streakShieldActive: boolean;
  totalFreezesUsed: number;
  isAtRisk: Record<string, boolean>;
  engagementScore: number;
  showOnProfile: boolean;
}

export interface PublicStreakData {
  visible: boolean;
  bestCurrentStreak: number | null;
  overallBestStreak: number | null;
  streaks: {
    connection: { current: number; longest: number };
    login: { current: number; longest: number };
    posting: { current: number; longest: number };
    messaging: { current: number; longest: number };
  } | null;
  engagementScore: number | null;
}

export interface StreakHistoryItem {
  id: string;
  streakId: string;
  userId: string;
  streakType: string;
  event: string;
  streakBefore: number;
  streakAfter: number;
  milestoneDay: number | null;
  badgeSlug: string | null;
  xpEarned: number;
  createdAt: string;
}

export type StreakType = 'connection' | 'login' | 'posting' | 'messaging';

export interface StreakLeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    name: string;
    profileImage: string | null;
    college: string | null;
    bio: string | null;
  };
  currentStreak: number;
  longestStreak: number;
}

export interface StreakLeaderboardResponse {
  streakType: string;
  leaderboard: StreakLeaderboardEntry[];
  updatedAt: string | null;
}

export interface StreakFreezeResponse {
  message: string;
  freezesRemaining: number;
  xpSpent: number;
}

export interface StreakShieldResponse {
  message: string;
  shieldActive: boolean;
}

export interface StreakVisibilityResponse {
  message: string;
  showOnProfile: boolean;
}

export interface ConnectionReward {
  animationType: string;
  showConfetti: boolean;
  celebrationMessage: string;
  receiverReplyRate: number;
  replyRateMessage: string;
}

export interface DailyMatch {
  id: string;
  username: string;
  name: string;
  profileImage: string | null;
  headline: string | null;
  college: string | null;
  interests: string[];
  isOnline: boolean;
  replyRate: number;
}

export interface DailyMatchesResponse {
  matches: DailyMatch[];
  matchCount: number;
  surpriseMessage?: string;
}

export type HiddenGemResponse = {
  match: DailyMatch;
  message: string;
} | null;

export interface LiveActivity {
  activeUsersNow: number;
  connectionsToday: number;
  newUsersToday: number;
  locationLabel: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  name: string;
  profileImage: string | null;
  college: string | null;
  connectionCount: number;
}

export interface LeaderboardResponse {
  period: string;
  leaderboard: LeaderboardEntry[];
  updatedAt: string;
}

export interface ProgressNudge {
  type: string;
  message: string;
  progress: number;
  target: number;
  icon: string;
}

export interface WeeklyGoals {
  id: string;
  weekStart: string;
  connectionsTarget: number;
  postsTarget: number;
  messagesTarget: number;
  connectionsMade: number;
  postsMade: number;
  messagesSent: number;
  isCompleted: boolean;
  xpEarned: number;
  connectionsProgress: number;
  postsProgress: number;
  messagesProgress: number;
}

export interface ConnectionLimit {
  canSend: boolean;
  remaining: number;
  limit: number;
  resetsAt: string;
}

export interface SessionSummary {
  connectionsAccepted: number;
  newPosts: number;
  messagesCount: number;
  message: string;
  emoji: string;
}

export interface CelebrationData {
  otherUser: {
    name: string;
    profileImage: string | null;
    username: string;
  };
  mutualConnections: number;
  celebrationMessage: string;
  showConfetti: boolean;
}

export interface EngagementDashboard {
  streaks: StreakData;
  weeklyGoals: WeeklyGoals;
  nudges: ProgressNudge[];
  connectionLimit: ConnectionLimit;
  liveActivity: LiveActivity;
  trending: {
    isActive: boolean;
    message?: string;
    viewCount?: number;
  };
}

type WrappedApiResponse<T> = T | { data?: T } | null | undefined;

function unwrapApiData<T>(response: WrappedApiResponse<T>): T {
  if (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    (response as { data?: T }).data !== undefined
  ) {
    return (response as { data: T }).data;
  }

  return response as T;
}

function getNumber(value: unknown, fallback: number = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getBoolean(value: unknown, fallback: boolean = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeStreakData(raw: Partial<StreakData> | null | undefined): StreakData {
  return {
    connectionStreak: getNumber(raw?.connectionStreak),
    longestConnectionStreak: getNumber(
      raw?.longestConnectionStreak ?? raw?.connectionStreak
    ),
    loginStreak: getNumber(raw?.loginStreak),
    longestLoginStreak: getNumber(raw?.longestLoginStreak ?? raw?.loginStreak),
    postingStreak: getNumber(raw?.postingStreak),
    longestPostingStreak: getNumber(
      raw?.longestPostingStreak ?? raw?.postingStreak
    ),
    messagingStreak: getNumber(raw?.messagingStreak),
    longestMessagingStreak: getNumber(
      raw?.longestMessagingStreak ?? raw?.messagingStreak
    ),
    overallBestStreak: getNumber(raw?.overallBestStreak),
    weeklyConnectionsMade: getNumber(raw?.weeklyConnectionsMade),
    weeklyConnectionsGoal: getNumber(raw?.weeklyConnectionsGoal),
    streakFreezes: getNumber(raw?.streakFreezes),
    streakShieldActive: getBoolean(raw?.streakShieldActive),
    totalFreezesUsed: getNumber(raw?.totalFreezesUsed),
    isAtRisk: raw?.isAtRisk ?? {},
    engagementScore: getNumber(raw?.engagementScore),
    showOnProfile: getBoolean(raw?.showOnProfile, true),
  };
}

function normalizePublicStreakData(
  raw: Record<string, unknown> | null | undefined
): PublicStreakData {
  const streaks = {
    connection: {
      current: getNumber(raw?.connectionStreak),
      longest: getNumber(raw?.longestConnectionStreak ?? raw?.connectionStreak),
    },
    login: {
      current: getNumber(raw?.loginStreak),
      longest: getNumber(raw?.longestLoginStreak ?? raw?.loginStreak),
    },
    posting: {
      current: getNumber(raw?.postingStreak),
      longest: getNumber(raw?.longestPostingStreak ?? raw?.postingStreak),
    },
    messaging: {
      current: getNumber(raw?.messagingStreak),
      longest: getNumber(raw?.longestMessagingStreak ?? raw?.messagingStreak),
    },
  };

  const bestCurrentStreak = Math.max(
    streaks.connection.current,
    streaks.login.current,
    streaks.posting.current,
    streaks.messaging.current
  );
  const overallBestStreak = Math.max(
    streaks.connection.longest,
    streaks.login.longest,
    streaks.posting.longest,
    streaks.messaging.longest
  );

  return {
    visible: getBoolean(raw?.visible ?? raw?.showOnProfile, true),
    bestCurrentStreak: bestCurrentStreak > 0 ? bestCurrentStreak : null,
    overallBestStreak: overallBestStreak > 0 ? overallBestStreak : null,
    streaks,
    engagementScore:
      typeof raw?.engagementScore === 'number' ? raw.engagementScore : null,
  };
}

function normalizeStreakHistoryItem(item: Record<string, unknown>): StreakHistoryItem {
  if ('event' in item && 'streakAfter' in item && 'createdAt' in item) {
    return {
      id: String(item.id ?? item.streakId ?? item.createdAt ?? 'history-item'),
      streakId: String(item.streakId ?? item.id ?? ''),
      userId: String(item.userId ?? ''),
      streakType: String(item.streakType ?? 'login'),
      event: String(item.event ?? 'increment'),
      streakBefore: getNumber(item.streakBefore),
      streakAfter: getNumber(item.streakAfter),
      milestoneDay:
        typeof item.milestoneDay === 'number' ? item.milestoneDay : null,
      badgeSlug: typeof item.badgeSlug === 'string' ? item.badgeSlug : null,
      xpEarned: getNumber(item.xpEarned),
      createdAt: String(item.createdAt),
    };
  }

  const streakAfter = getNumber(item.streakCount);
  const event = getBoolean(item.usedFreeze)
    ? 'freeze_used'
    : getBoolean(item.wasAtRisk)
      ? 'shield_saved'
      : 'increment';
  const rawDate = typeof item.date === 'string' ? item.date : null;
  const createdAt = rawDate
    ? new Date(`${rawDate}T00:00:00.000Z`).toISOString()
    : new Date().toISOString();

  return {
    id: String(item.id ?? `${item.type ?? 'streak'}-${rawDate ?? 'unknown'}`),
    streakId: String(item.id ?? ''),
    userId: '',
    streakType: String(item.type ?? item.streakType ?? 'login'),
    event,
    streakBefore: Math.max(streakAfter - 1, 0),
    streakAfter,
    milestoneDay: null,
    badgeSlug: null,
    xpEarned: getNumber(item.xpEarned),
    createdAt,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API CALLS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const getEngagementDashboard = async (): Promise<EngagementDashboard> => {
  const res = await apiClient.get('/engagement/dashboard');
  return unwrapApiData(res);
};

export const getStreaks = async (): Promise<StreakData> => {
  const res = await apiClient.get('/engagement/streaks');
  return normalizeStreakData(unwrapApiData(res));
};

export const recordLogin = async (): Promise<void> => {
  await apiClient.post('/engagement/login');
};

export const getDailyMatches = async (): Promise<DailyMatchesResponse> => {
  const res = await apiClient.get('/engagement/daily-matches');
  return unwrapApiData(res);
};

export const getHiddenGem = async (): Promise<HiddenGemResponse> => {
  const res = await apiClient.get('/engagement/hidden-gem');
  return unwrapApiData(res);
};

export const getLiveActivity = async (location?: string): Promise<LiveActivity> => {
  const res = await apiClient.get('/engagement/live-activity', {
    params: location ? { location } : {},
  });
  return unwrapApiData(res);
};

export const getLeaderboard = async (
  period: 'weekly' | 'monthly' = 'weekly',
  limit: number = 10
): Promise<LeaderboardResponse> => {
  const res = await apiClient.get('/engagement/leaderboard', {
    params: { period, limit },
  });
  // Backend returns { data: { period, leaderboard, updatedAt } }; apiClient returns response.data
  const payload = (res as { data?: LeaderboardResponse }).data ?? res;
  return payload as LeaderboardResponse;
};

export const getNudges = async (): Promise<ProgressNudge[]> => {
  const res = await apiClient.get('/engagement/nudges');
  return unwrapApiData(res);
};

export const getWeeklyGoals = async (): Promise<WeeklyGoals> => {
  const res = await apiClient.get('/engagement/weekly-goals');
  return unwrapApiData(res);
};

export const getConnectionLimit = async (): Promise<ConnectionLimit> => {
  const res = await apiClient.get('/engagement/connection-limit');
  return unwrapApiData(res);
};

export const getSessionSummary = async (): Promise<SessionSummary> => {
  const res = await apiClient.get('/engagement/session-summary');
  return unwrapApiData(res);
};

export const getConnectionCelebration = async (connectionId: string): Promise<CelebrationData | null> => {
  const res = await apiClient.get(`/engagement/celebration/${connectionId}`);
  return unwrapApiData(res);
};

export const getRecentJoins = async (groupId?: string): Promise<{ count: number; label: string }> => {
  const res = await apiClient.get('/engagement/recent-joins', {
    params: groupId ? { groupId } : {},
  });
  return unwrapApiData(res);
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STREAK API CALLS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const getPublicStreaks = async (userId: string): Promise<PublicStreakData> => {
  const res = await apiClient.get(`/engagement/streaks/${userId}`);
  return normalizePublicStreakData(unwrapApiData(res) as Record<string, unknown>);
};

export const purchaseStreakFreeze = async (): Promise<StreakFreezeResponse> => {
  const res = await apiClient.post('/engagement/streaks/freeze');
  const payload = unwrapApiData(res) as Record<string, unknown>;
  return {
    message:
      typeof payload.message === 'string'
        ? payload.message
        : 'Streak freeze purchased!',
    freezesRemaining: getNumber(
      payload.freezesRemaining ?? payload.streakFreezes
    ),
    xpSpent: getNumber(payload.xpSpent ?? payload.xpCost),
  };
};

export const toggleStreakShield = async (): Promise<StreakShieldResponse> => {
  const res = await apiClient.post('/engagement/streaks/shield');
  const payload = unwrapApiData(res) as Record<string, unknown>;
  return {
    message:
      typeof payload.message === 'string'
        ? payload.message
        : 'Streak shield updated!',
    shieldActive: getBoolean(
      payload.shieldActive ?? payload.streakShieldActive
    ),
  };
};

export const getStreakHistory = async (limit: number = 20): Promise<StreakHistoryItem[]> => {
  const res = await apiClient.get('/engagement/streaks/history', {
    params: { limit },
  });
  const payload = unwrapApiData<unknown[]>(res);
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item) =>
    normalizeStreakHistoryItem((item ?? {}) as Record<string, unknown>)
  );
};

export const getStreakLeaderboard = async (
  type: StreakType = 'connection',
  limit: number = 20
): Promise<StreakLeaderboardResponse> => {
  const res = await apiClient.get('/engagement/streaks/leaderboard', {
    params: { type, limit },
  });
  const payload = unwrapApiData(res) as Partial<StreakLeaderboardResponse> & {
    type?: string;
  };

  return {
    streakType: payload.streakType ?? payload.type ?? type,
    leaderboard: Array.isArray(payload.leaderboard) ? payload.leaderboard : [],
    updatedAt: payload.updatedAt ?? null,
  };
};

export const toggleStreakVisibility = async (): Promise<StreakVisibilityResponse> => {
  const res = await apiClient.post('/engagement/streaks/visibility');
  const payload = unwrapApiData(res) as Record<string, unknown>;
  return {
    message:
      typeof payload.message === 'string'
        ? payload.message
        : 'Streak visibility updated!',
    showOnProfile: getBoolean(payload.showOnProfile, true),
  };
};
