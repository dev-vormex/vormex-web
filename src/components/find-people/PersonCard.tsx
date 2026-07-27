'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, UsersRound } from 'lucide-react';
import { ProfileLink } from '@/components/profile/ProfileLink';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import type {
  PersonCard as PersonCardType,
  PersonRelationship,
} from '@/lib/api/people';
import {
  canonicalPersonRelationship,
  productionDisplayName,
  productionPersonCardContent,
} from '@/lib/findPeoplePolicy';
import { resolveMediaUrl } from '@/lib/utils/media';
import { RelationshipActionButton } from './RelationshipActionButton';

interface PersonCardProps {
  person: PersonCardType;
  onConnectionChange?: (personId: string, relationship: PersonRelationship) => void;
  onProfileIntent?: (person: PersonCardType) => void;
  badgeLabel?: string;
}

function ProfileBanner({ imageSrc }: { imageSrc?: string | null }) {
  const resolvedSrc = useMemo(() => resolveMediaUrl(imageSrc), [imageSrc]);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(resolvedSrc && failedSrc === resolvedSrc);

  return (
    <div className="relative h-20 shrink-0 overflow-hidden bg-gradient-to-r from-slate-100 via-gray-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {resolvedSrc && !failed && (
        <img
          src={resolvedSrc}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailedSrc(resolvedSrc)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}

export function PersonCard({
  person,
  onConnectionChange,
  onProfileIntent,
  badgeLabel,
}: PersonCardProps) {
  const displayName = productionDisplayName(person);
  const profileId = person.username || person.id;
  const handle = person.username?.trim() ? `@${person.username.trim()}` : '';
  const { headline, education, visibleTags, remainingTags } = productionPersonCardContent(person);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex aspect-[31/40] min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
    >
      <ProfileBanner imageSrc={person.bannerImageUrl} />

      {badgeLabel && (
        <span className="absolute left-2 top-2 z-10 max-w-[55%] truncate rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-blue-700 shadow-sm backdrop-blur dark:bg-neutral-950/80 dark:text-blue-300">
          {badgeLabel}
        </span>
      )}

      <div className="z-10 flex h-24 shrink-0 justify-center -mt-12">
        <ProfileLink
          profileId={profileId}
          onClick={() => onProfileIntent?.(person)}
          className="relative h-24 w-24 shrink-0 rounded-full"
          aria-label={`Open ${displayName}'s profile`}
        >
          <UserAvatar
            imageSrc={person.profileImage}
            name={displayName}
            className="h-24 w-24 bg-gray-100 text-2xl font-semibold text-gray-500 ring-4 ring-white shadow-sm dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-900"
            fallbackClassName="text-2xl"
          />
          {person.isOnline && (
            <span
              className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 ring-[3px] ring-white dark:ring-neutral-900"
              title="Online"
            />
          )}
        </ProfileLink>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center px-4 pb-4 pt-3 text-center sm:px-5">
        <ProfileLink
          profileId={profileId}
          onClick={() => onProfileIntent?.(person)}
          className="group/name flex min-w-0 max-w-full items-center justify-center gap-1.5"
        >
          <span className="min-w-0 truncate text-base font-bold text-gray-950 group-hover/name:underline dark:text-white sm:text-lg">
            {displayName}
          </span>
          <VerificationBadge
            profileBadgeStyle={person.profileBadgeStyle}
            isPremium={person.isPremium}
            size="small"
          />
        </ProfileLink>

        {handle && (
          <p className="max-w-full truncate text-xs text-gray-500 dark:text-neutral-400">
            {handle}
          </p>
        )}

        {headline ? (
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-700 dark:text-neutral-300 sm:text-base sm:leading-6">
            {headline}
          </p>
        ) : null}

        {education && (
          <div className="mt-2 flex max-w-full items-center justify-center gap-1.5 text-gray-500 dark:text-neutral-400">
            <GraduationCap className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate text-xs font-medium sm:text-sm">{education}</span>
          </div>
        )}

        {visibleTags.length > 0 && (
          <div className="mt-3 flex w-full min-w-0 flex-nowrap items-center justify-center gap-1.5">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="max-w-[27%] truncate rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-neutral-800 dark:text-neutral-200"
                title={tag}
              >
                {tag}
              </span>
            ))}
            {remainingTags > 0 && (
              <span className="shrink-0 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">
                +{remainingTags}
              </span>
            )}
          </div>
        )}

        {person.mutualConnections != null && person.mutualConnections > 0 && (
          <div className="mt-2.5 flex max-w-full items-center justify-center gap-1.5 text-gray-500 dark:text-neutral-400">
            <UsersRound className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate text-xs sm:text-sm">
              {person.mutualConnections} mutual {person.mutualConnections === 1 ? 'connection' : 'connections'}
            </span>
          </div>
        )}

        <div className="mt-auto w-full pt-4">
          <RelationshipActionButton
            portrait
            userId={person.id}
            relationship={canonicalPersonRelationship(person)}
            onChange={(next) => onConnectionChange?.(person.id, next)}
          />
        </div>
      </div>
    </motion.article>
  );
}

export default PersonCard;
