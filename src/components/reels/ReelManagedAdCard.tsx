'use client';

import { useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { managedAdsAPI, type ManagedAdCreative } from '@/lib/api/managed-ads';

export function ReelManagedAdCard({ ad, isActive, sessionId }: { ad: ManagedAdCreative; isActive: boolean; sessionId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (!isActive) {
      videoRef.current?.pause();
      return;
    }
    videoRef.current?.play().catch(() => undefined);
    if (tracked.current) return;
    tracked.current = true;
    managedAdsAPI.trackImpression(ad.campaignId, {
      placement: 'reels',
      slotKey: ad.slotKey,
      sessionId,
    }).catch(() => undefined);
  }, [ad.campaignId, ad.slotKey, isActive, sessionId]);

  const trackClick = () => {
    managedAdsAPI.trackClick(ad.campaignId, {
      placement: 'reels',
      slotKey: ad.slotKey,
      sessionId,
    }).catch(() => undefined);
  };

  return (
    <div className="relative h-full w-full bg-black text-white">
      {ad.reelsVideoUrl || ad.reelsHlsUrl ? (
        <video
          ref={videoRef}
          src={ad.reelsVideoUrl || ad.reelsHlsUrl || undefined}
          poster={ad.reelsThumbnailUrl || undefined}
          className="h-full w-full object-cover"
          muted
          loop
          playsInline
        />
      ) : ad.reelsThumbnailUrl ? (
        <img src={ad.reelsThumbnailUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-neutral-950" />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-5 pb-24">
        <p className="mb-2 text-xs font-semibold uppercase text-white/70">Sponsored - {ad.sponsorName}</p>
        <h2 className="max-w-lg text-2xl font-bold">{ad.feedTitle || ad.sponsorName}</h2>
        {ad.reelCaption && <p className="mt-2 max-w-lg text-sm text-white/80">{ad.reelCaption}</p>}
        {ad.ctaUrl && (
          <a
            href={ad.ctaUrl}
            target="_blank"
            rel="noreferrer"
            onClick={trackClick}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
          >
            {ad.ctaText || 'Learn more'}
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
