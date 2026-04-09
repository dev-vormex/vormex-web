import { z } from 'zod';
import { apiGet, apiPost } from './request';

const userSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  profileImage: z.string().nullable(),
  headline: z.string().nullable(),
});

const partnerSummarySchema = userSummarySchema.extend({
  college: z.string().nullable(),
});

export const accountabilityPairSchema = z.object({
  id: z.string(),
  user1Id: z.string(),
  user2Id: z.string(),
  goal: z.string(),
  status: z.string(),
  sharedStreak: z.number(),
  bestStreak: z.number(),
  lastCheckIn: z.string().nullable(),
  checkInsCompleted: z.number(),
  partner: partnerSummarySchema,
});

export type AccountabilityPair = z.infer<typeof accountabilityPairSchema>;

export const mentorshipMatchSchema = z.object({
  id: z.string(),
  mentorId: z.string(),
  menteeId: z.string(),
  skill: z.string(),
  status: z.string(),
  sessionsCompleted: z.number(),
  rating: z.number().nullable(),
  myRole: z.enum(['mentor', 'mentee']),
  mentor: userSummarySchema,
  mentee: userSummarySchema,
});

export type MentorshipMatch = z.infer<typeof mentorshipMatchSchema>;

export const accountabilityPartnersResponseSchema = z.object({
  partners: z.array(accountabilityPairSchema),
});

const accountabilityPairResponseSchema = z.object({
  pair: accountabilityPairSchema,
});

const mentorshipsResponseSchema = z.object({
  mentorships: z.array(mentorshipMatchSchema),
});

const mentorshipResponseSchema = z.object({
  mentorship: mentorshipMatchSchema,
});

const messageResponseSchema = z.object({
  message: z.string(),
});

const checkInResponseSchema = z.object({
  streak: z.number(),
  bestStreak: z.number(),
  checkInsCompleted: z.number(),
});

export const accountabilityAPI = {
  getPartners: (): Promise<z.infer<typeof accountabilityPartnersResponseSchema>> => {
    return apiGet('/accountability/partners', accountabilityPartnersResponseSchema);
  },

  requestPartner: (
    targetUserId: string,
    goal: string,
  ): Promise<z.infer<typeof accountabilityPairResponseSchema>> => {
    return apiPost('/accountability/partners', { targetUserId, goal }, accountabilityPairResponseSchema);
  },

  respondToPartner: (
    pairId: string,
    action: 'pause' | 'complete',
  ): Promise<z.infer<typeof messageResponseSchema>> => {
    return apiPost(`/accountability/partners/${pairId}/respond`, { action }, messageResponseSchema);
  },

  checkIn: (pairId: string): Promise<z.infer<typeof checkInResponseSchema>> => {
    return apiPost(`/accountability/partners/${pairId}/check-in`, undefined, checkInResponseSchema);
  },

  getMentorships: (
    role?: 'mentor' | 'mentee',
  ): Promise<z.infer<typeof mentorshipsResponseSchema>> => {
    return apiGet('/accountability/mentorships', mentorshipsResponseSchema, { role });
  },

  requestMentorship: (
    mentorId: string,
    skill: string,
  ): Promise<z.infer<typeof mentorshipResponseSchema>> => {
    return apiPost('/accountability/mentorships', { mentorId, skill }, mentorshipResponseSchema);
  },

  respondToMentorship: (
    mentorshipId: string,
    action: 'accept' | 'reject',
  ): Promise<z.infer<typeof messageResponseSchema>> => {
    return apiPost(
      `/accountability/mentorships/${mentorshipId}/respond`,
      { action },
      messageResponseSchema,
    );
  },

  completeSession: (
    mentorshipId: string,
    rating?: number,
    feedback?: string,
  ): Promise<z.infer<typeof messageResponseSchema>> => {
    return apiPost(
      `/accountability/mentorships/${mentorshipId}/session`,
      { rating, feedback },
      messageResponseSchema,
    );
  },
};
