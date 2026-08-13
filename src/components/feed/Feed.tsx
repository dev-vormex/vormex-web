'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { InfiniteData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Image as ImageIcon, Loader2, Plus, Video } from 'lucide-react';
import { PostCard } from '@/components/feed/PostCard';
import { PostCardSkeleton } from '@/components/feed/PostCardSkeleton';
import { StoryCarousel } from '@/components/stories/StoryCarousel';

// Interaction-only overlays: loaded on demand so they stay out of the
// critical home-page bundle and don't delay hydration/LCP.
const Comments = dynamic(
  () => import('@/components/feed/Comments').then((m) => m.Comments),
  { ssr: false }
);
const CreatePostModal = dynamic(
  () => import('@/components/feed/CreatePostModal').then((m) => m.CreatePostModal),
  { ssr: false }
);
const StoryViewer = dynamic(
  () => import('@/components/stories/StoryViewer').then((m) => m.StoryViewer),
  { ssr: false }
);
const StoryCreator = dynamic(
  () => import('@/components/stories/StoryCreator').then((m) => m.StoryCreator),
  { ssr: false }
);
import { getFeed } from '@/lib/api/posts';
import { type StoryGroup } from '@/lib/api/stories';
import {
  initializeSocket,
  getSocket,
  joinFeedRoom,
  joinPostRoom,
  leaveFeedRoom,
  leavePostRoom,
} from '@/lib/socket';
import { useAuth } from '@/lib/auth/useAuth';
import { SocialProofBar, StreakCounter, ProgressNudges, DailyMatchCard, PeopleFromYourCollege, ConnectionLimitBanner, Leaderboard, RewardPopup } from '@/components/engagement';
import { PostingStatusChip } from '@/components/feed/PostingStatusChip';
import { PeopleRail } from '@/components/feed/PeopleRail';
import { SetupStrip } from '@/components/feed/SetupStrip';
import { FeedModuleCard } from '@/components/feed/FeedModuleCard';
import { FeedLeftNav } from '@/components/feed/FeedLeftNav';
import { SidebarAdCard } from '@/components/feed/SidebarAdCard';
import { StreakWidget, WeeklyGoalsWidget, NudgeCard } from '@/components/engagement/FeedWidgets';
import { useRewards } from '@/hooks/useRewards';
import { useVariableRewards } from '@/hooks/useVariableRewards';
import { RewardCardRenderer } from '@/components/rewards';
import { NotificationPrompt } from '@/components/notifications';
import { ManagedAdCard } from '@/components/feed/ManagedAdCard';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { PANEL_SURFACE } from '@/components/feed/surface';
import type { FeedModulePlacement, FeedResponse, Post, PollOption } from '@/types/post';
import type { ManagedAdCreative } from '@/lib/api/managed-ads';
import { FEED_STALE_TIME, queryKeys } from '@/lib/queryKeys';
import { readCachedFeed, writeCachedFeed } from '@/lib/feed/browserCache';

type FeedCache = InfiniteData<FeedResponse, unknown>;

function createAdSessionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
type FeedSocketReactionPayload = {
  postId: string;
  userId: string;
  liked: boolean;
  likesCount: number;
  reactionType: Post['userReactionType'];
  reactionSummary: Post['reactionSummary'];
};

