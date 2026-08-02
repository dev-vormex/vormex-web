'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Compass, BarChart3, FileVideo } from 'lucide-react';
import { ReelsFeed } from '@/components/reels';
import { cn } from '@/lib/utils';

type FeedMode = 'foryou' | 'following';

export default function ReelsPage() {
  const router = useRouter();
  const [mode, setMode] = useState<FeedMode>('foryou');

  const handleCreateClick = useCallback(() => {
    router.push('/reels/create');
  }, [router]);

  const handleTrendingClick = useCallback(() => {
    router.push('/reels/trending');
  }, [router]);

  return (
    <div className="relative min-h-[100dvh] w-full bg-black">
      <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/85 via-black/45 to-transparent px-3 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 sm:pb-10 sm:pt-4">
        <div className="relative mx-auto flex max-w-lg items-center justify-center sm:justify-between">
          <h1 className="hidden text-xl font-bold text-white sm:block">Reels</h1>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex rounded-full border border-white/10 bg-black/35 p-0.5 backdrop-blur-md sm:p-1">
              <button
                onClick={() => setMode('foryou')}
                className={cn(
                  "rounded-full px-4 py-2 text-[13px] font-semibold transition-colors sm:py-1.5 sm:text-sm",
                  mode === 'foryou'
                    ? "bg-white text-black"
                    : "text-white hover:text-white/80"
                )}
              >
                For You
              </button>
              <button
                onClick={() => setMode('following')}
                className={cn(
                  "rounded-full px-4 py-2 text-[13px] font-semibold transition-colors sm:py-1.5 sm:text-sm",
                  mode === 'following'
                    ? "bg-white text-black"
                    : "text-white hover:text-white/80"
                )}
              >
                Following
              </button>
            </div>
            
            <div className="absolute right-0 top-10 flex items-center gap-1 sm:static sm:gap-3">
              <button
                onClick={handleTrendingClick}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/35 backdrop-blur-md transition-colors hover:bg-white/20 sm:h-10 sm:w-10"
                title="Trending"
                aria-label="Trending reels"
              >
                <Compass className="h-3.5 w-3.5 text-white sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={() => router.push('/reels/analytics')}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/35 backdrop-blur-md transition-colors hover:bg-white/20 sm:h-10 sm:w-10"
                title="Analytics"
                aria-label="Reels analytics"
              >
                <BarChart3 className="h-3.5 w-3.5 text-white sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={() => router.push('/reels/drafts')}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/35 backdrop-blur-md transition-colors hover:bg-white/20 sm:h-10 sm:w-10"
                title="Drafts"
                aria-label="Reel drafts"
              >
                <FileVideo className="h-3.5 w-3.5 text-white sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={handleCreateClick}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 transition-colors hover:bg-blue-600 sm:h-10 sm:w-10"
                title="Create Reel"
                aria-label="Create reel"
              >
                <Plus className="h-3.5 w-3.5 text-white sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ReelsFeed mode={mode} />
    </div>
  );
}
