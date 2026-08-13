'use client';

import React from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronRight,
  Eye,
  Film,
  Heart,
  MapPin,
  MessageCircle,
  Sparkles,
  Users,
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  CARD_EYEBROW,
  FEED_SURFACE,
  RAIL_ACTION,
  RAIL_CARD,
  RAIL_HEADING,
} from '@/components/feed/surface';
import type {
  FeedModuleEvent,
  FeedModuleJob,
  FeedModulePerson,
  FeedModulePlacement,
  FeedModuleReel,
  Post,
} from '@/types/post';

/**
 * FeedModuleCard — renders a server-ranked recommendation module inline.
 *
 * The backend already decides which module to show and where (see
 * selectHomeRecommendationModules: PEOPLE / REELS / JOBS / EVENTS at feed
 * positions 9, 16, 23, plus premium post boosts). The web feed used to discard
 * `modulePlacements` entirely and hardcode a fixed stack of rails above the
 * feed instead, so none of that ranking reached users. This component is the
 * consumer for it.
 *
 * Each module is one feed-column card holding a horizontal rail, so it reads as
 * a peer of a post rather than as page chrome.
 */

const MODULE_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; fallbackTitle: string; href: string; cta: string }
> = {
  PEOPLE: { icon: Users, fallbackTitle: 'People who match your goals', href: '/find-people', cta: 'See all' },
  REELS: { icon: Film, fallbackTitle: 'Reels for your interests', href: '/reels', cta: 'Watch more' },
  JOBS: { icon: Sparkles, fallbackTitle: 'Opportunities matching your skills', href: '/jobs', cta: 'See all' },
  EVENTS: { icon: CalendarDays, fallbackTitle: 'Events you may find useful', href: '/events', cta: 'See all' },
};

export function FeedModuleCard({ placement }: { placement: FeedModulePlacement }) {
  if (placement.type === 'BOOSTED_POST') {
    return <BoostedPostCard placement={placement} />;
  }

  const meta = placement.type ? MODULE_META[placement.type] : undefined;
  const items = placement.items ?? [];
  if (!meta || items.length === 0) return null;

  const Icon = meta.icon;

  return (
    <section className={FEED_SURFACE} aria-label={placement.reasonText || meta.fallbackTitle}>
      <header className="flex items-center justify-between gap-3 px-3.5 pb-2.5 pt-3.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <h2 className={`${RAIL_HEADING} truncate`}>
            {placement.reasonText || meta.fallbackTitle}
          </h2>
        </div>
        <Link href={meta.href} className={`${RAIL_ACTION} flex-shrink-0`}>
          {meta.cta} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <div className="scrollbar-hide flex gap-3 overflow-x-auto px-3.5 pb-4 sm:px-4">
        {placement.type === 'PEOPLE' &&
          (items as FeedModulePerson[]).map((person) => (
            <PersonTile key={person.id} person={person} />
          ))}
        {placement.type === 'REELS' &&
          (items as FeedModuleReel[]).map((reel) => <ReelTile key={reel.id} reel={reel} />)}
        {placement.type === 'JOBS' &&
          (items as FeedModuleJob[]).map((job) => <JobTile key={job.id} job={job} />)}
        {placement.type === 'EVENTS' &&
          (items as FeedModuleEvent[]).map((event) => <EventTile key={event.id} event={event} />)}
      </div>
    </section>
  );
}

function PersonTile({ person }: { person: FeedModulePerson }) {
  return (
    <Link
      href={`/profile/${person.username}`}
      className={`${RAIL_CARD} flex w-[132px] flex-col items-center px-2.5 py-3 text-center`}
    >
      <UserAvatar
        imageSrc={person.profileImage}
        name={person.name}
        className="h-12 w-12 bg-gray-100 text-base font-bold text-gray-400 dark:bg-neutral-800"
        fallbackClassName="text-base font-bold"
      />
      <p className="mt-2 flex h-4 w-full items-center justify-center truncate text-[12.5px] font-semibold text-gray-900 dark:text-white">
        {person.name}
      </p>
      <p className="mt-0.5 flex h-8 w-full items-center justify-center text-center text-[10.5px] leading-snug text-gray-500 dark:text-neutral-400">
        <span className="line-clamp-2">{person.headline || 'On Vormex'}</span>
      </p>
      <span className="mt-2 w-full rounded-full bg-blue-600 py-[6px] text-[11px] font-semibold text-white">
        View
      </span>
    </Link>
  );
}

function ReelTile({ reel }: { reel: FeedModuleReel }) {
  return (
    <Link href={`/reels/${reel.id}`} className={`${RAIL_CARD} w-[124px]`}>
      <div className="relative aspect-[9/14] bg-gray-100 dark:bg-neutral-800">
        {reel.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reel.thumbnailUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-gray-300 dark:text-neutral-600">
            <Film className="h-6 w-6" />
          </span>
        )}
        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          <Eye className="h-2.5 w-2.5" />
          {formatCount(reel.viewsCount)}
        </span>
      </div>
      <p className="flex h-9 items-center px-2 text-[11px] leading-snug text-gray-700 dark:text-neutral-300">
        <span className="line-clamp-2">{reel.title || reel.caption || 'Watch reel'}</span>
      </p>
    </Link>
  );
}

