'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import { initializeSocket } from '@/lib/socket';

export function AppWarmup() {
  const { user, loading } = useAuth();
  const warmedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user?.id || warmedUserIdRef.current === user.id) return;

    warmedUserIdRef.current = user.id;
    // Realtime notifications are the only global warm-up. Profile, chat, reels,
    // and discovery data now load from their owning page when it becomes visible.
    initializeSocket();
  }, [loading, user?.id]);

  return null;
}
