import type { PersonCard } from '@/lib/api/people';

const MAX_RECENT_SEARCHES = 50;
const MAX_RECENT_PROFILES = 20;

function storageKey(viewerId: string, kind: 'searches' | 'profiles'): string {
  return `vormex:find:${viewerId}:${kind}`;
}

function readArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readRecentPeopleSearches(viewerId?: string | null): string[] {
  if (!viewerId) return [];
  return readArray<string>(storageKey(viewerId, 'searches'))
    .filter((value) => typeof value === 'string' && value.trim().length >= 2)
    .slice(0, MAX_RECENT_SEARCHES);
}

export function rememberPeopleSearch(viewerId: string | null | undefined, query: string): string[] {
  if (!viewerId || typeof window === 'undefined') return [];
  const normalized = query.trim().replace(/\s+/g, ' ');
  if (normalized.length < 2) return readRecentPeopleSearches(viewerId);
  const next = [
    normalized,
    ...readRecentPeopleSearches(viewerId).filter(
      (value) => value.toLocaleLowerCase() !== normalized.toLocaleLowerCase()
    ),
  ].slice(0, MAX_RECENT_SEARCHES);
  window.localStorage.setItem(storageKey(viewerId, 'searches'), JSON.stringify(next));
  return next;
}

export type RecentPerson = Pick<
  PersonCard,
  'id' | 'username' | 'name' | 'profileImage' | 'headline' | 'college' | 'verified' | 'isVerified' | 'profileBadgeStyle' | 'isPremium'
>;

export function readRecentPeopleProfiles(viewerId?: string | null): RecentPerson[] {
  if (!viewerId) return [];
  return readArray<RecentPerson>(storageKey(viewerId, 'profiles'))
    .filter((person) => Boolean(person?.id && person?.username))
    .slice(0, MAX_RECENT_PROFILES);
}

export function rememberPeopleProfile(
  viewerId: string | null | undefined,
  person: PersonCard
): RecentPerson[] {
  if (!viewerId || typeof window === 'undefined') return [];
  const recent: RecentPerson = {
    id: person.id,
    username: person.username,
    name: person.name,
    profileImage: person.profileImage,
    headline: person.headline,
    college: person.college,
    verified: person.verified,
    isVerified: person.isVerified,
    profileBadgeStyle: person.profileBadgeStyle,
    isPremium: person.isPremium,
  };
  const next = [
    recent,
    ...readRecentPeopleProfiles(viewerId).filter((value) => value.id !== person.id),
  ].slice(0, MAX_RECENT_PROFILES);
  window.localStorage.setItem(storageKey(viewerId, 'profiles'), JSON.stringify(next));
  return next;
}