export function Feed() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { rewards, dismissReward } = useRewards(user?.id);
  const { activeCards, dismissCard } = useVariableRewards(user?.id);
  const [adSessionId] = useState(createAdSessionId);
  const adItemOffsetRef = useRef(0);
  // One fresh ranking per visit. A reload or a navigation back to the feed
  // mounts a new Feed, so this resets and the next first-page fetch re-ranks.
  const needsFreshRankingRef = useRef(true);
  const cachedFeed = useMemo(() => readCachedFeed(user?.id), [user?.id]);

  // Use React Query for feed - cached when navigating back from profile (no reload)
  const {
    data,
    isLoading: loading,
    isFetchingNextPage: loadingMore,
    fetchNextPage,
    hasNextPage: hasMore,
    error: queryError,
    refetch: retryFeed,
    dataUpdatedAt,
  } = useInfiniteQuery({
    queryKey: queryKeys.feed(user?.id),
    queryFn: async ({ pageParam }) => {
      const cursor = typeof pageParam === 'string' ? pageParam : undefined;
      const adItemOffset = cursor ? adItemOffsetRef.current : 0;
      /*
       * The first page fetched after opening the feed asks the backend to skip
       * its ranked-page snapshot, so a reload re-ranks instead of replaying the
       * cached order. Paging requests never refresh — they must resolve against
       * the snapshot their cursor belongs to.
       */
      const refresh = !cursor && needsFreshRankingRef.current;
      const res = await getFeed(cursor, 20, {
        adSessionId,
        adItemOffset,
        refresh,
      });
      if (refresh) needsFreshRankingRef.current = false;
      adItemOffsetRef.current = adItemOffset + res.posts.length;
      return res;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: FEED_STALE_TIME,
    gcTime: 24 * 60 * 60 * 1000,
    initialData: cachedFeed?.value,
    initialDataUpdatedAt: cachedFeed?.savedAt,
    /*
     * 'always' rather than true: with FEED_STALE_TIME at 30s and the cached
     * snapshot supplying initialDataUpdatedAt, `true` treats a reload inside
     * that window as fresh and never calls queryFn — so the feed would replay
     * localStorage and never ask for a new ranking. Cached posts still paint
     * first; this only guarantees the revalidation happens.
     */
    refetchOnMount: 'always',
    retry: (failureCount, requestError) =>
      failureCount < 2 &&
      (requestError as { response?: { status?: number } })?.response?.status !== 401,
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 2_000),
    enabled: !authLoading && !!user,
  });

  const posts = useMemo(() => data?.pages.flatMap((p) => p.posts) ?? [], [data]);
  const error = queryError && posts.length === 0 ? (queryError as Error).message : null;

  /*
   * Interleaved slots are indexed by the 1-based position of the post they
   * follow, so rendering a post is a map lookup instead of a scan. The previous
   * code called `adPlacements.filter(...)` inside the post loop, which is
   * O(posts × placements) on every render of the list.
   */
  const adsByPosition = useMemo(() => {
    const map = new Map<number, ManagedAdCreative[]>();
    for (const page of data?.pages ?? []) {
      for (const ad of page.adPlacements ?? []) {
        const list = map.get(ad.afterItemCount);
        if (list) list.push(ad);
        else map.set(ad.afterItemCount, [ad]);
      }
    }
    return map;
  }, [data]);

  /*
   * Server-ranked recommendation modules (PEOPLE / REELS / JOBS / EVENTS and
   * premium post boosts). The backend picks the type and the feed position;
   * this feed previously dropped the field on the floor and hardcoded a fixed
   * stack of rails above the posts instead. Positions are absolute across the
   * ranked session, and only the first page carries them, so they are keyed off
   * the accumulated post index.
   */
  const modulesByPosition = useMemo(() => {
    const map = new Map<number, FeedModulePlacement[]>();
    const seen = new Set<string>();
    for (const page of data?.pages ?? []) {
      for (const placement of page.modulePlacements ?? []) {
        const key = `${placement.type ?? 'MODULE'}:${placement.position}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const list = map.get(placement.position);
        if (list) list.push(placement);
        else map.set(placement.position, [placement]);
      }
    }
    return map;
  }, [data]);

  const rewardsByPosition = useMemo(() => {
    const map = new Map<number, typeof activeCards>();
    for (const card of activeCards) {
      const list = map.get(card.position);
      if (list) list.push(card);
      else map.set(card.position, [card]);
    }
    return map;
  }, [activeCards]);

  useEffect(() => {
    if (!user?.id || !data || dataUpdatedAt <= (cachedFeed?.savedAt || 0)) return;
    writeCachedFeed(user.id, data, dataUpdatedAt);
  }, [cachedFeed?.savedAt, data, dataUpdatedAt, user?.id]);

  useEffect(() => {
    if (!cachedFeed || adItemOffsetRef.current > 0) return;
    adItemOffsetRef.current = cachedFeed.value.pages.reduce(
      (count, page) => count + page.posts.length,
      0
    );
  }, [cachedFeed]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<string | null>(null);
  const [highlightCommentId, setHighlightCommentId] = useState<string | undefined>(undefined);

  // Stories states
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<StoryGroup | null>(null);

  // Refs for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Initialize Socket.IO
  useEffect(() => {
    if (!user) return;

    // Define handlers
    const handlePostCreated = ({ post }: { post: Post }) => {
      queryClient.setQueryData<FeedCache>(queryKeys.feed(user.id), (old) => {
        if (!old?.pages?.length) return old;
        const hasPost = old.pages.some((page) =>
          page.posts.some((existingPost) => existingPost.id === post.id)
        );
        if (hasPost) return old;
        return {
          ...old,
          pages: [
            { ...old.pages[0], posts: [post, ...old.pages[0].posts] },
            ...old.pages.slice(1),
          ],
        };
      });
    };

    const handlePostLiked = ({
      postId,
      userId: likerUserId,
      liked,
      likesCount,
      reactionType,
      reactionSummary,
    }: FeedSocketReactionPayload) => {
      queryClient.setQueryData<FeedCache>(queryKeys.feed(user.id), (old) => {
        if (!old?.pages) return old;
        const isCurrentUser = likerUserId === user.id;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) =>
              post.id !== postId ? post : {
                ...post,
                likesCount,
                isLiked: isCurrentUser ? liked : post.isLiked,
                userReactionType: isCurrentUser ? reactionType : post.userReactionType,
                reactionSummary: reactionSummary || post.reactionSummary,
              }
            ),
          })),
        };
      });
    };

    const handlePostReacted = ({
      postId,
      userId: reactorUserId,
      liked,
      reactionType,
      likesCount,
      reactionSummary,
    }: FeedSocketReactionPayload) => {
      queryClient.setQueryData<FeedCache>(queryKeys.feed(user.id), (old) => {
        if (!old?.pages) return old;
        const isCurrentUser = reactorUserId === user.id;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) =>
              post.id !== postId ? post : {
                ...post,
                likesCount,
                isLiked: isCurrentUser ? liked : post.isLiked,
                userReactionType: isCurrentUser ? reactionType : post.userReactionType,
                reactionSummary: reactionSummary || post.reactionSummary,
              }
            ),
          })),
        };
      });
    };

    const handleCommentCreated = ({ postId, commentsCount }: { postId: string; commentsCount: number }) => {
      queryClient.setQueryData<FeedCache>(queryKeys.feed(user.id), (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) =>
              post.id === postId ? { ...post, commentsCount } : post
            ),
          })),
        };
      });
    };

    const handlePollUpdated = ({
      postId,
      pollOptions,
    }: {
      postId: string;
      pollOptions: PollOption[];
    }) => {
      queryClient.setQueryData<FeedCache>(queryKeys.feed(user.id), (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) =>
              post.id === postId ? { ...post, pollOptions } : post
            ),
          })),
        };
      });
    };

    const handlePostShared = ({ postId, sharesCount }: { postId: string; sharesCount: number }) => {
      queryClient.setQueryData<FeedCache>(queryKeys.feed(user.id), (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) =>
              post.id === postId ? { ...post, sharesCount } : post
            ),
          })),
        };
      });
    };

    // Initialize socket connection
    initializeSocket();

    joinFeedRoom();

    // Directly attach handlers to the socket
    const sock = getSocket();
    if (sock) {
      sock.on('post:created', handlePostCreated);
      sock.on('post:liked', handlePostLiked);
      sock.on('post:reacted', handlePostReacted);
      sock.on('comment:created', handleCommentCreated);
      sock.on('poll:updated', handlePollUpdated);
      sock.on('post:shared', handlePostShared);
    }

    return () => {
      // Clean up handlers on unmount
      const sock = getSocket();
      if (sock) {
        sock.off('post:created', handlePostCreated);
        sock.off('post:liked', handlePostLiked);
        sock.off('post:reacted', handlePostReacted);
        sock.off('comment:created', handleCommentCreated);
        sock.off('poll:updated', handlePollUpdated);
        sock.off('post:shared', handlePostShared);
      }
      leaveFeedRoom();
    };
  }, [user, queryClient]);

  // Handle opening a story group
  const handleOpenStory = (group: StoryGroup) => {
    setSelectedStoryGroup(group);
    setShowStoryViewer(true);
  };

  // Load more posts
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchNextPage();
  }, [loadingMore, hasMore, fetchNextPage]);

  // Infinite scroll observer
  useEffect(() => {
    if (loading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loading, hasMore, loadingMore, loadMore]);


  // Handle post created - add instantly (optimistic) or via WebSocket
  const updateFeedCache = useCallback(
    (updater: (pages: FeedResponse[]) => FeedResponse[]) => {
      queryClient.setQueryData<FeedCache>(queryKeys.feed(user?.id), (old) => {
        if (!old?.pages) return old;
        return { ...old, pages: updater(old.pages) };
      });
    },
    [queryClient, user?.id]
  );

  const handlePostCreated = (post?: Post) => {
    if (post) {
      updateFeedCache((pages) => {
        const hasPost = pages.some((page) =>
          page.posts.some((existingPost) => existingPost.id === post.id)
        );
        if (hasPost) return pages;
        return [
          { ...pages[0], posts: [post, ...pages[0].posts] },
          ...pages.slice(1),
        ];
      });
    }
  };

  const handlePostDeleted = (postId: string) => {
    updateFeedCache((pages) =>
      pages.map((page) => ({
        ...page,
        posts: page.posts.filter((post) => post.id !== postId),
      }))
    );
  };

  const handlePostEdited = (postId: string, updatedPost: Post) => {
    updateFeedCache((pages) =>
      pages.map((page) => ({
        ...page,
        posts: page.posts.map((post) =>
          post.id === postId ? { ...post, ...updatedPost } : post
        ),
      }))
    );
  };

  const handleLikeUpdate = (postId: string, liked: boolean, count: number) => {
    updateFeedCache((pages) =>
      pages.map((page) => ({
        ...page,
        posts: page.posts.map((post) =>
          post.id === postId ? { ...post, isLiked: liked, likesCount: count } : post
        ),
      }))
    );
  };

  const handlePollUpdate = (postId: string, options: PollOption[]) => {
    updateFeedCache((pages) =>
      pages.map((page) => ({
        ...page,
        posts: page.posts.map((post) =>
          post.id === postId ? { ...post, pollOptions: options } : post
        ),
      }))
    );
  };

  // Handle comment click
  const handleCommentClick = (postId: string) => {
    setSelectedPostForComments(postId);
    setHighlightCommentId(undefined);
    joinPostRoom(postId);
  };

  // Close comments
  const closeComments = () => {
    if (selectedPostForComments) {
      leavePostRoom(selectedPostForComments);
    }
    setSelectedPostForComments(null);
    setHighlightCommentId(undefined);
  };

  if (authLoading) {
    return (
      <div className="mx-auto max-w-6xl pb-24">
        <div className="space-y-4 px-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header — shares the shell's max width so the wordmark lines up with the nav rail */}
      <div className="sticky top-0 z-40 w-full border-b border-gray-200/70 bg-white/75 backdrop-blur-xl dark:border-neutral-800/80 dark:bg-neutral-950/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 xl:max-w-[1296px]">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt="Vormex"
                width={40}
                height={40}
                priority
                className="h-8 w-8 rounded-lg object-contain sm:h-10 sm:w-10 sm:rounded-xl"
              />
              <span className="text-base font-bold tracking-tight text-gray-950 dark:text-white sm:text-lg">
                Vormex
              </span>
            </div>
            {user && <div className="hidden min-[430px]:block"><SocialProofBar /></div>}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <PostingStatusChip />
            {user && <StreakCounter />}
          </div>
        </div>
      </div>

      {/*
        Three columns from `xl`: nav rail · feed · sidebar. Below that it falls
        back to feed + sidebar at `lg`, then a single column. The nav rail is
        `hidden xl:block`, so the element count always matches the active
        column count.
      */}
      <div className="mx-auto w-full max-w-6xl pb-20 sm:pb-24 xl:max-w-[1296px] xl:pb-10">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_312px] lg:gap-5 lg:px-4 xl:grid-cols-[228px_minmax(0,1fr)_312px] xl:gap-6">
          {/* ── Left: navigation rail (desktop only) ── */}
          <div className="hidden xl:block xl:pt-3">
            <FeedLeftNav />
          </div>

          {/* ── Center: composer, discovery, posts ── */}
          <div className="min-w-0">
            {user && (
              <>
                {/*
                  The composer leads. It used to sit below the story rail, three
                  onboarding banners and two people rails — roughly 700px down,
                  which put the app's primary action off-screen on load.
                */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="mt-2 px-3 sm:mt-4 sm:px-4 lg:px-0"
                >
                  <div className={PANEL_SURFACE}>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="w-full p-3 text-left transition-colors hover:bg-gray-50/90 sm:p-4 dark:hover:bg-neutral-800/60"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          imageSrc={user.profileImage}
                          name={user.name}
                          className="h-10 w-10 flex-shrink-0 bg-gray-200 text-base font-bold text-gray-500 sm:h-11 sm:w-11 dark:bg-neutral-700"
                          fallbackClassName="text-base font-bold"
                        />
                        <div className="min-w-0 flex-1 rounded-full border border-gray-300 bg-gray-50 px-4 py-2.5 dark:border-neutral-700 dark:bg-neutral-800/50">
                          <span className="block truncate text-sm text-gray-500 dark:text-neutral-400">
                            What&apos;s on your mind, {user.name?.split(' ')[0]}?
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center justify-around border-t border-gray-100 px-2 py-1.5 dark:border-neutral-800">
                      <ComposerAction
                        icon={ImageIcon}
                        label="Photo"
                        tone="text-blue-500"
                        onClick={() => setShowCreateModal(true)}
                      />
                      <ComposerAction
                        icon={Video}
                        label="Video"
                        tone="text-emerald-500"
                        onClick={() => setShowCreateModal(true)}
                      />
                      <ComposerAction
                        icon={FileText}
                        label="Article"
                        tone="text-orange-500"
                        onClick={() => setShowCreateModal(true)}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Stories */}
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: 0.04 }}
                  className="mt-2.5 sm:mt-3.5 sm:px-4 lg:px-0"
                >
                  <div className="overflow-hidden border-y border-gray-200/80 bg-white py-1 dark:border-neutral-800/80 dark:bg-neutral-900 sm:rounded-[18px] sm:border sm:shadow-[0_18px_45px_-40px_rgba(15,23,42,0.55)]">
                    <StoryCarousel
                      onOpenStory={handleOpenStory}
                      onCreateStory={() => setShowStoryCreator(true)}
                    />
                  </div>
                </motion.section>

                {/*
                  One compact onboarding row, then one people rail. Both handle
                  their own horizontal padding so their edges line up with the
                  post cards at every breakpoint.
                */}
                <SetupStrip />
                <PeopleRail />
              </>
            )}

            {/* Error State */}
            {error && (
              <div className="m-3 rounded-xl bg-red-50 p-4 text-center text-red-600 sm:m-4 lg:mx-0 dark:bg-red-900/20 dark:text-red-400">
                <p>{error}</p>
                <button
                  onClick={() => retryFeed()}
                  className="mt-2 text-sm font-semibold underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Connection Limit Notice */}
            {user && (
              <div className="mb-3 px-3 sm:px-4 lg:px-0">
                <ConnectionLimitBanner />
              </div>
            )}

            {/* Skeleton Loading */}
            {loading && (
              <div className="space-y-3 px-0 sm:space-y-4 sm:px-4 lg:px-0">
                {Array.from({ length: 4 }).map((_, i) => (
                  <PostCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && posts.length === 0 && !error && (
              <div className="px-4 py-12 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-neutral-800">
                  <Plus className="h-10 w-10 text-gray-400" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                  Your feed is empty
                </h2>
                <p className="mb-4 text-gray-500 dark:text-neutral-400">
                  Start by creating your first post or follow some people!
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="rounded-full bg-blue-500 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-600"
                >
                  Create Post
                </button>
              </div>
            )}

            {/* Posts with interleaved sponsored cards and server-ranked modules */}
            <div className="space-y-3 px-0 sm:space-y-4 sm:px-4 lg:px-0">
              <AnimatePresence>
                {posts.map((post, index) => {
                  const position = index + 1;
                  return (
                    <React.Fragment key={post.id}>
                      <PostCard
                        post={post}
                        onLikeUpdate={handleLikeUpdate}
                        onPollUpdate={handlePollUpdate}
                        onDelete={handlePostDeleted}
                        onEdit={handlePostEdited}
                        onCommentClick={() => handleCommentClick(post.id)}
                      />

                      {/* After 2nd post: Streak Widget + Weekly Goals */}
                      {index === 1 && (
                        <>
                          <StreakWidget />
                          <WeeklyGoalsWidget />
                        </>
                      )}

                      {modulesByPosition.get(position)?.map((placement) => (
                        <FeedModuleCard
                          key={`${placement.type ?? 'module'}-${placement.position}`}
                          placement={placement}
                        />
                      ))}

                      {adsByPosition.get(position)?.map((ad) => (
                        <ManagedAdCard
                          key={`${ad.campaignId}-${ad.slotKey}`}
                          ad={ad}
                          sessionId={adSessionId}
                        />
                      ))}

                      {rewardsByPosition.get(position)?.map((card) => (
                        <RewardCardRenderer
                          key={card.type}
                          card={card}
                          onDismiss={dismissCard}
                        />
                      ))}

                      {/* After 5th post: Nudge Card */}
                      {index === 4 && <NudgeCard />}
                    </React.Fragment>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Load More Trigger */}
            <div ref={loadMoreRef} className="flex h-20 items-center justify-center">
              {loadingMore && (
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              )}
              {!hasMore && posts.length > 0 && (
                <p className="text-sm text-gray-400 dark:text-neutral-500">
                  You&apos;ve reached the end
                </p>
              )}
            </div>

            {/* Mobile/tablet: the sidebar widgets move below the posts */}
            {user && (
              <div className="mb-4 space-y-3 px-3 sm:px-4 lg:hidden">
                <ProgressNudges />
                <SidebarAdCard sessionId={adSessionId} />
                <DailyMatchCard />
                <PeopleFromYourCollege />
                <Leaderboard />
              </div>
            )}
          </div>

          {/* ── Right: engagement widgets + sponsored rail (desktop only) ── */}
          {user && (
            <aside className="hidden lg:block">
              <div className="sticky top-[62px] space-y-4 pt-3">
                <ProgressNudges />
                <SidebarAdCard sessionId={adSessionId} />
                <DailyMatchCard />
                <PeopleFromYourCollege />
                <Leaderboard />
              </div>
            </aside>
          )}
        </div>

        {/* Floating Create Button (mobile) */}
        <button
          onClick={() => setShowCreateModal(true)}
          aria-label="Create post"
          className="fixed bottom-24 right-4 z-40 rounded-full bg-blue-600 p-3.5 text-white shadow-md transition-colors hover:bg-blue-700 lg:hidden"
        >
          <Plus className="h-5 w-5" />
        </button>

        {/* Create Post Modal */}
        {showCreateModal && (
          <CreatePostModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onPostCreated={handlePostCreated}
          />
        )}

        {/* Comments Panel */}
        {selectedPostForComments && (
          <Comments
            postId={selectedPostForComments}
            isOpen={!!selectedPostForComments}
            onClose={closeComments}
            highlightCommentId={highlightCommentId}
            onCommentCountChange={(count) => {
              if (!selectedPostForComments) return;
              updateFeedCache((pages) =>
                pages.map((page) => ({
                  ...page,
                  posts: page.posts.map((post) =>
                    post.id === selectedPostForComments
                      ? { ...post, commentsCount: count }
                      : post
                  ),
                }))
              );
            }}
          />
        )}

        {/* Story Creator Modal */}
        {showStoryCreator && (
          <StoryCreator
            isOpen={showStoryCreator}
            onClose={() => setShowStoryCreator(false)}
            onStoryCreated={() => {
              setShowStoryCreator(false);
              queryClient.invalidateQueries({ queryKey: queryKeys.stories(user?.id) });
            }}
          />
        )}

        {/* Story Viewer */}
        {showStoryViewer && selectedStoryGroup && (
          <StoryViewer
            storyGroups={[selectedStoryGroup]}
            initialGroupIndex={0}
            onClose={() => {
              setShowStoryViewer(false);
              setSelectedStoryGroup(null);
            }}
            onStoryEnd={() => {
              setShowStoryViewer(false);
              setSelectedStoryGroup(null);
            }}
          />
        )}

        {/* Reward/Milestone Popups */}
        {rewards.length > 0 && (
          <RewardPopup rewards={rewards} onDismiss={dismissReward} />
        )}

        {/* Push Notification Permission Prompt */}
        <NotificationPrompt userId={user?.id} />
      </div>
    </>
  );
}

function ComposerAction({
  icon: Icon,
  label,
  tone,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
    >
      <Icon className={`h-[18px] w-[18px] ${tone}`} />
      <span className="text-xs font-medium sm:text-[13px]">{label}</span>
    </button>
  );
}

export default Feed;