function JobTile({ job }: { job: FeedModuleJob }) {
  return (
    <Link href="/jobs" className={`${RAIL_CARD} flex w-[210px] flex-col p-3`}>
      <p className="line-clamp-2 min-h-[34px] text-[12.5px] font-semibold leading-snug text-gray-900 dark:text-white">
        {job.title}
      </p>
      {(job.company || job.location) && (
        <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-gray-500 dark:text-neutral-400">
          {job.location && <MapPin className="h-3 w-3 flex-shrink-0" />}
          <span className="truncate">{[job.company, job.location].filter(Boolean).join(' · ')}</span>
        </p>
      )}
      <p className="mt-1.5 line-clamp-2 min-h-[30px] text-[11px] leading-snug text-gray-500 dark:text-neutral-400">
        {job.description}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {(job.skills || []).slice(0, 2).map((skill) => (
          <span
            key={skill}
            className="truncate rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-neutral-800 dark:text-neutral-300"
          >
            {skill}
          </span>
        ))}
      </div>
    </Link>
  );
}

function EventTile({ event }: { event: FeedModuleEvent }) {
  return (
    <Link href="/events" className={`${RAIL_CARD} flex w-[210px] flex-col`}>
      {event.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.coverImageUrl}
          alt=""
          loading="lazy"
          className="h-20 w-full object-cover"
        />
      ) : (
        <div className="flex h-20 w-full items-center justify-center bg-gradient-to-br from-blue-100 to-violet-100 text-blue-500 dark:from-blue-950/60 dark:to-violet-950/40 dark:text-blue-300">
          <CalendarDays className="h-6 w-6" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
          {formatEventDate(event.startsAt)}
        </p>
        <p className="mt-1 line-clamp-2 min-h-[34px] text-[12.5px] font-semibold leading-snug text-gray-900 dark:text-white">
          {event.title}
        </p>
        {event.campus && (
          <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-gray-500 dark:text-neutral-400">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{event.campus}</span>
          </p>
        )}
      </div>
    </Link>
  );
}

/**
 * A premium post boost. Rendered as a compact preview rather than a full
 * PostCard on purpose: the backend sends a trimmed post projection (no
 * `isLiked`, no reaction summary), so feeding it to PostCard would mean
 * rendering interactive controls over absent state. The label also keeps a paid
 * placement visually distinct from an organic post.
 */
function BoostedPostCard({ placement }: { placement: FeedModulePlacement }) {
  const post = placement.items?.[0] as Partial<Post> | undefined;
  if (!post?.id) return null;

  const author = post.author;
  const firstImage = Array.isArray(post.mediaUrls) ? post.mediaUrls[0] : undefined;

  return (
    <article className={FEED_SURFACE}>
      <div className="flex items-center justify-between gap-3 px-3.5 pt-3.5 sm:px-4">
        <p className={CARD_EYEBROW}>Boosted</p>
        <span className="text-[11px] text-gray-400 dark:text-neutral-500">
          {placement.reasonText || 'Promoted by a Premium creator'}
        </span>
      </div>

      <Link href={`/post/${post.id}`} className="block px-3.5 pb-3.5 pt-2.5 sm:px-4">
        {author && (
          <div className="flex items-center gap-2.5">
            <UserAvatar
              imageSrc={author.profileImage}
              name={author.name}
              className="h-9 w-9 bg-gray-100 text-sm font-bold text-gray-400 dark:bg-neutral-800"
              fallbackClassName="text-sm font-bold"
            />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-gray-900 dark:text-white">
                {author.name}
              </p>
              {author.headline && (
                <p className="truncate text-[11px] text-gray-500 dark:text-neutral-400">
                  {author.headline}
                </p>
              )}
            </div>
          </div>
        )}

        {post.content && (
          <p className="mt-2.5 line-clamp-3 whitespace-pre-line text-[13.5px] leading-relaxed text-gray-800 dark:text-neutral-200">
            {post.content}
          </p>
        )}

        {firstImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={firstImage}
            alt=""
            loading="lazy"
            className="mt-2.5 max-h-64 w-full rounded-xl object-cover"
          />
        )}

        <div className="mt-3 flex items-center gap-4 text-[11.5px] text-gray-500 dark:text-neutral-400">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            {formatCount(post.likesCount || 0)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {formatCount(post.commentsCount || 0)}
          </span>
          <span className="ml-auto font-semibold text-blue-600 dark:text-blue-400">
            View post
          </span>
        </div>
      </Link>
    </article>
  );
}

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(value);
}

function formatEventDate(startsAt: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return 'Upcoming';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default FeedModuleCard;
