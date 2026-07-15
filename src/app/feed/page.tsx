'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Feed } from '@/components/feed';
import { getFeedTheme } from '@/lib/utils/feedTheme';

export default function FeedPage() {
  const [feedTheme, setFeedTheme] = useState<'default' | 'grid'>(() =>
    typeof window === 'undefined' ? 'default' : getFeedTheme()
  );
  useEffect(() => {
    const handleStorage = () => setFeedTheme(getFeedTheme());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
  const isGrid = feedTheme === 'grid';
  return (
    <ProtectedRoute>
      <main className={`min-h-screen overflow-x-hidden ${isGrid ? 'relative bg-gray-50 dark:bg-neutral-950' : 'bg-[#eef4ff] dark:bg-[#040814]'}`}>
        {!isGrid && <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_32%)]" />}
        {isGrid && <div className="pointer-events-none fixed inset-0 -z-10 opacity-60 [background-image:linear-gradient(to_right,rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.08)_1px,transparent_1px)] [background-size:20px_20px] dark:opacity-20" />}
        <Feed />
      </main>
    </ProtectedRoute>
  );
}
