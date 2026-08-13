'use client';

import { useCallback, useEffect, useRef } from 'react';
import { managedAdsAPI, type ManagedAdPlacement } from '@/lib/api/managed-ads';

/**
 * Tracks a managed-ad impression once the creative is actually on screen, and
 * returns the ref to attach plus a click reporter.
 *
 * The previous implementation fired the impression from a bare mount effect, so
 * a sponsored card counted as seen the moment it entered the React tree — even
 * when it sat far below the fold and the viewer never scrolled to it. That
 * inflates delivery numbers advertisers are billed against. This waits for 50%
 * of the card to be visible before reporting, and reports at most once per
 * mounted creative.
 */
export function useAdImpression(input: {
  campaignId: string;
  placement: ManagedAdPlacement;
  slotKey: string | null;
  sessionId: string;
}) {
  const { campaignId, placement, slotKey, sessionId } = input;
  const ref = useRef<HTMLElement | null>(null);
  const reported = useRef(false);

  useEffect(() => {
    reported.current = false;
  }, [campaignId, slotKey]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const report = () => {
      if (reported.current) return;
      reported.current = true;
      managedAdsAPI
        .trackImpression(campaignId, { placement, slotKey, sessionId })
        .catch(() => undefined);
    };

    // Older browsers without IntersectionObserver still need delivery counted.
    if (typeof IntersectionObserver === 'undefined') {
      report();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          report();
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [campaignId, placement, slotKey, sessionId]);

  const trackClick = useCallback(() => {
    managedAdsAPI
      .trackClick(campaignId, { placement, slotKey, sessionId })
      .catch(() => undefined);
  }, [campaignId, placement, slotKey, sessionId]);

  return { ref, trackClick };
}
