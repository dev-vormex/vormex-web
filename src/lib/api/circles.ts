import { z } from 'zod';
import { apiGet, apiPost } from './request';

export const circleSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  emoji: z.string().nullable(),
  category: z.string(),
  campus: z.string().nullable(),
  tags: z.array(z.string()),
  type: z.string(),
  isPrivate: z.boolean(),
  memberCount: z.number(),
  activeMembers: z.number(),
  postsCount: z.number(),
  weeklyActivity: z.number(),
  isMember: z.boolean().optional(),
  myRole: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type Circle = z.infer<typeof circleSchema>;

export const circleMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  profileImage: z.string().nullable(),
  headline: z.string().nullable(),
  college: z.string().nullable(),
  role: z.string(),
  xpInCircle: z.number(),
  joinedAt: z.string(),
});

export type CircleMember = z.infer<typeof circleMemberSchema>;

const circlePostAuthorSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  profileImage: z.string().nullable(),
  headline: z.string().nullable(),
});

export const circlePostSchema = z.object({
  id: z.string(),
  circleId: z.string(),
  authorId: z.string(),
  content: z.string(),
  type: z.string(),
  mediaUrls: z.array(z.string()),
  likesCount: z.number(),
  commentsCount: z.number(),
  isPinned: z.boolean(),
  createdAt: z.string(),
  author: circlePostAuthorSchema.optional(),
});

export type CirclePost = z.infer<typeof circlePostSchema>;

export const discoverCirclesResponseSchema = z.object({
  circles: z.array(circleSchema),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
});

const myCirclesResponseSchema = z.object({
  circles: z.array(circleSchema),
});

export const circleDetailResponseSchema = z.object({
  circle: circleSchema.extend({
    topMembers: z.array(circleMemberSchema),
    _count: z.record(z.string(), z.number()),
  }),
});

const messageResponseSchema = z.object({
  message: z.string(),
});

const circleCreateResponseSchema = z.object({
  circle: circleSchema,
});

const circleMembersResponseSchema = z.object({
  members: z.array(circleMemberSchema),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
});

const circlePostsResponseSchema = z.object({
  posts: z.array(circlePostSchema),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
});

const circlePostResponseSchema = z.object({
  post: circlePostSchema,
});

export const circlesAPI = {
  discover: (params?: {
    category?: string;
    campus?: string;
    search?: string;
    page?: number;
  }): Promise<z.infer<typeof discoverCirclesResponseSchema>> => {
    return apiGet('/circles/discover', discoverCirclesResponseSchema, params);
  },

  getMyCircles: (): Promise<z.infer<typeof myCirclesResponseSchema>> => {
    return apiGet('/circles/my/all', myCirclesResponseSchema);
  },

  getBySlug: (slug: string): Promise<z.infer<typeof circleDetailResponseSchema>> => {
    return apiGet(`/circles/${slug}`, circleDetailResponseSchema);
  },

  join: (circleId: string): Promise<z.infer<typeof messageResponseSchema>> => {
    return apiPost(`/circles/${circleId}/join`, undefined, messageResponseSchema);
  },

  leave: (circleId: string): Promise<z.infer<typeof messageResponseSchema>> => {
    return apiPost(`/circles/${circleId}/leave`, undefined, messageResponseSchema);
  },

  create: (data: {
    name: string;
    description?: string;
    category: string;
    campus?: string;
    tags?: string[];
    emoji?: string;
    isPrivate?: boolean;
  }): Promise<z.infer<typeof circleCreateResponseSchema>> => {
    return apiPost('/circles', data, circleCreateResponseSchema);
  },

  getMembers: (
    circleId: string,
    page = 1,
  ): Promise<z.infer<typeof circleMembersResponseSchema>> => {
    return apiGet(`/circles/${circleId}/members`, circleMembersResponseSchema, { page });
  },

  getPosts: (
    circleId: string,
    page = 1,
  ): Promise<z.infer<typeof circlePostsResponseSchema>> => {
    return apiGet(`/circles/${circleId}/posts`, circlePostsResponseSchema, { page });
  },

  createPost: (
    circleId: string,
    data: { content: string; type?: string; mediaUrls?: string[] },
  ): Promise<z.infer<typeof circlePostResponseSchema>> => {
    return apiPost(`/circles/${circleId}/posts`, data, circlePostResponseSchema);
  },

  seedDefaults: (): Promise<z.infer<typeof messageResponseSchema>> => {
    return apiPost('/circles/admin/seed', undefined, messageResponseSchema);
  },
};
