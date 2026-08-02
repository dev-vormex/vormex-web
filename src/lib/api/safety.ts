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

export interface BlockEffects {
  affectedConversationIds: string[];
  connectionRemoved: boolean;
  removedConnectionCount: number;
  removedFollowCount: number;
  removedNotificationCount: number;
}

export interface BlockUserResponse {
  message: string;
  block: UserBlock;
  effects: BlockEffects;
}

export interface UnblockUserResponse {
  message: string;
  affectedConversationIds: string[];
}

export const safetyAPI = {
  getBlocks: async (): Promise<{ blocks: UserBlock[] }> => {
    return apiClient.get('/safety/blocks');
  },
  blockUser: async (userId: string, reason?: string): Promise<BlockUserResponse> => {
    return apiClient.post(`/safety/blocks/${userId}`, { reason });
  },
  unblockUser: async (userId: string): Promise<UnblockUserResponse> => {
    return apiClient.delete(`/safety/blocks/${userId}`);
  },
};
