'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { dailyHooksAPI, type DailyHook } from '@/lib/api/daily-hooks';

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
        {visible.map((hook, i) => (
          <motion.div
            key={hook.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-2"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800">
              <span className="text-xl flex-shrink-0">{hook.emoji}</span>
              <p className="flex-1 text-sm text-gray-800 dark:text-neutral-200">{hook.title}</p>
              <button
                onClick={() => router.push(hook.action.href)}
                className="px-3 py-1 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-semibold flex-shrink-0 hover:opacity-80 transition-opacity"
              >
                {hook.action.label}
              </button>
              <button
                onClick={() => setDismissed(prev => new Set([...prev, hook.id]))}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 flex-shrink-0"
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
