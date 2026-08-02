'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  X,
  ChevronUp,
  ChevronDown,
  Eye,
  Heart,
  Send,
  MoreHorizontal,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Link2,
  Trash2,
  Archive,
  Share2,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { ProfileLink } from '@/components/profile/ProfileLink';
import { getSocket, SAFETY_STATE_CHANGED_EVENT } from '@/lib/socket';
import { useAuth } from '@/lib/auth/useAuth';
import { getStructuredApiError, isTerminalSafetyError } from '@/lib/api/errors';
import { clearCachedStories } from '@/lib/stories/browserCache';
import {
  viewStory,
  getStoryViewers,
  reactToStory,
  removeReaction,
  replyToStory,
  deleteStory,
  archiveStory,
  type StoryGroup,
  type StoryViewer as StoryViewerRecord,
} from '@/lib/api/stories';

interface StoryViewerProps {
  storyGroups: StoryGroup[];
  initialGroupIndex: number;
  initialStoryIndex?: number;
  onClose: () => void;
  onStoryEnd?: () => void;
}

const REACTIONS = ['🔥', '❤️', '👏', '😮', '😂', '💡'];

export function StoryViewer({
  storyGroups,
  initialGroupIndex,
  initialStoryIndex = 0,
  onClose,
  onStoryEnd,
}: StoryViewerProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showReactions, setShowReactions] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(() => (
    storyGroups[initialGroupIndex]?.stories[initialStoryIndex]?.userReaction ?? null
  ));
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerRecord[]>([]);
  const [viewersCursor, setViewersCursor] = useState<string | null>(null);
  const [viewersHasMore, setViewersHasMore] = useState(false);
  const [isViewersLoading, setIsViewersLoading] = useState(false);
  const [viewersError, setViewersError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressValueRef = useRef(0);
  const viewStartTimeRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const unavailableCloseTimerRef = useRef<number | null>(null);
  const wasPausedBeforeViewersRef = useRef(false);

  const currentGroup = storyGroups[currentGroupIndex];
  const [storiesWithViews, setStoriesWithViews] = useState<Record<string, number>>({});
  const currentStory = currentGroup?.stories[currentStoryIndex];
  const currentStoryId = currentStory?.id;
  const currentViewsCount = storiesWithViews[currentStory?.id ?? ''] ?? currentStory?.viewsCount ?? 0;
  const isOwnStory = currentGroup?.isOwnStory;
  const currentStoryOwnerId = currentGroup?.user.id;
  const currentUserId = user?.id;

  const handleStoryActionError = useCallback((error: unknown): boolean => {
    const structured = getStructuredApiError(error);
    const unavailable = isTerminalSafetyError(error) || structured.status === 403 || structured.status === 404;
    setActionError(unavailable ? 'This story is unavailable.' : structured.message);

    if (!unavailable) return false;

    if (currentUserId) {
      clearCachedStories(currentUserId);
      queryClient.setQueryData<StoryGroup[]>(['stories', currentUserId], (previous) =>
        previous?.filter((group) => group.user.id !== currentStoryOwnerId) ?? previous
      );
      void queryClient.invalidateQueries({ queryKey: ['stories', currentUserId] });
    }
    window.dispatchEvent(new CustomEvent(SAFETY_STATE_CHANGED_EVENT, {
      detail: { reason: 'interaction_policy_changed' },
    }));
    if (unavailableCloseTimerRef.current !== null) {
      window.clearTimeout(unavailableCloseTimerRef.current);
    }
    unavailableCloseTimerRef.current = window.setTimeout(onClose, 900);
    return true;
  }, [currentStoryOwnerId, currentUserId, onClose, queryClient]);

  useEffect(() => () => {
    if (unavailableCloseTimerRef.current !== null) {
      window.clearTimeout(unavailableCloseTimerRef.current);
    }
  }, []);

  const loadStoryViewers = useCallback(async (cursor?: string, append = false) => {
    if (!currentStoryId || !isOwnStory) return;

    setIsViewersLoading(true);
    setViewersError(null);
    try {
      const result = await getStoryViewers(currentStoryId, cursor, 30);
      setViewers((previous) => append ? [...previous, ...result.viewers] : result.viewers);
      setViewersCursor(result.nextCursor);
      setViewersHasMore(result.hasMore);
      setStoriesWithViews((previous) => ({
        ...previous,
        [currentStoryId]: result.totalCount,
      }));
    } catch (error) {
      if (!handleStoryActionError(error)) {
        setViewersError('Could not load viewers. Please try again.');
      }
    } finally {
      setIsViewersLoading(false);
    }
  }, [currentStoryId, handleStoryActionError, isOwnStory]);

  const handleOpenViewers = (event: React.MouseEvent) => {
    event.stopPropagation();
    wasPausedBeforeViewersRef.current = isPaused;
    setIsPaused(true);
    setShowViewers(true);
    void loadStoryViewers();
  };

  const handleCloseViewers = () => {
    setShowViewers(false);
    setIsPaused(wasPausedBeforeViewersRef.current);
  };

  // Live view count updates for own stories
  useEffect(() => {
    if (!isOwnStory || !currentStoryId) return;
    const socket = getSocket();
    if (!socket) return;

    const handleStoryViewed = ({ storyId, viewsCount }: { storyId: string; viewsCount: number }) => {
      if (storyId === currentStoryId) {
        setStoriesWithViews((prev) => ({ ...prev, [storyId]: viewsCount }));
        if (showViewers) {
          void loadStoryViewers();
        }
      }
    };

    socket.on('story:viewed', handleStoryViewed);
    return () => {
      socket.off('story:viewed', handleStoryViewed);
    };
  }, [isOwnStory, currentStoryId, showViewers, loadStoryViewers]);

  // Record view duration when leaving story
  const recordView = useCallback(async () => {
    if (currentStoryId && !isOwnStory) {
      const duration = Date.now() - viewStartTimeRef.current;
      
      // Use socket for real-time view tracking
      const socket = getSocket();
      if (socket) {
        socket.emit('story:view', { storyId: currentStoryId, duration });
      } else {
        // Fallback to HTTP
        try {
          await viewStory(currentStoryId, duration);
        } catch (error) {
          handleStoryActionError(error);
        }
      }
    }
  }, [currentStoryId, handleStoryActionError, isOwnStory]);

  const handleClose = useCallback(async () => {
    await recordView();
    onClose();
  }, [onClose, recordView]);

  const selectStory = useCallback((groupIndex: number, storyIndex: number) => {
    const nextStory = storyGroups[groupIndex]?.stories[storyIndex];
    progressValueRef.current = 0;
    setProgress(0);
    setSelectedReaction(nextStory?.userReaction ?? null);
    setCurrentGroupIndex(groupIndex);
    setCurrentStoryIndex(storyIndex);
  }, [storyGroups]);

  const goToNextStory = useCallback(async () => {
    await recordView();

    if (currentStoryIndex < currentGroup.stories.length - 1) {
      selectStory(currentGroupIndex, currentStoryIndex + 1);
    } else if (currentGroupIndex < storyGroups.length - 1) {
      selectStory(currentGroupIndex + 1, 0);
    } else {
      onClose();
      onStoryEnd?.();
    }
  }, [currentStoryIndex, currentGroupIndex, currentGroup, storyGroups.length, recordView, selectStory, onClose, onStoryEnd]);

  const goToPreviousStory = useCallback(async () => {
    await recordView();

    if (currentStoryIndex > 0) {
      selectStory(currentGroupIndex, currentStoryIndex - 1);
    } else if (currentGroupIndex > 0) {
      const previousGroupIndex = currentGroupIndex - 1;
      const previousStoryIndex = storyGroups[previousGroupIndex].stories.length - 1;
      selectStory(previousGroupIndex, previousStoryIndex);
    }
  }, [currentStoryIndex, currentGroupIndex, storyGroups, recordView, selectStory]);

  // Mark story as viewed on mount and story change.
  useEffect(() => {
    if (!currentStoryId || isOwnStory) return;

    viewStartTimeRef.current = Date.now();
    const socket = getSocket();
    if (socket) {
      socket.emit('story:view', { storyId: currentStoryId });
    }
  }, [currentStoryId, isOwnStory]);

  // Progress timer
  useEffect(() => {
    if (!currentStory || isPaused) return;

    const duration = currentStory.mediaType === 'VIDEO' 
      ? (currentStory.duration || 15000) 
      : (currentStory.duration || 5000);

    const interval = 50; // Update every 50ms for smooth progress
    const increment = (100 / duration) * interval;

    progressIntervalRef.current = setInterval(() => {
      const nextProgress = progressValueRef.current + increment;
      if (nextProgress >= 100) {
        progressValueRef.current = 0;
        void goToNextStory();
        return;
      }
      progressValueRef.current = nextProgress;
      setProgress(nextProgress);
    }, interval);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentStory, isPaused, goToNextStory]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showViewers) {
        if (e.key === 'Escape') {
          setShowViewers(false);
          setIsPaused(wasPausedBeforeViewersRef.current);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          void goToPreviousStory();
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          void goToNextStory();
          break;
        case ' ':
          e.preventDefault();
          setIsPaused((prev) => !prev);
          break;
        case 'Escape':
          void handleClose();
          break;
        case 'm':
          setIsMuted((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextStory, goToPreviousStory, handleClose, showViewers]);

  // Swipe handling for vertical navigation
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    const velocity = 500;

    if (info.offset.y < -threshold || info.velocity.y < -velocity) {
      goToNextStory();
    } else if (info.offset.y > threshold || info.velocity.y > velocity) {
      goToPreviousStory();
    }
  };

  const handleReaction = async (reaction: string) => {
    if (!currentStory) return;

    try {
      setActionError(null);
      if (selectedReaction === reaction) {
        await removeReaction(currentStory.id);
        setSelectedReaction(null);
      } else {
        await reactToStory(currentStory.id, reaction);
        setSelectedReaction(reaction);
      }
      
      // Also emit via socket for real-time updates
      const socket = getSocket();
      if (socket) {
        socket.emit('story:react', { storyId: currentStory.id, reaction });
      }
    } catch (error) {
      handleStoryActionError(error);
    }
    setShowReactions(false);
  };

  const handleSendReply = async () => {
    if (!currentStory || !replyText.trim()) return;

    try {
      setActionError(null);
      // The authenticated endpoint persists the reply and performs realtime
      // delivery to the story owner after the database write succeeds.
      await replyToStory(currentStory.id, replyText.trim());
      
      setReplyText('');
      setShowReplyInput(false);
      // Show success toast or animation
    } catch (error) {
      handleStoryActionError(error);
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory) return;

    try {
      await deleteStory(currentStory.id);
      goToNextStory();
    } catch (error) {
      console.error('Error deleting story:', error);
    }
    setShowMenu(false);
  };

  const handleArchiveStory = async () => {
    if (!currentStory) return;

    try {
      await archiveStory(currentStory.id);
      // Show success message
    } catch (error) {
      console.error('Error archiving story:', error);
    }
    setShowMenu(false);
  };

  if (!currentGroup || !currentStory) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black"
      >
        <AnimatePresence>
          {actionError && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              role="status"
              className="absolute left-1/2 top-16 z-[130] -translate-x-1/2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-xl"
            >
              {actionError}
            </motion.div>
          )}
        </AnimatePresence>
        {/* Main Content Container */}
        <motion.div
          ref={containerRef}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="relative w-full h-full flex items-center justify-center"
          onClick={(e) => {
            // Tap left/right to navigate
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              const clickX = e.clientX - rect.left;
              if (clickX < rect.width / 3) {
                goToPreviousStory();
              } else if (clickX > (rect.width * 2) / 3) {
                goToNextStory();
              } else {
                setIsPaused((prev) => !prev);
              }
            }
          }}
        >
          {/* Story Content */}
          <div className="relative w-full h-full max-w-lg mx-auto">
            {/* Background */}
            <div className="absolute inset-0">
              {currentStory.mediaType === 'VIDEO' ? (
                <video
                  ref={videoRef}
                  src={currentStory.mediaUrl}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                />
              ) : currentStory.mediaType === 'TEXT' ? (
                <div
                  className="w-full h-full flex items-center justify-center p-8"
                  style={{ backgroundColor: currentStory.backgroundColor || '#3B82F6' }}
                >
                  <p
                    className="text-white text-2xl font-bold text-center leading-relaxed"
                    style={{
                      fontSize: currentStory.textStyle?.fontSize || 24,
                      fontWeight: currentStory.textStyle?.fontWeight || 'bold',
                      color: currentStory.textStyle?.color || 'white',
                    }}
                  >
                    {currentStory.textContent}
                  </p>
                </div>
              ) : (
                <img
                  src={currentStory.mediaUrl}
                  alt="Story"
                  className="w-full h-full object-cover"
                />
              )}

              {/* Text Overlay */}
              {currentStory.mediaType !== 'TEXT' && currentStory.textContent && (
                <div
                  className="absolute p-4"
                  style={{
                    left: currentStory.textPosition?.x || '50%',
                    top: currentStory.textPosition?.y || '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <p
                    className="text-white text-lg font-semibold drop-shadow-lg"
                    style={currentStory.textStyle || {}}
                  >
                    {currentStory.textContent}
                  </p>
                </div>
              )}

              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
            </div>

            {/* Top Section - Progress & Header */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10">
              {/* Progress Bars */}
              <div className="flex gap-1 mb-4">
                {currentGroup.stories.map((_, idx) => (
                  <div
                    key={idx}
                    className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden"
                  >
                    <motion.div
                      className="h-full bg-white rounded-full"
                      style={{
                        width:
                          idx < currentStoryIndex
                            ? '100%'
                            : idx === currentStoryIndex
                            ? `${progress}%`
                            : '0%',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* User Avatar with gradient ring */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white">
                      {currentGroup.user.profileImage ? (
                        <Image
                          src={currentGroup.user.profileImage}
                          alt={currentGroup.user.name}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-white font-bold">
                            {currentGroup.user.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-white font-semibold text-sm">
                      {currentGroup.user.name}
                    </p>
                    <p className="text-white/60 text-xs">
                      {formatTimeAgo(new Date(currentStory.createdAt))}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Pause/Play */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPaused((prev) => !prev);
                    }}
                    className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
                  >
                    {isPaused ? (
                      <Play className="w-4 h-4 text-white" fill="white" />
                    ) : (
                      <Pause className="w-4 h-4 text-white" fill="white" />
                    )}
                  </button>

                  {/* Mute (for video) */}
                  {currentStory.mediaType === 'VIDEO' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted((prev) => !prev);
                      }}
                      className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 text-white" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                  )}

                  {/* More Options */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(true);
                    }}
                    className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
                  >
                    <MoreHorizontal className="w-4 h-4 text-white" />
                  </button>

                  {/* Close */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose();
                    }}
                    className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Indicators */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <ChevronUp className="w-6 h-6 text-white/40 animate-pulse" />
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <ChevronDown className="w-6 h-6 text-white/40 animate-pulse" />
            </div>

            {/* Link Preview */}
            {currentStory.linkUrl && (
              <div className="absolute bottom-32 left-4 right-4 z-10 space-y-2">
                {currentStory.linkUrl && (
                  <a
                    href={currentStory.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-md"
                  >
                    <Link2 className="w-4 h-4 text-white" />
                    <span className="truncate text-sm text-white">
                      {currentStory.linkTitle || currentStory.linkUrl}
                    </span>
                  </a>
                )}
              </div>
            )}

            {/* Bottom Section - Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
              {/* View Count (for own stories) - updates live when others view */}
              {isOwnStory && (
                <div className="flex items-center gap-4 mb-4 text-white/80">
                  <button
                    type="button"
                    onClick={handleOpenViewers}
                    className="flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1.5 transition-colors hover:bg-black/40"
                    aria-label={`See ${currentViewsCount} story viewers`}
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">{currentViewsCount} views</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    <span className="text-sm">{currentStory.reactionsCount} reactions</span>
                  </div>
                </div>
              )}

              {/* Reply Input or Actions */}
              {!isOwnStory && (
                <div className="flex items-center gap-2">
                  {showReplyInput ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Send a message..."
                        className="flex-1 bg-white/10 backdrop-blur-md text-white placeholder-white/50 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') handleSendReply();
                          if (e.key === 'Escape') setShowReplyInput(false);
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendReply();
                        }}
                        className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center"
                      >
                        <Send className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowReplyInput(true);
                          setIsPaused(true);
                        }}
                        className="flex-1 bg-white/10 backdrop-blur-md text-white/70 rounded-full px-4 py-2 text-sm text-left"
                      >
                        Reply to {currentGroup.user.name.split(' ')[0]}...
                      </button>

                      {/* Reaction Button */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowReactions(!showReactions);
                            setIsPaused(true);
                          }}
                          className={`w-10 h-10 rounded-full ${
                            selectedReaction
                              ? 'bg-pink-500/30'
                              : 'bg-white/10'
                          } backdrop-blur-md flex items-center justify-center`}
                        >
                          {selectedReaction ? (
                            <span className="text-xl">{selectedReaction}</span>
                          ) : (
                            <Heart className="w-5 h-5 text-white" />
                          )}
                        </button>

                        {/* Reaction Picker */}
                        <AnimatePresence>
                          {showReactions && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.8, y: 10 }}
                              className="absolute bottom-12 right-0 bg-white/10 backdrop-blur-xl rounded-2xl p-2 flex gap-1"
                            >
                              {REACTIONS.map((reaction) => (
                                <motion.button
                                  key={reaction}
                                  whileHover={{ scale: 1.3 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReaction(reaction);
                                  }}
                                  className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl ${
                                    selectedReaction === reaction
                                      ? 'bg-white/20'
                                      : ''
                                  }`}
                                >
                                  {reaction}
                                </motion.button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Share Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle share
                        }}
                        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"
                      >
                        <Share2 className="w-5 h-5 text-white" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Private viewer list, available only to the story owner */}
        <AnimatePresence>
          {showViewers && isOwnStory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-end justify-center bg-black/55"
              onClick={(event) => {
                event.stopPropagation();
                handleCloseViewers();
              }}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="flex max-h-[70dvh] w-full max-w-lg flex-col rounded-t-3xl border-t border-white/10 bg-neutral-950 text-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="px-4 pb-3 pt-2">
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold">Story viewers</h2>
                      <p className="text-xs text-white/55">
                        {currentViewsCount} {currentViewsCount === 1 ? 'person' : 'people'} viewed this story
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCloseViewers}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10"
                      aria-label="Close story viewers"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="min-h-28 flex-1 overflow-y-auto border-t border-white/10 px-3 py-2">
                  {isViewersLoading && viewers.length === 0 ? (
                    <div className="flex h-28 items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-white/65" />
                    </div>
                  ) : viewersError && viewers.length === 0 ? (
                    <div className="flex h-32 flex-col items-center justify-center gap-3 text-center">
                      <p className="text-sm text-white/65">{viewersError}</p>
                      <button
                        type="button"
                        onClick={() => void loadStoryViewers()}
                        className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black"
                      >
                        Try again
                      </button>
                    </div>
                  ) : viewers.length === 0 ? (
                    <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-white/55">
                      <Eye className="h-6 w-6" />
                      <p className="text-sm">No viewers yet</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {viewers.map((viewer) => viewer.user && (
                        <ProfileLink
                          key={viewer.id}
                          profileId={viewer.user.id}
                          className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-white/5"
                        >
                          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-white/10">
                            {viewer.user.profileImage ? (
                              <Image
                                src={viewer.user.profileImage}
                                alt={viewer.user.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold">
                                {viewer.user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{viewer.user.name}</p>
                            <p className="truncate text-xs text-white/55">@{viewer.user.username}</p>
                          </div>
                          <span className="flex-shrink-0 text-[11px] text-white/45">
                            {formatTimeAgo(new Date(viewer.viewedAt))}
                          </span>
                        </ProfileLink>
                      ))}

                      {viewersHasMore && viewersCursor && (
                        <button
                          type="button"
                          disabled={isViewersLoading}
                          onClick={() => void loadStoryViewers(viewersCursor, true)}
                          className="mx-auto mt-2 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium disabled:opacity-60"
                        >
                          {isViewersLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Load more
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="h-[env(safe-area-inset-bottom)]" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Menu Modal */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-black/50 flex items-end justify-center"
              onClick={() => setShowMenu(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="w-full max-w-lg bg-neutral-900 rounded-t-3xl p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-1 bg-neutral-700 rounded-full mx-auto mb-4" />

                {isOwnStory && (
                  <>
                    <button
                      onClick={handleDeleteStory}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-neutral-800 transition-colors text-red-500"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span>Delete Story</span>
                    </button>
                    <button
                      onClick={handleArchiveStory}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-neutral-800 transition-colors text-white"
                    >
                      <Archive className="w-5 h-5" />
                      <span>Save to Archive</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full mt-2 py-3 bg-neutral-800 rounded-xl text-white font-medium"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return '1d ago';
}
