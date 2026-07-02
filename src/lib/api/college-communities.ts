import apiClient from './client';

export interface CollegeCommunity {
  id: string;
  college: string;
  slug: string;
  description: string | null;
  groupId: string;
  emailDomains: string[];
  verificationMode: string;
  memberCount: number;
  isMember: boolean;
  memberRole: string | null;
  verificationStatus: string | null;
  canJoin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CollegeVerification {
  id: string;
  userId: string;
  college: string;
  studentEmail: string | null;
  status: string;
  method: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const collegeCommunitiesAPI = {
  list: (params?: { search?: string; q?: string; mine?: boolean }): Promise<{ communities: CollegeCommunity[] }> => {
    return apiClient.get('/college-communities', { params }) as Promise<{ communities: CollegeCommunity[] }>;
  },

  getMyVerification: (college?: string): Promise<{ verifications: CollegeVerification[] }> => {
    return apiClient.get('/college-communities/me/verification', { params: { college } }) as Promise<{
      verifications: CollegeVerification[];
    }>;
  },

  create: (data: {
    college: string;
    description?: string;
    emailDomains?: string[];
  }): Promise<{ community: CollegeCommunity; created: boolean }> => {
    return apiClient.post('/college-communities', data) as Promise<{
      community: CollegeCommunity;
      created: boolean;
    }>;
  },

  verify: (data: { college: string; studentEmail?: string }): Promise<{ verification: CollegeVerification }> => {
    return apiClient.post('/college-communities/verify', data) as Promise<{ verification: CollegeVerification }>;
  },

  join: (communityId: string): Promise<{ community: CollegeCommunity }> => {
    return apiClient.post(`/college-communities/${communityId}/join`, {}) as Promise<{ community: CollegeCommunity }>;
  },
};
