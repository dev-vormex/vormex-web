import apiClient from './client';

export interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  totalXpEarned: number;
  milestones: {
    signups: number;
    profileCompleted: number;
    firstPosts: number;
    connections: number;
  };
}

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  referred: {
    id: string;
    name: string;
    username: string;
    profileImage?: string;
  };
  signupXpClaimed: boolean;
  profileCompleted: boolean;
  firstPostCompleted: boolean;
  connectionsCompleted: boolean;
  createdAt: string;
}

export interface ReferralLeaderboard {
  rank: number;
  user: {
    id: string;
    name: string;
    username: string;
    profileImage?: string;
  };
  referralCount: number;
}

export interface ReferralShareLinks {
  code: string;
  link: string;
  whatsapp: string;
  twitter: string;
  linkedin: string;
}

// Get my referral code
export const getMyReferralCode = async (): Promise<string> => {
  return apiClient.get('/referrals/code');
};

// Apply a referral code
export const applyReferralCode = async (code: string) => {
  return apiClient.post('/referrals/apply', { code });
};

// Get my referral stats
export const getReferralStats = async (): Promise<ReferralStats> => {
  return apiClient.get('/referrals/stats');
};

// Get my referrals list
export const getMyReferrals = async (): Promise<Referral[]> => {
  return apiClient.get('/referrals/list');
};

// Get referral leaderboard
export const getReferralLeaderboard = async (limit?: number): Promise<ReferralLeaderboard[]> => {
  return apiClient.get('/referrals/leaderboard', { params: { limit } });
};

// Get share links
export const getShareLinks = async (): Promise<ReferralShareLinks> => {
  return apiClient.get('/referrals/share');
};
