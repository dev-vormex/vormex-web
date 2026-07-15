export interface PublicPerson {
  username: string;
  name: string;
  headline: string | null;
  bio: string | null;
  avatar: string | null;
  skills: string[];
  interests: string[];
  location: string | null;
  profileUrl: string;
  verified: boolean;
  openToOpportunities: boolean;
  matchScore: number;
  matchScoreBand: 'strong' | 'good' | 'related';
  matchReasons: string[];
}

export interface PublicProfile extends Omit<PublicPerson, 'matchScore' | 'matchScoreBand' | 'matchReasons'> {
  college: string | null;
  branch: string | null;
  degree: string | null;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
  githubProfileUrl: string | null;
  projects: Array<{ id: string; title: string; description: string | null; url: string | null }>;
  indexable: boolean;
  updatedAt: string;
}

function backendOrigin(): string {
  const configured = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  return configured?.startsWith('http') ? configured.replace(/\/+$/, '') : 'https://vormex-backend.onrender.com';
}

async function publicFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${backendOrigin()}${path}`, {
      ...init,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Vormex-Client': 'public-web', ...(init?.headers || {}) },
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

export async function browsePublicPeople(limit = 24): Promise<PublicPerson[]> {
  const data = await publicFetch<{ people: PublicPerson[] }>(`/api/public/discovery/people?limit=${Math.min(50, limit)}`);
  return data?.people || [];
}

export async function findPublicPeople(goal: string, limit = 24): Promise<PublicPerson[]> {
  const data = await publicFetch<{ people: PublicPerson[] }>(
    `/api/public/discovery/people?q=${encodeURIComponent(goal)}&limit=${Math.min(10, limit)}`,
  );
  return data?.people || [];
}

export async function fetchPublicProfile(username: string): Promise<PublicProfile | null> {
  const data = await publicFetch<{ profile: PublicProfile }>(`/api/public/discovery/profiles/${encodeURIComponent(username)}`);
  return data?.profile || null;
}
