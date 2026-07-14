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
  const { data, isLoading: queryLoading } = useQuery({
    queryKey: ['stories', user?.id],
    queryFn: async () => {
      const response = await getStoriesFeed();
      const groups = response?.storyGroups || [];
      writeCachedStories(user?.id, groups);
      return groups;
    },
    staleTime: 5 * 60 * 1000, // 5 min - instant back navigation
    gcTime: 10 * 60 * 1000,
    initialData: cachedStories?.value,
    initialDataUpdatedAt: cachedStories?.savedAt,
    enabled: !authLoading && !!user,
    retry: (failureCount, error) =>
      failureCount < 2 &&
      (error as { response?: { status?: number } })?.response?.status !== 401,
  });

  const storyGroups = useMemo(() => data ?? [], [data]);
  const loading = authLoading || (queryLoading && storyGroups.length === 0);

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
      <div className="w-full py-4 px-4">
        <div className="flex gap-3 overflow-hidden">
          {/* Skeleton for create story */}
          <div className="flex-shrink-0 w-28 h-40 bg-gray-200 dark:bg-neutral-800 rounded-2xl animate-pulse" />
          {/* Skeletons for stories */}
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-28 h-40 bg-gray-200 dark:bg-neutral-800 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full py-4 group">
      {/* Left Scroll Button */}
      <AnimatePresence>
        {canScrollLeft && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white dark:bg-neutral-800 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white dark:bg-neutral-800 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-neutral-300" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Story Cards */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide px-4 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Create Story Card */}
        <motion.button
          onClick={onCreateStory}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-shrink-0 relative w-28 h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg"
        >
          {/* User Avatar Background */}
          {user?.profileImage ? (
            <div className="absolute inset-0">
              <Image
                src={user.profileImage}
                alt="Your story"
                fill
                sizes="112px"
                loading="eager"
                className="object-cover opacity-30"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600" />
          )}

          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-white dark:bg-neutral-900 flex items-center justify-center shadow-lg mb-2">
              <Plus className="w-6 h-6 text-blue-500" />
            </div>
            <span className="text-white text-xs font-semibold text-center px-2">
              {ownStoryGroup ? 'Add to Story' : 'Create Story'}
            </span>
          </div>

          {/* Glassmorphic overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-white/10 backdrop-blur-sm" />
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
          <div className="flex-1 min-w-[220px] h-40 rounded-2xl border-2 border-dashed border-gray-200 dark:border-neutral-800 flex flex-col items-center justify-center gap-1 px-6">
            <span className="text-xl">✨</span>
            <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400">
              No stories from your network yet
            </p>
            <p className="text-[11px] text-gray-400 dark:text-neutral-500 text-center">
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
      className="flex-shrink-0 relative w-28 h-40 rounded-2xl overflow-hidden shadow-lg group/card"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        {storyImageSrc ? (
          canOptimizeImage(storyImageSrc) ? (
            <Image
              src={storyImageSrc}
              alt={`${user.name}'s story`}
              fill
              sizes="112px"
              priority={eager}
              className="object-cover transition-transform duration-300 group-hover/card:scale-105"
            />
          ) : (
            <img
              src={storyImageSrc}
              alt={`${user.name}'s story`}
              fetchPriority={eager ? 'high' : 'auto'}
              loading={eager ? 'eager' : 'lazy'}
              className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105"
            />
          )
        ) : (
          <div 
            className="w-full h-full"
            style={{ backgroundColor: latestStory.backgroundColor || '#3B82F6' }}
          />
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
      </div>

      {/* Ring Border - Gradient for unviewed, gray for viewed */}
      <div 
        className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
          hasUnviewed
            ? 'ring-[3px] ring-offset-2 ring-offset-white dark:ring-offset-neutral-950'
            : 'ring-2 ring-gray-300 dark:ring-neutral-700'
        }`}
        style={hasUnviewed ? {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '3px',
        } : undefined}
      />

      {/* Avatar */}
      <div className="absolute top-2 left-2 z-10">
        <div className={`w-9 h-9 rounded-full overflow-hidden ring-2 ${
          hasUnviewed 
            ? 'ring-purple-500 ring-offset-1 ring-offset-black/50' 
            : 'ring-white/50'
        }`}>
          {user.profileImage ? (
            <Image
              src={user.profileImage}
              alt={user.name}
              width={36}
              height={36}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Story Count Badge */}
      {stories.length > 1 && (
        <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
          <span className="text-white text-[10px] font-medium">{stories.length}</span>
        </div>
      )}

      {/* Text Content Preview */}
      {latestStory.textContent && (
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 text-center">
          <p className="text-white text-xs font-medium line-clamp-3 drop-shadow-lg">
            {latestStory.textContent}
          </p>
        </div>
      )}

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-white text-xs font-semibold truncate">
          {isOwn ? 'Your Story' : user.name.split(' ')[0]}
        </p>
        {/* Time ago */}
        <p className="text-white/70 text-[10px]">
          {formatTimeAgo(new Date(latestStory.createdAt))}
        </p>
      </div>

      {/* Category Badge */}
      {latestStory.category && latestStory.category !== 'GENERAL' && (
        <div className="absolute bottom-10 left-2 right-2">
          <span className="text-[9px] text-white/80 bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
            {formatCategory(latestStory.category)}
          </span>
        </div>
      )}
    </motion.button>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return '1d';
}

function formatCategory(category: string): string {
  const map: Record<string, string> = {
    DAY_AT_WORK: '💼 Work',
    LEARNING: '📚 Learning',
    ACHIEVEMENT: '🏆 Achievement',
    PROJECT: '🚀 Project',
    EVENT: '🎉 Event',
    BEHIND_SCENES: '🎬 BTS',
    TIPS: '💡 Tips',
    QNA: '❓ Q&A',
  };
  return map[category] || category;
}
