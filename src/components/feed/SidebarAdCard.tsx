'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { managedAdsAPI, type ManagedAdCreative } from '@/lib/api/managed-ads';
import { CARD_EYEBROW, PANEL_SURFACE } from '@/components/feed/surface';
import { useAdImpression } from '@/components/feed/useAdImpression';

/**
 * SidebarAdCard — the sticky sponsored slot in the feed's right rail.
 *
 * This is the `sidebar` managed-ad placement: a single persistent creative
 * rather than one interleaved between posts, so it is fetched on its own from
 * `/ads/sidebar` instead of riding along with a page of feed items. Admin
 * targets it from the same campaign editor and it reuses the feed creative at a
 * narrower width, so no new upload fields were needed.
 *
 * Renders nothing when no campaign targets the viewer — an empty rail is better
 * than a house placeholder.
 */
export function SidebarAdCard({ sessionId }: { sessionId: string }) {
  const { data } = useQuery({
    queryKey: ['managed-ads', 'sidebar', sessionId],
    queryFn: () => managedAdsAPI.getSidebarAd(sessionId),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    // A missing sponsored slot is not worth retrying at the user's expense.
    retry: false,
    refetchOnWindowFocus: false,
  });

  const ad = data?.ad;
  if (!ad) return null;

  return <SidebarAdBody ad={ad} sessionId={sessionId} />;
}

function SidebarAdBody({ ad, sessionId }: { ad: ManagedAdCreative; sessionId: string }) {
  const { ref, trackClick } = useAdImpression({
    campaignId: ad.campaignId,
    placement: 'sidebar',
    slotKey: ad.slotKey,
    sessionId,
  });

  const headline = ad.feedTitle || ad.sponsorName;

  return (
    <aside
      ref={ref as React.Ref<HTMLElement>}
      className={PANEL_SURFACE}
      aria-label={`Sponsored: ${headline}`}
    >
      <div className="flex items-baseline justify-between gap-2 px-3.5 pt-3">
        <p className={CARD_EYEBROW}>Sponsored</p>
        <p className="truncate text-[11px] text-gray-400 dark:text-neutral-500">
          {ad.sponsorName}
        </p>
      </div>

      {ad.feedImageUrl && (
        <div className="mt-2.5 aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ad.feedImageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="px-3.5 pb-3.5 pt-2.5">
        <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-gray-950 dark:text-white">
          {headline}
        </h3>
        {ad.feedBody && (
          <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-gray-600 dark:text-neutral-400">
            {ad.feedBody}
          </p>
        )}
        {ad.ctaUrl && (
          <a
            href={ad.ctaUrl}
            target="_blank"
            rel="nofollow sponsored noreferrer"
            onClick={trackClick}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gray-900 px-3 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            {ad.ctaText || 'Learn more'}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </aside>
  );
}

export default SidebarAdCard;
