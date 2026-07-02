import apiClient from './client';

export interface SkillUserCard {
  id: string;
  username: string;
  name: string;
  profileImage: string | null;
  headline: string | null;
  college: string | null;
  branch: string | null;
  graduationYear: number | null;
  isOnline?: boolean;
  lastActiveAt?: string | null;
  bio?: string | null;
  githubConnected?: boolean;
  githubUsername?: string | null;
  githubProfileUrl?: string | null;
}

export interface SkillEvidence {
  id: string;
  type: string;
  title: string;
  subtitle?: string | null;
  sourceUrl?: string | null;
  verified: boolean;
  createdAt: string | null;
  skillName: string;
}

export interface SkillEndorsement {
  id: string;
  skillName: string;
  note?: string | null;
  rating?: number | null;
  source?: string | null;
  createdAt: string | null;
  endorsedBy: SkillUserCard | null;
}

export interface SkillVerificationLink {
  id: string;
  provider: 'github' | 'leetcode' | 'portfolio' | string;
  username: string;
  profileUrl: string | null;
  status: string;
  verifiedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PassportSkill {
  id: string;
  name: string;
  category: string | null;
  proficiency: string | null;
  yearsOfExp: number | null;
  canTeach: boolean;
  wantsToLearn: boolean;
  evidenceCount: number;
  endorsementCount: number;
  verifiedEvidenceCount: number;
  confidenceScore: number;
  sources: string[];
  evidence: SkillEvidence[];
  endorsements: SkillEndorsement[];
}

export interface SkillPassport {
  user: SkillUserCard;
  summary: {
    totalSkills: number;
    verifiedSkills: number;
    evidenceCount: number;
    endorsementsCount: number;
    passportScore: number;
    topCategory: string | null;
    verificationLinksCount: number;
    hasVerifiedSkillsBadge: boolean;
    isPremium: boolean;
  };
  learningGoals: string[];
  teachingSkills: string[];
  skills: PassportSkill[];
  recentEvidence: SkillEvidence[];
  recentEndorsements: SkillEndorsement[];
  verificationLinks: SkillVerificationLink[];
}

export const skillsAPI = {
  getPassport: (userId?: string): Promise<SkillPassport> => {
    return apiClient.get(userId ? `/skills/passport/${userId}` : '/skills/passport') as Promise<SkillPassport>;
  },

  endorse: (
    userId: string,
    data: { skillName: string; note?: string; rating?: number },
  ): Promise<{ endorsement: SkillEndorsement }> => {
    return apiClient.post(`/skills/${userId}/endorse`, data) as Promise<{ endorsement: SkillEndorsement }>;
  },

  upsertVerificationLink: (data: {
    provider: 'github' | 'leetcode' | 'portfolio';
    username: string;
    profileUrl?: string;
  }): Promise<{ verificationLink: SkillVerificationLink }> => {
    return apiClient.post('/skills/verification-links', data) as Promise<{ verificationLink: SkillVerificationLink }>;
  },

  deleteVerificationLink: (provider: string): Promise<{ deleted: boolean }> => {
    return apiClient.delete(`/skills/verification-links/${provider}`) as Promise<{ deleted: boolean }>;
  },
};
