'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Feed } from '@/components/feed';
import { getFeedTheme } from '@/lib/utils/feedTheme';

export default function Home() {
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
      <div
        className={`min-h-screen overflow-x-hidden ${isGrid ? 'relative' : 'bg-[#eef4ff] dark:bg-[#040814]'}`}
      >
        {!isGrid && (
          <>
            <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.2),transparent_38%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_26%)]" />
            <div className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[24rem] bg-[linear-gradient(to_top,rgba(255,255,255,0.82),transparent)] dark:bg-[linear-gradient(to_top,rgba(4,8,20,0.96),transparent)]" />
          </>
        )}
        {isGrid && (
          <>
            {/* Light: sharp grid at top, fades to smooth at bottom */}
            <div
              className="fixed inset-0 -z-10 bg-gray-50 dark:hidden"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(0,0,0,0.08) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(0,0,0,0.08) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
                maskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 85%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 85%)',
              }}
            />
            {/* Dark: sharp grid at top, fades to smooth at bottom */}
            <div
              className="fixed inset-0 -z-10 hidden dark:block bg-neutral-950"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
                maskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 85%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 85%)',
              }}
            />
          </>
        )}
        <div className={isGrid ? 'relative' : ''}>
          <Feed />
        </div>
      </div>
    </ProtectedRoute>
  );
}
