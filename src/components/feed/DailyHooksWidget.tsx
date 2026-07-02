'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { dailyHooksAPI } from '@/lib/api/daily-hooks';

export function DailyHooksWidget() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data } = useQuery({
    queryKey: ['daily-hooks'],
    queryFn: async () => {
      const res = await dailyHooksAPI.getHooks();
      return res.hooks;
    },
    staleTime: 5 * 60 * 1000, // 5 min - cached when navigating back
    gcTime: 10 * 60 * 1000,
  });

  const hooks = data ?? [];
  const visible = hooks.filter(h => !dismissed.has(h.id)).slice(0, 3);

  if (visible.length === 0) return null;

  return (
    <div className="px-4 py-2">
      <AnimatePresence>
        {visible.map((hook) => (
          <motion.div
            key={hook.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-2"
          >
            <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-100/80 dark:border-blue-900/40">
              <span className="flex-shrink-0 w-9 h-9 rounded-full bg-white dark:bg-neutral-900 shadow-sm flex items-center justify-center text-base">
                {hook.emoji}
              </span>
              <p className="flex-1 text-sm font-medium text-gray-800 dark:text-neutral-200 leading-snug">{hook.title}</p>
              <button
                onClick={() => router.push(hook.action.href)}
                className="px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold flex-shrink-0 hover:bg-blue-700 transition-colors shadow-sm"
              >
                {hook.action.label}
              </button>
              <button
                onClick={() => setDismissed(prev => new Set([...prev, hook.id]))}
                aria-label="Dismiss"
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-black/5 dark:hover:text-neutral-300 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
