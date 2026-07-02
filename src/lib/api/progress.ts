import apiClient from './client';

export interface ProgressRule {
  action: string;
  amount?: number | null;
  description: string;
}

export interface ProgressOverview {
  xp: {
    lifetimeXp: number;
    level: number;
    levelName: string;
    currentLevelXp: number;
    nextLevelXp: number;
    xpIntoLevel: number;
    xpToNextLevel: number;
    progressToNextLevel: number;
    rules: ProgressRule[];
  };
  coins: {
    balance: number;
    rules: Array<{ action: string; description: string }>;
    recentTransactions: Array<{
      id: string;
      amount: number;
      type: string;
      source: string;
      sourceId: string | null;
      description: string | null;
      createdAt: string;
    }>;
  };
  streak: {
    current: number;
    longest: number;
    qualifiedToday: boolean;
    isAtRisk: boolean;
    lastQualifiedDate: string | null;
    totalActiveDays: number;
    rules: string[];
    categories: Record<string, { current: number; longest: number; lastDate: string | null }>;
  };
}

export const progressAPI = {
  getMine: async (): Promise<ProgressOverview> => {
    const response = await apiClient.get('/progress/me') as { data: ProgressOverview };
    return response.data;
  },
};
