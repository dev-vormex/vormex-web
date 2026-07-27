import type {
  PersonCard,
  PersonRelationship,
  PersonRelationshipStatus,
} from '@/lib/api/people';

export const BROWSE_PAGE_SIZE = 30;
export const SEARCH_PAGE_SIZE = 20;
export const SEARCH_DEBOUNCE_MS = 200;
export const SEARCH_MIN_CHARACTERS = 2;
export const PREFETCH_REMAINING_ITEMS = 6;

export function normalizePeopleSearch(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function productionDisplayName(person: Pick<PersonCard, 'name' | 'username'>): string {
  return person.name?.trim() || person.username?.trim() || 'Vormex user';
}

export interface ProductionPersonCardContent {
  headline: string;
  education: string;
  visibleTags: string[];
  remainingTags: number;
}

export function productionPersonCardContent(
  person: Pick<PersonCard, 'headline' | 'bio' | 'college' | 'branch' | 'skills' | 'interests'>
): ProductionPersonCardContent {
  const tags = (person.skills.length > 0 ? person.skills : person.interests)
    .map((tag) => tag.trim())
    .filter(Boolean);
  const visibleTags = tags.slice(0, 3);
  const descriptions = [person.headline, person.bio]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index);

  return {
    headline: descriptions.join(' · '),
    education: [person.college?.trim(), person.branch?.trim()]
      .filter(Boolean)
      .join(' · '),
    visibleTags,
    remainingTags: Math.max(0, tags.length - visibleTags.length),
  };
}

export function canonicalPersonRelationship(
  person: Pick<PersonCard, 'connectionStatus' | 'connectionId' | 'relationship'>
): PersonRelationship {
  const status = normalizeRelationshipStatus(
    person.relationship?.status ?? person.connectionStatus
  );
  return {
    status,
    connectionId: person.relationship?.connectionId ?? person.connectionId ?? null,
  };
}

export function normalizeRelationshipStatus(value?: string | null): PersonRelationshipStatus {
  if (
    value === 'pending_sent' ||
    value === 'pending_received' ||
    value === 'connected'
  ) {
    return value;
  }
  return 'none';
}

export function withPersonRelationship<T extends PersonCard>(
  person: T,
  relationship: PersonRelationship
): T {
  const normalized = {
    status: normalizeRelationshipStatus(relationship.status),
    connectionId: relationship.connectionId ?? null,
  };
  return {
    ...person,
    connectionStatus: normalized.status,
    connectionId: normalized.connectionId,
    relationship: normalized,
  } as T;
}

export function matchedPeopleContext(person: PersonCard, normalizedQuery: string): string | null {
  const query = normalizePeopleSearch(normalizedQuery);
  const matches = (value?: string | null) =>
    Boolean(value && normalizePeopleSearch(value).includes(query));

  if (query && matches(person.college)) return `Studies at ${person.college}`;
  const skill = query ? person.skills.find(matches) : undefined;
  if (skill) return `Skill · ${skill}`;
  const interest = query ? person.interests.find(matches) : undefined;
  if (interest) return `Interest · ${interest}`;
  if (query && matches(person.branch)) return person.branch;
  return person.headline?.trim() || person.college?.trim() || null;
}

export interface FindPageDecision {
  hasMore: boolean;
  nextCursor: string | null;
  newUserCount: number;
}

export function decideFindPage(input: {
  existingUserIds: ReadonlySet<string>;
  incomingUserIds: readonly string[];
  previousCursor: string | null;
  serverNextCursor?: string | null;
  serverHasMore: boolean;
}): FindPageDecision {
  const newUserCount = new Set(
    input.incomingUserIds.filter((id) => id && !input.existingUserIds.has(id))
  ).size;
  const nextCursor = input.serverNextCursor ?? null;
  const cursorAdvanced = Boolean(nextCursor && nextCursor !== input.previousCursor);
  return {
    newUserCount,
    nextCursor: input.serverHasMore && cursorAdvanced && newUserCount > 0 ? nextCursor : null,
    hasMore: input.serverHasMore && cursorAdvanced && newUserCount > 0,
  };
}
