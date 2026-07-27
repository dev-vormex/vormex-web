import apiClient from './client';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type PersonRelationshipStatus =
  | 'none'
  | 'pending_sent'
  | 'pending_received'
  | 'connected';

export interface PersonRelationship {
  status: PersonRelationshipStatus;
  connectionId?: string | null;
}

export interface PersonCard {
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
  verified?: boolean;
  isVerified?: boolean;
  profileBadgeStyle?: string | null;
  isPremium?: boolean;
  connectionStatus: PersonRelationshipStatus;
  connectionId?: string | null;
  relationship?: PersonRelationship;
  mutualConnections?: number;
}

export interface PeopleFilters {
  search?: string;
  college?: string;
  branch?: string;
  graduationYear?: number;
  skills?: string[];
  interests?: string[];
  location?: string;
  isOpenToOpportunities?: boolean;
}

export interface PeoplePagination {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PeopleResponse {
  people: PersonCard[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
  nextCursor?: string | null;
}

export interface PeopleSectionResponse {
  people: PersonCard[];
  total?: number;
  page?: number;
  totalPages?: number;
  hasMore?: boolean;
}

export interface SuggestionsResponse {
  suggestions: PersonCard[];
  total?: number;
  page?: number;
  hasMore?: boolean;
}

export interface FilterOptions {
  colleges: string[];
  branches: string[];
  graduationYears: number[];
  locations: string[];
}

export interface PeopleYouKnowMatch extends PersonCard {
  contactName: string | null;
  isInContacts: true;
}

export interface PeopleYouKnowInvite {
  id: string;
  contactName: string | null;
  invitedAt: string | null;
}

export interface PeopleYouKnowResponse {
  lastSyncedAt: string | null;
  matched: PeopleYouKnowMatch[];
  invites: PeopleYouKnowInvite[];
  stats: {
    totalContacts: number;
    matchedCount: number;
    inviteCount: number;
  };
}

export interface PeopleYouKnowImportInput {
  name?: string | null;
  email?: string | null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get all people with optional filters and pagination
 */
export async function getPeople(
  filters?: PeopleFilters,
  pagination?: PeoplePagination,
  signal?: AbortSignal
): Promise<PeopleResponse> {
  const params = new URLSearchParams();
  
  if (filters?.search) params.append('search', filters.search);
  if (filters?.college) params.append('college', filters.college);
  if (filters?.branch) params.append('branch', filters.branch);
  if (filters?.graduationYear) params.append('graduationYear', filters.graduationYear.toString());
  if (filters?.skills?.length) params.append('skills', filters.skills.join(','));
  if (filters?.interests?.length) params.append('interests', filters.interests.join(','));
  if (filters?.location) params.append('location', filters.location);
  if (filters?.isOpenToOpportunities !== undefined) {
    params.append('isOpenToOpportunities', filters.isOpenToOpportunities.toString());
  }
  
  if (pagination?.page) params.append('page', pagination.page.toString());
  if (pagination?.limit) params.append('limit', pagination.limit.toString());
  if (pagination?.cursor) params.append('cursor', pagination.cursor);
  
  return apiClient.get(`/people?${params.toString()}`, { signal });
}

/** Indexed, relevance-ranked global search. Queries are normalized server-side. */
export async function searchPeople(
  query: string,
  pagination?: Pick<PeoplePagination, 'cursor' | 'limit'>,
  signal?: AbortSignal
): Promise<PeopleResponse> {
  const params = new URLSearchParams({ q: query });
  if (pagination?.limit) params.set('limit', pagination.limit.toString());
  if (pagination?.cursor) params.set('cursor', pagination.cursor);
  return apiClient.get(`/people/search?${params.toString()}`, { signal });
}

/**
 * Get personalized suggestions (People You May Know)
 */
export async function getSuggestions(
  limit: number = 10,
  page: number = 1
): Promise<SuggestionsResponse> {
  return apiClient.get(`/people/suggestions?limit=${limit}&page=${page}`);
}

/**
 * Get people from the same college
 */
export async function getPeopleFromSameCollege(
  limit: number = 10,
  page: number = 1
): Promise<PeopleSectionResponse> {
  return apiClient.get(`/people/same-college?limit=${limit}&page=${page}`);
}

/**
 * Get people near the current user
 */
export async function getPeopleNearMe(limit: number = 10): Promise<{ people: PersonCard[] }> {
  return apiClient.get(`/people/near-me?limit=${limit}`);
}

/**
 * Get available filter options
 */
export async function getFilterOptions(): Promise<FilterOptions> {
  return apiClient.get('/people/filter-options');
}

export async function getPeopleYouKnow(): Promise<PeopleYouKnowResponse> {
  return apiClient.get('/people/contacts');
}

export async function discoverPeopleYouKnow(
  contacts: PeopleYouKnowImportInput[],
  source: 'picker' | 'file'
): Promise<PeopleYouKnowResponse> {
  return apiClient.post('/people/contacts/import', { contacts, source });
}

export async function clearPeopleYouKnow(): Promise<{ message: string }> {
  return apiClient.delete('/people/contacts');
}

export async function markPeopleYouKnowInviteSent(
  entryId: string
): Promise<{ invitedAt: string }> {
  return apiClient.post(`/people/contacts/${entryId}/invite`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER TYPES AND FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SearchUser {
  id: string;
  username: string;
  name: string;
  profileImage: string | null;
  headline: string | null;
  verified?: boolean;
  isVerified?: boolean;
  profileBadgeStyle?: string | null;
  isPremium?: boolean;
}

/**
 * Quick search users by name or username
 */
export async function searchUsers(query: string, limit: number = 10): Promise<SearchUser[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];
  const response = await searchPeople(normalizedQuery, { limit });
  return response.people.map(p => ({
    id: p.id,
    username: p.username,
    name: p.name,
    profileImage: p.profileImage,
    headline: p.headline,
    verified: p.verified,
    isVerified: p.isVerified,
    profileBadgeStyle: p.profileBadgeStyle,
    isPremium: p.isPremium,
  }));
}
