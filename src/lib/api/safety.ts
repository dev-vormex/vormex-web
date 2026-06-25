import apiClient from './client';

export interface BlockedUser {
  id: string;
  username: string;
  name: string;
  profileImage: string | null;
  isVerified: boolean;
  profileBadgeStyle: string | null;
  identityTrustLevel: string;
  verificationBadges: string[];
}

export interface UserBlock {
  id: string;
  blockedUserId: string;
  createdAt: string;
  user: BlockedUser;
}

export const safetyAPI = {
  getBlocks: async (): Promise<{ blocks: UserBlock[] }> => {
    return apiClient.get('/safety/blocks');
  },
  blockUser: async (userId: string, reason?: string): Promise<{ message: string; block: UserBlock }> => {
    return apiClient.post(`/safety/blocks/${userId}`, { reason });
  },
  unblockUser: async (userId: string): Promise<{ message: string }> => {
    return apiClient.delete(`/safety/blocks/${userId}`);
  },
};
