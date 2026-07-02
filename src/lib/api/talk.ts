import apiClient from './client';
import type { FullProfileResponse } from '@/types/profile';

export type TalkRole = 'user' | 'assistant';

export interface TalkMessage {
  role: TalkRole;
  content: string;
}

export interface TalkPersonCard {
  id: string;
  username: string;
  name: string;
  profileImage: string | null;
  bannerImageUrl: string | null;
  headline: string | null;
  college: string | null;
  branch: string | null;
  bio: string | null;
  skills: string[];
  interests: string[];
  isOnline: boolean;
  connectionStatus: 'none' | 'pending_sent' | 'pending_received' | 'connected';
  mutualConnections: number;
  matchScore: number;
  reasons: string[];
  connectReason: string;
}

export interface TalkTurnResponse {
  answer: string;
  costMode: 'retrieval_first';
  followUpQuestions: string[];
  mode: 'people_discovery' | 'general';
  people: TalkPersonCard[];
  peopleTitle?: string;
}

export const talkAPI = {
  turn: (data: { message: string; history?: TalkMessage[] }): Promise<TalkTurnResponse> => {
    return apiClient.post('/talk/turn', data) as Promise<TalkTurnResponse>;
  },

  getProfilePreview: (userId: string): Promise<FullProfileResponse> => {
    return apiClient.get(`/talk/profile-preview/${userId}`) as Promise<FullProfileResponse>;
  },
};
