'use client';

import { ArrowUpRight } from 'lucide-react';
import { type ManagedAdCreative } from '@/lib/api/managed-ads';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { CARD_EYEBROW, FEED_SURFACE } from '@/components/feed/surface';
import { useAdImpression } from '@/components/feed/useAdImpression';

/**
 * The in-feed sponsored card.
 *
 * Restyled to sit in the same card language as PostCard (see surface.ts) — it
 * previously used a tighter radius and a hard border while every neighbouring
 * card had a soft shadow, so a sponsored slot read as a rendering glitch rather
 * than as a sponsor. It now opens with an author-style row so the sponsor is
 * identified the same way a post author is, which is also the honest way to
 * label paid content.
 *
 * The image sits in a fixed 16:9 box. The old `h-56 w-full` crop meant the
 * card's height depended on whether a creative had an image at all, so the feed
 * reflowed as ads streamed in.
 */
export function ManagedAdCard({ ad, sessionId }: { ad: ManagedAdCreative; sessionId: string }) {
  const { ref, trackClick } = useAdImpression({
    campaignId: ad.campaignId,
    placement: 'feed',
    slotKey: ad.slotKey,
    sessionId,
  });

  const headline = ad.feedTitle || ad.sponsorName;

  return (
    <article
      ref={ref as React.Ref<HTMLElement>}
      className={FEED_SURFACE}
      aria-label={`Sponsored: ${headline}`}
    >
      <header className="flex items-center gap-2.5 px-3.5 pt-3.5 sm:px-4">
        <UserAvatar
          imageSrc={null}
          name={ad.sponsorName}
          className="h-9 w-9 bg-gradient-to-br from-slate-200 to-slate-300 text-sm font-bold text-slate-600 dark:from-neutral-700 dark:to-neutral-800 dark:text-neutral-200"
          fallbackClassName="text-sm font-bold"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-gray-900 dark:text-white">
            {ad.sponsorName}
          </p>
          <p className={CARD_EYEBROW}>Sponsored</p>
        </div>
      </header>

      <div className="px-3.5 pb-3.5 pt-2.5 sm:px-4">
        <h3 className="text-[15px] font-semibold leading-snug text-gray-950 dark:text-white">
          {headline}
        </h3>
        {ad.feedBody && (
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-gray-600 dark:text-neutral-400">
            {ad.feedBody}
          </p>
        )}

        {ad.feedImageUrl && (
          <div className="mt-3 aspect-[16/9] overflow-hidden rounded-xl bg-gray-100 dark:bg-neutral-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ad.feedImageUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {ad.ctaUrl && (
          <a
            href={ad.ctaUrl}
            target="_blank"
            rel="nofollow sponsored noreferrer"
            onClick={trackClick}
            className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            {ad.ctaText || 'Learn more'}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </article>
  );
}

export default ManagedAdCard;
