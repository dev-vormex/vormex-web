'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, X } from 'lucide-react';
import { dailyHooksAPI, type DailyHook } from '@/lib/api/daily-hooks';

/**
 * SetupStrip — the onboarding nudges, collapsed into one row.
 *
 * DailyHooksWidget rendered every hook as its own full-width gradient card, so
 * a new account saw three stacked banners ("Add a bio", "Grow your network",
 * "Share your first post") before any content — roughly 170px of chrome that
 * pushed the composer off-screen. Same hooks, same actions, one row: the
 * highest-priority hook is the visible CTA, the rest expand on demand.
 *
 * Dismissals persist per-hook in localStorage. The old widget kept them in
 * component state, so every dismissed nudge came back on the next navigation.
 */

const DISMISS_KEY = 'vx_setup_strip_dismissed';

function readDismissed(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids: string[]): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify(ids.slice(-40)));
  } catch {
    // A full or blocked storage just means dismissals last for this session.
  }
}

export function SetupStrip() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  /*
   * Previously-dismissed ids are read during render (the same way the feed
   * reads its cached snapshot), and ids dismissed in this session are tracked
   * separately. Nothing renders until the hooks query resolves after mount, so
   * this cannot produce a hydration mismatch.
   */
  const storedDismissed = useMemo(() => readDismissed(), []);
  const [sessionDismissed, setSessionDismissed] = useState<string[]>([]);

  const { data } = useQuery({
    queryKey: ['daily-hooks'],
    queryFn: async () => {
      const res = await dailyHooksAPI.getHooks();
      return res.hooks;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const hooks = useMemo(() => {
    const dismissedSet = new Set([...storedDismissed, ...sessionDismissed]);
    return (data ?? [])
      .filter((hook) => !dismissedSet.has(hook.id))
      .slice(0, 4);
  }, [data, sessionDismissed, storedDismissed]);

  const dismiss = (id: string) => {
    setSessionDismissed((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writeDismissed([...storedDismissed, ...next]);
      return next;
    });
  };

  if (hooks.length === 0) return null;

  const [lead, ...rest] = hooks;

  // Padding mirrors the post column so the strip's edges line up with the cards.
  return (
    <section className="px-3 pb-1 pt-2.5 sm:px-4 lg:px-0">
      <div className="rounded-2xl border border-blue-100/90 bg-gradient-to-r from-blue-50/90 to-indigo-50/60 dark:border-blue-900/40 dark:from-blue-950/40 dark:to-indigo-950/25">
        <HookRow
          hook={lead}
          onAct={() => router.push(lead.action.href)}
          onDismiss={() => dismiss(lead.id)}
          trailing={
            rest.length > 0 ? (
              <button
                type="button"
                onClick={() => setExpanded((open) => !open)}
                aria-expanded={expanded}
                className="flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-medium text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-700 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200"
              >
                {expanded ? 'Less' : `+${rest.length} more`}
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
              </button>
            ) : null
          }
        />

        <AnimatePresence initial={false}>
          {expanded && rest.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="border-t border-blue-100/80 dark:border-blue-900/40">
                {rest.map((hook) => (
                  <HookRow
                    key={hook.id}
                    hook={hook}
                    onAct={() => router.push(hook.action.href)}
                    onDismiss={() => dismiss(hook.id)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function HookRow({
  hook,
  onAct,
  onDismiss,
  trailing,
}: {
  hook: DailyHook;
  onAct: () => void;
  onDismiss: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 sm:gap-3">
      <span
        aria-hidden
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white text-[13px] shadow-sm dark:bg-neutral-900"
      >
        {hook.emoji}
      </span>
      <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-gray-800 dark:text-neutral-200">
        {hook.title}
      </p>
      {trailing}
      <button
        type="button"
        onClick={onAct}
        className="flex-shrink-0 rounded-full bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        {hook.action.label}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={`Dismiss: ${hook.title}`}
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-neutral-300"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default SetupStrip;
