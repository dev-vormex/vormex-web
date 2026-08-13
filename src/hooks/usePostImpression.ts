'use client';

import { useEffect, useRef } from 'react';
import { queuePostImpression } from '@/lib/feed/impressionReporter';

/**
 * Reports a post as seen once it is genuinely on screen, and returns the ref to
 * attach to the card.
 *
 * "Served" is not "seen": the feed returns far more rows than a viewer scrolls
 * through, so recording impressions server-side at response time would demote
 * posts nobody ever looked at. This waits for half the card to be visible.
 */
export function usePostImpression(postId: string) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !postId) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          queuePostImpression(postId);
          // One impression per card per session is all the ranker needs.
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [postId]);

  return ref;
}
