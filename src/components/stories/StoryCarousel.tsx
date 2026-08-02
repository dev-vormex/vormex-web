'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import { getStoriesFeed, type StoryGroup, type Story } from '@/lib/api/stories';
import { readCachedStories, writeCachedStories } from '@/lib/stories/browserCache';
import { initializeSocket } from '@/lib/socket';

interface StoryCarouselProps {
  onOpenStory: (group: StoryGroup, startIndex?: number) => void;
  onCreateStory: () => void;
}

export function StoryCarousel({ onOpenStory, onCreateStory }: StoryCarouselProps) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Last stories snapshot from localStorage so a fresh page load paints the
  // carousel (and starts the LCP image download) without waiting for the
  // network. Safe to read in render: this component is client-only, it never
  // appears in server-rendered HTML.
  const cachedStories = useMemo(() => readCachedStories(user?.id), [user?.id]);

  // Cached with React Query - no reload when navigating back to home
  const { data, isLoading: queryLoading, dataUpdatedAt } = useQuery({
    queryKey: ['stories', user?.id],
    queryFn: async () => {
      const response = await getStoriesFeed();
      const groups = response?.storyGroups || [];
      writeCachedStories(user?.id, groups);
      return groups;
    },
    staleTime: 5 * 60 * 1000, // 5 min - instant back navigation
    gcTime: 24 * 60 * 60 * 1000,
    initialData: cachedStories?.value,
    initialDataUpdatedAt: cachedStories?.savedAt,
    enabled: !authLoading && !!user,
    retry: (failureCount, error) =>
      failureCount < 2 &&
      (error as { response?: { status?: number } })?.response?.status !== 401,
  });

  const storyGroups = useMemo(() => data ?? [], [data]);
  const loading = authLoading || (queryLoading && storyGroups.length === 0);

  useEffect(() => {
    if (!user?.id || !data || dataUpdatedAt <= (cachedStories?.savedAt || 0)) return;
    writeCachedStories(user.id, data);
  }, [cachedStories?.savedAt, data, dataUpdatedAt, user?.id]);

  // Listen for real-time story updates.
  // initializeSocket() (not getSocket()) so this works even when this child
  // component mounts before the parent Feed has created the socket.
  useEffect(() => {
    if (!user?.id) return;
    const socket = initializeSocket();

    const handleStoryCreated = (data: { story: Story; author: StoryGroup['user']; timestamp: Date }) => {
      queryClient.setQueryData<StoryGroup[]>(['stories', user?.id], (prev) => {
        const list = prev ?? [];
        const existingGroupIndex = list.findIndex(g => g.user.id === data.author.id);
        if (existingGroupIndex >= 0) {
          const updated = [...list];
          updated[existingGroupIndex] = {
            ...updated[existingGroupIndex],
            stories: [data.story, ...updated[existingGroupIndex].stories],
            hasUnviewed: true,
            lastStoryAt: data.story.createdAt,
          };
          return updated;
        }
        const newGroup: StoryGroup = {
          user: data.author,
          stories: [data.story],
          hasUnviewed: true,
          lastStoryAt: data.story.createdAt,
          isOwnStory: data.author.id === user?.id,
        };
        const ownGroupIndex = list.findIndex(g => g.isOwnStory);
        if (newGroup.isOwnStory) {
          return [newGroup, ...list.filter(g => !g.isOwnStory)];
        } else if (ownGroupIndex >= 0) {
          return [list[ownGroupIndex], newGroup, ...list.filter((g, i) => !g.isOwnStory && i !== ownGroupIndex)];
        }
        return [newGroup, ...list];
      });
    };

    const handleStoryDeleted = (data: { storyId: string; authorId: string; timestamp: Date }) => {
      queryClient.setQueryData<StoryGroup[]>(['stories', user?.id], (prev) => {
        const list = prev ?? [];
        return list.map(group => {
          if (group.user.id === data.authorId) {
            const filteredStories = group.stories.filter(s => s.id !== data.storyId);
            if (filteredStories.length === 0) return null;
            return { ...group, stories: filteredStories };
          }
          return group;
        }).filter(Boolean) as StoryGroup[];
      });
    };

    socket.on('story:created', handleStoryCreated);
    socket.on('story:deleted', handleStoryDeleted);

    return () => {
      socket.off('story:created', handleStoryCreated);
      socket.off('story:deleted', handleStoryDeleted);
    };
  }, [user?.id, queryClient]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    };

    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [storyGroups]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const ownStoryGroup = storyGroups.find(g => g.isOwnStory);
  const otherStoryGroups = storyGroups.filter(g => !g.isOwnStory);

  // Show loading skeleton while auth is loading or stories are loading
  if (authLoading || loading) {
    return (
      <div className="w-full px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex gap-2.5 overflow-hidden sm:gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex w-[clamp(4.25rem,21vw,5rem)] flex-shrink-0 flex-col items-center gap-2"
            >
              <div className="h-[clamp(3.75rem,18vw,4.5rem)] w-[clamp(3.75rem,18vw,4.5rem)] animate-pulse rounded-full bg-gray-200 dark:bg-neutral-800" />
              <div className="h-2.5 w-12 animate-pulse rounded-full bg-gray-200 dark:bg-neutral-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="group relative w-full py-3 sm:py-4">
      {/* Left Scroll Button */}
      <AnimatePresence>
        {canScrollLeft && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 sm:flex dark:bg-neutral-800"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-neutral-300" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Right Scroll Button */}
      <AnimatePresence>
        {canScrollRight && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 sm:flex dark:bg-neutral-800"
          >
            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-neutral-300" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Story Cards */}
      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-2.5 overflow-x-auto px-3 scroll-smooth sm:gap-4 sm:px-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Create Story Card */}
        <motion.button
          onClick={onCreateStory}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label={ownStoryGroup ? 'Add to your story' : 'Create a story'}
          className="flex w-[clamp(4.25rem,21vw,5rem)] flex-shrink-0 flex-col items-center gap-1.5"
        >
          <div className="relative h-[clamp(3.75rem,18vw,4.5rem)] w-[clamp(3.75rem,18vw,4.5rem)] rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 p-[3px] shadow-sm">
            <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-white bg-slate-100 dark:border-neutral-900 dark:bg-neutral-800">
              {user?.profileImage ? (
                <Image
                  src={user.profileImage}
                  alt="Your story"
                  fill
                  sizes="(max-width: 640px) 64px, 72px"
                  loading="eager"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-violet-100 text-lg font-bold text-blue-600 dark:from-blue-950 dark:to-violet-950 dark:text-blue-300">
                  {user?.name?.charAt(0).toUpperCase() || 'Y'}
                </div>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-sm dark:border-neutral-900">
              <Plus className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          </div>
          <span className="w-full truncate text-center text-[11px] font-medium text-gray-700 sm:text-xs dark:text-neutral-300">
            {ownStoryGroup ? 'Add story' : 'Your story'}
          </span>
        </motion.button>

        {/* Own Story (if exists) */}
        {ownStoryGroup && (
          <StoryCard
            group={ownStoryGroup}
            onClick={() => onOpenStory(ownStoryGroup)}
            isOwn
            eager
          />
        )}

        {/* Other Stories */}
        {otherStoryGroups.map((group, index) => (
          <StoryCard
            key={group.user.id}
            group={group}
            onClick={() => onOpenStory(group)}
            eager={index < 3}
          />
        ))}

        {/* Empty state — fills the row instead of leaving a blank void */}
        {otherStoryGroups.length === 0 && (
          <div className="flex min-h-[72px] min-w-[210px] flex-1 flex-col justify-center rounded-2xl border border-dashed border-gray-200 px-4 dark:border-neutral-800">
            <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400">
              No stories from your network yet
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400 dark:text-neutral-500">
              Share what you&apos;re working on and start the streak
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
interface StoryCardProps {
  group: StoryGroup;
  onClick: () => void;
  isOwn?: boolean;
  eager?: boolean;
}

// Hosts covered by next.config.ts images.remotePatterns. Media from these can
// go through the Next image optimizer (resized ~224px thumb instead of the
// full-resolution upload); anything else falls back to a plain <img>.
function canOptimizeImage(src: string): boolean {
  try {
    const url = new URL(src);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'vormex.b-cdn.net' ||
        url.hostname.endsWith('.googleusercontent.com'))
    );
  } catch {
    return false;
  }
}

function StoryCard({ group, onClick, isOwn, eager }: StoryCardProps) {
  const { user, stories, hasUnviewed } = group;
  const latestStory = stories[0];
  const storyImageSrc = latestStory.thumbnailUrl || latestStory.mediaUrl;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      aria-label={`Open ${isOwn ? 'your' : user.name + "'s"} story`}
      className="group/card flex w-[clamp(4.25rem,21vw,5rem)] flex-shrink-0 flex-col items-center gap-1.5"
    >
      <div className={`relative h-[clamp(3.75rem,18vw,4.5rem)] w-[clamp(3.75rem,18vw,4.5rem)] rounded-full p-[3px] shadow-sm ${
        hasUnviewed
          ? 'bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500'
          : 'bg-gray-300 dark:bg-neutral-700'
      }`}>
        <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-white bg-gray-100 dark:border-neutral-900 dark:bg-neutral-800">
          {storyImageSrc ? (
            canOptimizeImage(storyImageSrc) ? (
              <Image
                src={storyImageSrc}
                alt={`${user.name}'s story`}
                fill
                sizes="(max-width: 640px) 64px, 72px"
                priority={eager}
                className="object-cover transition-transform duration-300 group-hover/card:scale-105"
              />
            ) : (
              <img
                src={storyImageSrc}
                alt={`${user.name}'s story`}
                fetchPriority={eager ? 'high' : 'auto'}
                loading={eager ? 'eager' : 'lazy'}
                className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
              />
            )
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ backgroundColor: latestStory.backgroundColor || '#3B82F6' }}
            >
              <span className="text-lg font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {latestStory.textContent && !storyImageSrc && (
            <div className="absolute inset-1 flex items-center justify-center">
              <p className="line-clamp-3 text-center text-[8px] font-medium leading-tight text-white">
                {latestStory.textContent}
              </p>
            </div>
          )}
        </div>

        {stories.length > 1 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-slate-900 px-1 text-[9px] font-semibold text-white dark:border-neutral-900">
            {stories.length}
          </span>
        )}
      </div>

      <span className={hasUnviewed
        ? 'w-full truncate text-center text-[11px] font-semibold text-gray-900 sm:text-xs dark:text-white'
        : 'w-full truncate text-center text-[11px] font-medium text-gray-500 sm:text-xs dark:text-neutral-400'
      }>
        {isOwn ? 'Your story' : user.name.split(' ')[0]}
      </span>
    </motion.button>
  );
}
