'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { InfiniteData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
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
import { SocialProofBar, StreakCounter, ProgressNudges, DailyMatchCard, PeopleFromYourCollege, ConnectionLimitBanner, Leaderboard, TodayMatchesSection, RewardPopup } from '@/components/engagement';
import { RecommendedPeople } from '@/components/feed/RecommendedPeople';
import { DailyHooksWidget } from '@/components/feed/DailyHooksWidget';
import { StreakWidget, WeeklyGoalsWidget, NudgeCard } from '@/components/engagement/FeedWidgets';
import { useRewards } from '@/hooks/useRewards';
import { useVariableRewards } from '@/hooks/useVariableRewards';
import { RewardCardRenderer } from '@/components/rewards';
import { NotificationPrompt } from '@/components/notifications';
import { ManagedAdCard } from '@/components/feed/ManagedAdCard';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { FeedResponse, Post, PollOption } from '@/types/post';
import { FEED_STALE_TIME, queryKeys } from '@/lib/queryKeys';

type FeedCache = InfiniteData<FeedResponse, string | undefined>;

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

  // Use React Query for feed - cached when navigating back from profile (no reload)
  const {
    data,
    isLoading: loading,
    isFetchingNextPage: loadingMore,
    fetchNextPage,
    hasNextPage: hasMore,
    error: queryError,
    refetch: retryFeed,
  } = useInfiniteQuery({
    queryKey: queryKeys.feed(user?.id),
    queryFn: async ({ pageParam }) => {
      const adItemOffset = pageParam ? adItemOffsetRef.current : 0;
      const res = await getFeed(pageParam ?? undefined, 20, {
        adSessionId,
        adItemOffset,
      });
      adItemOffsetRef.current = adItemOffset + res.posts.length;
      return res;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: FEED_STALE_TIME,
    enabled: !authLoading && !!user,
  });

  const posts = data?.pages.flatMap((p) => p.posts) ?? [];
  const adPlacements = data?.pages.flatMap((p) => p.adPlacements || []) ?? [];
  const error = queryError ? (queryError as Error).message : null;
  
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
      <div className="max-w-6xl mx-auto pb-24">
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
      {/* Header */}
      <div className="sticky top-0 z-40 w-full border-b border-gray-200/70 bg-white/75 backdrop-blur-xl dark:border-neutral-800/80 dark:bg-neutral-950/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt="Vormex"
                width={40}
                height={40}
                priority
                className="h-10 w-10 rounded-xl object-contain"
              />
              <span className="text-lg font-bold tracking-tight text-gray-950 dark:text-white">
                Vormex
              </span>
            </div>
            {user && <SocialProofBar />}
          </div>
          {user && <StreakCounter />}
        </div>
      </div>

      <div className="mx-auto max-w-6xl pb-24">
      {user && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mx-4 mt-4 overflow-hidden rounded-[28px] border border-gray-200/80 bg-white/80 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur-md dark:border-neutral-800/70 dark:bg-neutral-900/80"
        >
          <StoryCarousel
            onOpenStory={handleOpenStory}
            onCreateStory={() => setShowStoryCreator(true)}
          />

          <div className="border-t border-gray-200/80 dark:border-neutral-800/80">
            <DailyHooksWidget />
            <RecommendedPeople />
            <TodayMatchesSection />
          </div>
        </motion.section>
      )}

      {/* Create Post Card */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.04 }}
          className="m-4"
        >
          <div className="overflow-hidden rounded-[28px] border border-gray-200/80 bg-white/85 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-900/85">
            {/* Main input area */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full p-5 text-left transition-colors hover:bg-gray-50/90 dark:hover:bg-neutral-800/60"
            >
              <div className="flex items-center gap-4">
                <UserAvatar
                  imageSrc={user.profileImage}
                  name={user.name}
                  className="h-14 w-14 flex-shrink-0 bg-gray-200 text-xl font-bold text-gray-500 dark:bg-neutral-700"
                  fallbackClassName="text-xl"
                />
                <div className="flex-1 py-3 px-5 rounded-full border border-gray-300 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/50">
                  <span className="text-gray-500 dark:text-neutral-400 text-base">What&apos;s on your mind, {user.name?.split(' ')[0]}?</span>
                </div>
              </div>
            </button>
            
            {/* Action buttons */}
            <div className="flex items-center justify-around border-t border-gray-100 dark:border-neutral-800 px-4 py-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-600 dark:text-neutral-400"
              >
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Photo</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-600 dark:text-neutral-400"
              >
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Video</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-600 dark:text-neutral-400"
              >
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium">Article</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Two-column layout: Feed + Sidebar */}
      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-6 lg:px-4">
        {/* ── Left Column: Posts ── */}
        <div className="min-w-0">
          {/* Error State */}
          {error && (
            <div className="m-4 lg:mx-0 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-center">
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
            <div className="px-4 lg:px-0 mb-3">
              <ConnectionLimitBanner />
            </div>
          )}

          {/* Skeleton Loading */}
          {loading && (
            <div className="space-y-4 px-4 lg:px-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && posts.length === 0 && !error && (
            <div className="text-center py-12 px-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">
                <Plus className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Your feed is empty
              </h2>
              <p className="text-gray-500 dark:text-neutral-400 mb-4">
                Start by creating your first post or follow some people!
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition-colors"
              >
                Create Post
              </button>
            </div>
          )}

          {/* Posts List with Interleaved Widgets */}
          <div className="space-y-4 px-4 lg:px-0">
            <AnimatePresence>
              {posts.map((post, index) => (
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
                  {adPlacements
                    .filter((ad) => ad.afterItemCount === index + 1)
                    .map((ad) => (
                      <ManagedAdCard
                        key={`${ad.campaignId}-${ad.slotKey}`}
                        ad={ad}
                        sessionId={adSessionId}
                      />
                    ))}
                  {/* Variable Reward Cards — injected at dynamic positions */}
                  {activeCards.filter(c => c.position === index + 1).map(card => (
                    <RewardCardRenderer
                      key={card.type}
                      card={card}
                      onDismiss={dismissCard}
                    />
                  ))}
                  {/* After 5th post: Nudge Card */}
                  {index === 4 && <NudgeCard />}
                </React.Fragment>
              ))}
            </AnimatePresence>
          </div>

          {/* Load More Trigger */}
          <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
            {loadingMore && (
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            )}
            {!hasMore && posts.length > 0 && (
              <p className="text-sm text-gray-400 dark:text-neutral-500">
                You&apos;ve reached the end
              </p>
            )}
          </div>

          {/* Mobile-only: Show widgets below posts on small screens */}
          {user && (
            <div className="px-4 space-y-3 mb-4 lg:hidden">
              <ProgressNudges />
              <DailyMatchCard />
              <PeopleFromYourCollege />
              <Leaderboard />
            </div>
          )}
        </div>

        {/* ── Right Sidebar: Engagement Widgets (desktop only) ── */}
        {user && (
          <aside className="hidden lg:block">
            <div className="sticky top-14 space-y-4 pt-3">
              <ProgressNudges />
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
        className="fixed bottom-24 right-4 lg:hidden p-3.5 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 transition-colors z-40"
      >
        <Plus className="w-5 h-5" />
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

export default Feed;
