'use client';

import { ProfileLink } from '@/components/profile/ProfileLink';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import type { PersonCard, PersonRelationship } from '@/lib/api/people';
import {
  canonicalPersonRelationship,
  matchedPeopleContext,
  productionDisplayName,
} from '@/lib/findPeoplePolicy';
import { RelationshipActionButton } from './RelationshipActionButton';

interface SearchPersonRowProps {
  person: PersonCard;
  query: string;
  onConnectionChange: (personId: string, relationship: PersonRelationship) => void;
  onProfileIntent?: (person: PersonCard) => void;
}

export function SearchPersonRow({
  person,
  query,
  onConnectionChange,
  onProfileIntent,
}: SearchPersonRowProps) {
  const displayName = productionDisplayName(person);
  const context = matchedPeopleContext(person, query);

  return (
    <article className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-gray-100/80 dark:hover:bg-neutral-900 sm:px-3">
      <ProfileLink
        profileId={person.username || person.id}
        onClick={() => onProfileIntent?.(person)}
        className="relative shrink-0"
        aria-label={`Open ${displayName}'s profile`}
      >
        <UserAvatar
          imageSrc={person.profileImage}
          name={displayName}
          className="h-12 w-12 bg-gray-100 text-base font-semibold text-gray-500 ring-1 ring-gray-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700 sm:h-14 sm:w-14"
          fallbackClassName="text-base"
        />
        {person.isOnline && (
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-neutral-950" title="Online" />
        )}
      </ProfileLink>

      <ProfileLink
        profileId={person.username || person.id}
        onClick={() => onProfileIntent?.(person)}
        className="min-w-0 flex-1"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-bold text-gray-900 hover:underline dark:text-white sm:text-base">
            {displayName}
          </span>
          <VerificationBadge
            profileBadgeStyle={person.profileBadgeStyle}
            isPremium={person.isPremium}
            size="small"
          />
        </span>
        {person.username?.trim() && (
          <span className="block truncate text-xs text-gray-500 dark:text-neutral-400">
            @{person.username.trim()}
          </span>
        )}
        {context && (
          <span className="mt-0.5 block truncate text-xs text-gray-600 dark:text-neutral-300">
            {context}
          </span>
        )}
      </ProfileLink>

      <RelationshipActionButton
        compact
        userId={person.id}
        relationship={canonicalPersonRelationship(person)}
        onChange={(next) => onConnectionChange(person.id, next)}
      />
    </article>
  );
}

export function SearchPersonRowSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 px-2 py-3 sm:px-3">
      <div className="h-12 w-12 shrink-0 rounded-full bg-gray-200 dark:bg-neutral-800 sm:h-14 sm:w-14" />
      <div className="min-w-0 flex-1">
        <div className="h-4 w-40 max-w-full rounded bg-gray-200 dark:bg-neutral-800" />
        <div className="mt-2 h-3 w-24 rounded bg-gray-200 dark:bg-neutral-800" />
        <div className="mt-2 h-3 w-56 max-w-full rounded bg-gray-200 dark:bg-neutral-800" />
      </div>
      <div className="h-9 w-28 shrink-0 rounded-lg bg-gray-200 dark:bg-neutral-800" />
    </div>
  );
}
