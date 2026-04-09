'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import { recordLogin } from '@/lib/api/engagement';
import {
  invalidateGamificationQueries,
  useGamificationRealtimeSync,
} from '@/hooks/useLiveGamification';
import ExitMessage from './ExitMessage';

/**
 * EngagementProvider - Wraps the app to handle:
 * 1. Login streak tracking (Habit Loop cue)
 * 2. Exit message display (Peak-End Rule)
 * 
 * Place inside AuthProvider in layout.tsx
 */
export default function EngagementProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const loginRecorded = useRef(false);

  useGamificationRealtimeSync();

  // Record login for streak tracking
  useEffect(() => {
    if (user && !loginRecorded.current) {
      loginRecorded.current = true;
      recordLogin()
        .then(() => invalidateGamificationQueries(queryClient))
        .catch(console.error);
    }
  }, [queryClient, user]);

  return (
    <>
      {children}
      {/* Peak-End Rule: Show positive message when user exits */}
      {user && <ExitMessage />}
    </>
  );
}
