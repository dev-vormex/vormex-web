import apiClient from './client';

export interface HackathonUser {
  id: string;
  username?: string | null;
  name?: string | null;
  profileImage?: string | null;
  headline?: string | null;
  college?: string | null;
}

export interface HackathonTeamApplication {
  id: string;
  teamId: string;
  applicantId: string;
  applicant?: HackathonUser | null;
  role?: string | null;
  message?: string | null;
  skills?: string[];
  status: string;
  createdAt: string;
  team?: {
    id: string;
    name: string;
    hackathon?: Hackathon | null;
  } | null;
}

export interface HackathonTeam {
  id: string;
  hackathonId: string;
  ownerId: string;
  owner?: HackathonUser | null;
  groupId?: string | null;
  name: string;
  pitch?: string | null;
  lookingForRoles: string[];
  requiredSkills: string[];
  maxMembers: number;
  status: string;
  memberCount: number;
  pendingApplicationsCount: number;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    status: string;
    user?: HackathonUser | null;
  }>;
  myApplication?: HackathonTeamApplication | null;
  createdAt: string;
}

export interface Hackathon {
  id: string;
  slug: string;
  title: string;
  organizer?: string | null;
  source: string;
  sourceUrl?: string | null;
  college?: string | null;
  description: string;
  theme?: string | null;
  location?: string | null;
  isOnline: boolean;
  startsAt: string;
  endsAt: string;
  registrationDeadline?: string | null;
  teamMin: number;
  teamMax: number;
  prizeSummary?: string | null;
  tags: string[];
  skills: string[];
  bannerUrl?: string | null;
  status: string;
  teamsCount: number;
  savesCount: number;
  isSaved: boolean;
  myTeam?: HackathonTeam | null;
  createdAt: string;
}

export interface HackathonsResponse {
  hackathons: Hackathon[];
  page: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export const hackathonsAPI = {
  list: (params?: {
    status?: string;
    search?: string;
    source?: string;
    college?: string;
    skill?: string;
    tag?: string;
    saved?: boolean;
    page?: number;
    limit?: number;
  }): Promise<HackathonsResponse> => {
    return apiClient.get('/hackathons', { params }) as Promise<HackathonsResponse>;
  },

  get: (identifier: string): Promise<{ hackathon: Hackathon }> => {
    return apiClient.get(`/hackathons/${identifier}`) as Promise<{ hackathon: Hackathon }>;
  },

  save: (hackathonId: string): Promise<{ saved: boolean }> => {
    return apiClient.post(`/hackathons/${hackathonId}/save`, {}) as Promise<{ saved: boolean }>;
  },

  unsave: (hackathonId: string): Promise<{ saved: boolean }> => {
    return apiClient.delete(`/hackathons/${hackathonId}/save`) as Promise<{ saved: boolean }>;
  },

  getTeams: (hackathonId: string): Promise<{ teams: HackathonTeam[] }> => {
    return apiClient.get(`/hackathons/${hackathonId}/teams`) as Promise<{ teams: HackathonTeam[] }>;
  },

  formTeam: (
    hackathonId: string,
    data: {
      name?: string;
      pitch?: string;
      lookingForRoles?: string[];
      requiredSkills?: string[];
      maxMembers?: number;
    },
  ): Promise<{ team: HackathonTeam; created: boolean }> => {
    return apiClient.post(`/hackathons/${hackathonId}/teams/form`, data) as Promise<{
      team: HackathonTeam;
      created: boolean;
    }>;
  },

  applyToTeam: (
    teamId: string,
    data: { role?: string; message?: string; skills?: string[] },
  ): Promise<{ application: HackathonTeamApplication }> => {
    return apiClient.post(`/hackathons/teams/${teamId}/apply`, data) as Promise<{
      application: HackathonTeamApplication;
    }>;
  },

  getMyTeams: (): Promise<{ teams: HackathonTeam[]; applications: HackathonTeamApplication[] }> => {
    return apiClient.get('/hackathons/me/teams') as Promise<{
      teams: HackathonTeam[];
      applications: HackathonTeamApplication[];
    }>;
  },
};
