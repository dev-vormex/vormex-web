'use client';

import { useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { managedAdsAPI, type ManagedAdCreative } from '@/lib/api/managed-ads';

export function ManagedAdCard({ ad, sessionId }: { ad: ManagedAdCreative; sessionId: string }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    managedAdsAPI.trackImpression(ad.campaignId, {
      placement: 'feed',
      slotKey: ad.slotKey,
      sessionId,
    }).catch(() => undefined);
  }, [ad.campaignId, ad.slotKey, sessionId]);

  const trackClick = () => {
    managedAdsAPI.trackClick(ad.campaignId, {
      placement: 'feed',
      slotKey: ad.slotKey,
      sessionId,
    }).catch(() => undefined);
  };

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      {ad.feedImageUrl && (
        <img src={ad.feedImageUrl} alt="" className="h-56 w-full object-cover" loading="lazy" />
      )}
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-neutral-500">Sponsored</p>
          <p className="text-xs text-gray-500 dark:text-neutral-500">{ad.sponsorName}</p>
        </div>
        <h3 className="text-lg font-bold text-gray-950 dark:text-white">{ad.feedTitle || ad.sponsorName}</h3>
        {ad.feedBody && <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">{ad.feedBody}</p>}
        {ad.ctaUrl && (
          <a
            href={ad.ctaUrl}
            target="_blank"
            rel="noreferrer"
            onClick={trackClick}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {ad.ctaText || 'Learn more'}
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </article>
  );
}
