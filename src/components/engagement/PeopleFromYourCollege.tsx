'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { getPeopleFromSameCollege } from '@/lib/api/people';
import { canonicalPersonRelationship } from '@/lib/findPeoplePolicy';
import Link from 'next/link';
import { ConnectButton } from '@/components/connections/ConnectButton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { VerificationBadge } from '@/components/ui/VerificationBadge';

/**
 * PeopleFromYourCollege - "People from your college" card for home feed.
 * Shows users from the same campus (case-insensitive, e.g. NIAT / niat).
 */
export default function PeopleFromYourCollege() {
  const { data, isLoading } = useQuery({
    queryKey: ['people-from-college'],
    queryFn: async () => {
      const res = await getPeopleFromSameCollege(8);
      return res.people ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const people = data ?? [];

  if (isLoading && people.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 overflow-hidden animate-pulse">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
          <div className="h-4 w-44 bg-gray-200 dark:bg-neutral-700 rounded" />
        </div>
        <div className="divide-y divide-gray-100 dark:divide-neutral-800">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-neutral-700 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-24 bg-gray-200 dark:bg-neutral-700 rounded" />
                <div className="h-3 w-32 bg-gray-200 dark:bg-neutral-700 rounded" />
              </div>
              <div className="h-8 w-20 bg-gray-200 dark:bg-neutral-700 rounded-full flex-shrink-0" />
            </div>
          ))}
        </div>
        <div className="h-10 bg-gray-100 dark:bg-neutral-800/50" />
      </div>
    );
  }

  if (people.length === 0) return null;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          People from your college
        </h3>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-neutral-800">
        {people.map((person) => {
          const relationship = canonicalPersonRelationship(person);
          return (
          <Link
            key={person.id}
            href={`/profile/${person.username}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors"
          >
            <UserAvatar
              imageSrc={person.profileImage}
              name={person.name}
              className="h-10 w-10 flex-shrink-0 bg-gray-200 text-sm font-semibold text-gray-500 dark:bg-neutral-700 dark:text-neutral-400"
              fallbackClassName="text-sm"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {person.name}
                </p>
                <VerificationBadge
                  profileBadgeStyle={person.profileBadgeStyle}
                  isPremium={person.isPremium}
                  size="small"
                />
                {person.isOnline && (
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                )}
              </div>
              {person.headline && (
                <p className="text-xs text-gray-500 dark:text-neutral-400 truncate mt-0.5">
                  {person.headline}
                </p>
              )}
              {person.college && (
                <p className="text-xs text-gray-400 dark:text-neutral-500 truncate mt-0.5">
                  {person.college}
                </p>
              )}
            </div>

            {/*
              Unlike the daily-match rails, this endpoint reports a real
              relationship, so someone you already asked opens as "Requested"
              instead of offering Connect a second time.
            */}
            <ConnectButton
              userId={person.id}
              variant="outline"
              serverStatus={relationship.status}
              serverConnectionId={relationship.connectionId}
            />
          </Link>
          );
        })}
      </div>

      <Link
        href="/find-people?tab=college"
        className="flex items-center justify-center gap-1 px-4 py-2.5 text-xs text-blue-600 dark:text-blue-400 font-medium hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors border-t border-gray-100 dark:border-neutral-800"
      >
        See all from your campus <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
