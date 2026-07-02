import apiClient from './client';
import type { SkillUserCard } from './skills';

export type SkillSwapMode = 'learn' | 'teach';

export interface SkillSwapSuggestion {
  user: SkillUserCard;
  skill: string;
  mode: SkillSwapMode;
  direction: 'learn_from' | 'teach_to';
  matchScore: number;
  evidenceCount: number;
  matchReason: string;
  sharedContext: {
    sameCampus: boolean;
    sameBranch: boolean;
    college: string | null;
  };
  activeRequestStatus: string | null;
}

export interface SkillSwapSession {
  id: string;
  requestId: string;
  skill: string;
  status: string;
  sessionLengthMinutes: number;
  scheduledFor: string | null;
  completedAt: string | null;
  learnerRating?: number | null;
  mentorRating?: number | null;
  learnerNote?: string | null;
  mentorNote?: string | null;
  createdAt: string | null;
  mentor: SkillUserCard | null;
  learner: SkillUserCard | null;
}

export interface SkillSwapRequest {
  id: string;
  skill: string;
  message: string | null;
  requesterGoal: string | null;
  mode: SkillSwapMode;
  status: string;
  sessionLengthMinutes: number;
  scheduledFor: string | null;
  createdAt: string | null;
  respondedAt: string | null;
  requester: SkillUserCard | null;
  recipient: SkillUserCard | null;
  session: SkillSwapSession | null;
}

export interface SkillSwapState {
  incoming: SkillSwapRequest[];
  outgoing: SkillSwapRequest[];
  history: SkillSwapRequest[];
  sessions: SkillSwapSession[];
}

export const skillSwapAPI = {
  getSuggestions: (params?: { mode?: SkillSwapMode; skill?: string }): Promise<{
    mode: SkillSwapMode;
    featuredSkills: string[];
    suggestions: SkillSwapSuggestion[];
  }> => {
    return apiClient.get('/skill-swap/suggestions', { params }) as Promise<{
      mode: SkillSwapMode;
      featuredSkills: string[];
      suggestions: SkillSwapSuggestion[];
    }>;
  },

  getState: (): Promise<SkillSwapState> => {
    return apiClient.get('/skill-swap/requests') as Promise<SkillSwapState>;
  },

  createRequest: (data: {
    recipientId: string;
    skill: string;
    message?: string;
    requesterGoal?: string;
    mode?: SkillSwapMode;
    sessionLengthMinutes?: number;
    scheduledFor?: string;
  }): Promise<{ request: SkillSwapRequest }> => {
    return apiClient.post('/skill-swap/requests', data) as Promise<{ request: SkillSwapRequest }>;
  },

  respondToRequest: (
    requestId: string,
    action: 'accept' | 'decline',
  ): Promise<{ request: SkillSwapRequest; session?: SkillSwapSession }> => {
    return apiClient.post(`/skill-swap/requests/${requestId}/respond`, { action }) as Promise<{
      request: SkillSwapRequest;
      session?: SkillSwapSession;
    }>;
  },

  completeSession: (
    sessionId: string,
    data: { rating?: number; note?: string; endorseSkill?: boolean },
  ): Promise<{ session: SkillSwapSession; endorsement?: unknown }> => {
    return apiClient.post(`/skill-swap/sessions/${sessionId}/complete`, data) as Promise<{
      session: SkillSwapSession;
      endorsement?: unknown;
    }>;
  },
};
