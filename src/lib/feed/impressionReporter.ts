'use client';

import { recordFeedImpressions } from '@/lib/api/posts';

/**
 * Batches viewport impressions and reports them to the backend.
 *
 * The ranker demotes posts the viewer has already seen, but that signal was
 * never populated — `feed_impressions` had no writer and no route, so every
 * reload re-ranked from identical inputs and produced identical ordering. This
 * is the client half of the fix: report what actually entered the viewport.
 *
 * Reporting is batched rather than one request per post, because a feed scroll
 * would otherwise fire a request per card. Ordering decisions stay entirely
 * server-side; this only ships post ids.
 */

const FLUSH_DELAY_MS = 2_000;
const MAX_BATCH = 100;

/** Reported at least once this page session — never sent twice. */
const reported = new Set<string>();
const pending = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;

function sendBatch(postIds: string[]): void {
  if (postIds.length === 0) return;
  // A dropped impression only costs ranking freshness, never correctness.
  void recordFeedImpressions(postIds).catch(() => undefined);
}

function flush(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (pending.size === 0) return;

  const batch = Array.from(pending).slice(0, MAX_BATCH);
  batch.forEach((postId) => {
    pending.delete(postId);
    reported.add(postId);
  });
  sendBatch(batch);

  // More than one batch worth queued up: keep draining.
  if (pending.size > 0) scheduleFlush();
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
}

function bindLifecycleListeners(): void {
  if (listenersBound || typeof document === 'undefined') return;
  listenersBound = true;

  // Flush before the page goes away, otherwise the last screenful of
  // impressions is lost on every navigation — which is most of them.
  const flushNow = () => flush();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow();
  });
  window.addEventListener('pagehide', flushNow);
}

export function queuePostImpression(postId: string): void {
  if (!postId || reported.has(postId) || pending.has(postId)) return;
  bindLifecycleListeners();
  pending.add(postId);
  scheduleFlush();
}

/** Test/debug helper: forget what has been reported this session. */
export function resetReportedImpressions(): void {
  reported.clear();
  pending.clear();
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}
