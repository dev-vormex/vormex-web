'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, AtSign, UserPlus, ThumbsUp, PartyPopper, Lightbulb, HelpCircle } from 'lucide-react';
import { initializeSocket } from '@/lib/socket';
import { appendMessageToConversationCache } from '@/lib/chat/messageCache';
import { useAuth } from '@/lib/auth/useAuth';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { Message } from '@/lib/api/chat';
import type { ReactionType } from '@/types/post';

const TOAST_DURATION_MS = 5000;
const MAX_STACKED_TOASTS = 4;

interface Toast {
  id: string;
  type: 'reaction' | 'comment' | 'mention' | 'follow' | 'comment_like' | 'message';
  title: string;
  message: string;
  reactionType?: ReactionType;
  avatarUrl?: string;
  avatarFallback?: string;
  postId?: string;
  conversationId?: string;
  createdAt: Date;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>, options?: { dedupeKey?: string }) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useNotificationToasts() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useNotificationToasts must be used within NotificationToastProvider');
  }
  return context;
}

// Map reaction types to icons
const reactionIcons: Record<ReactionType, React.ElementType> = {
  LIKE: ThumbsUp,
  CELEBRATE: PartyPopper,
  SUPPORT: Heart,
  INSIGHTFUL: Lightbulb,
  CURIOUS: HelpCircle,
};

const reactionColors: Record<ReactionType, string> = {
  LIKE: 'text-blue-500',
  CELEBRATE: 'text-green-500',
  SUPPORT: 'text-purple-500',
  INSIGHTFUL: 'text-amber-500',
  CURIOUS: 'text-pink-500',
};

// Short preview for a DM toast; media messages get a labelled placeholder.
function getMessageToastPreview(message: Message): string {
  switch (message.contentType) {
    case 'image':
      return '📷 Photo';
    case 'reel':
    case 'video':
      return '🎥 Video';
    case 'voice':
    case 'audio':
      return '🎵 Voice message';
    case 'file':
    case 'document':
      return '📎 File';
  }

  const content = message.content?.trim() ?? '';
  return content.length > 60 ? `${content.slice(0, 60)}…` : content;
}

type ToastTimerEntry = {
  remainingMs: number;
  startedAt: number | null;
  timer: ReturnType<typeof setTimeout> | null;
};

export function NotificationToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Drives pause/resume of dismiss timers and the progress bar. Toasts that
  // arrive while the tab is hidden keep their full display time until the
  // user actually comes back, instead of expiring unseen.
  const [isPageVisible, setIsPageVisible] = useState(true);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const timersRef = useRef(new Map<string, ToastTimerEntry>());
  const seenDedupeKeysRef = useRef(new Set<string>());

  const dismissToast = useCallback((id: string) => {
    const entry = timersRef.current.get(id);
    if (entry?.timer) {
      clearTimeout(entry.timer);
    }
    timersRef.current.delete(id);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const startToastTimer = useCallback((id: string) => {
    const entry = timersRef.current.get(id);
    if (!entry || entry.timer) return;
    entry.startedAt = Date.now();
    entry.timer = setTimeout(() => dismissToast(id), entry.remainingMs);
  }, [dismissToast]);

  const pauseToastTimer = useCallback((id: string) => {
    const entry = timersRef.current.get(id);
    if (!entry || !entry.timer) return;
    clearTimeout(entry.timer);
    entry.timer = null;
    if (entry.startedAt !== null) {
      entry.remainingMs = Math.max(0, entry.remainingMs - (Date.now() - entry.startedAt));
      entry.startedAt = null;
    }
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id' | 'createdAt'>, options?: { dedupeKey?: string }) => {
    // The same event can reach the client more than once (outbox replay,
    // REST fallback resend, reconnect) — one toast per logical notification.
    const dedupeKey = options?.dedupeKey;
    if (dedupeKey) {
      if (seenDedupeKeysRef.current.has(dedupeKey)) return;
      seenDedupeKeysRef.current.add(dedupeKey);
      if (seenDedupeKeysRef.current.size > 200) {
        const first = seenDedupeKeysRef.current.values().next().value;
        if (first) seenDedupeKeysRef.current.delete(first);
      }
    }

    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    timersRef.current.set(id, { remainingMs: TOAST_DURATION_MS, startedAt: null, timer: null });

    setToasts(prev => {
      const next = [...prev, { ...toast, id, createdAt: new Date() }];
      // Keep the stack bounded — drop the oldest when too many pile up
      // (e.g. many messages arriving while the tab was hidden).
      while (next.length > MAX_STACKED_TOASTS) {
        const dropped = next.shift();
        if (dropped) {
          const entry = timersRef.current.get(dropped.id);
          if (entry?.timer) clearTimeout(entry.timer);
          timersRef.current.delete(dropped.id);
        }
      }
      return next;
    });

    // Only run the dismiss countdown while the user can actually see it.
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      startToastTimer(id);
    }
  }, [startToastTimer]);

  const removeToast = useCallback((id: string) => {
    dismissToast(id);
  }, [dismissToast]);

  // Pause all dismiss timers while the tab is hidden; resume with the
  // remaining time when the user returns.
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsPageVisible(visible);
      for (const id of timersRef.current.keys()) {
        if (visible) {
          startToastTimer(id);
        } else {
          pauseToastTimer(id);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [startToastTimer, pauseToastTimer]);

  // Listen for real-time notifications
  useEffect(() => {
    if (!user) return;

    const socket = initializeSocket({
      onNotificationReaction: (data: any) => {
        addToast({
          type: 'reaction',
          title: 'New Reaction',
          message: `Someone reacted to your post`,
          reactionType: data.reactionType,
          postId: data.postId,
        });
      },
      onNotificationLike: (data: any) => {
        addToast({
          type: 'reaction',
          title: 'New Like',
          message: `Someone liked your post`,
          reactionType: 'LIKE',
          postId: data.postId,
        });
      },
      onNotificationComment: (data: any) => {
        addToast({
          type: 'comment',
          title: 'New Comment',
          message: `Someone commented on your post`,
          postId: data.postId,
        });
      },
      onNotificationMention: (data: any) => {
        addToast({
          type: 'mention',
          title: 'New Mention',
          message: `You were mentioned in a comment`,
          postId: data.postId,
        });
      },
      onNotificationCommentLike: (data: any) => {
        addToast({
          type: 'comment_like',
          title: 'Comment Liked',
          message: `Someone liked your comment`,
          postId: data.postId,
        });
      },
      onChatNotification: (data) => {
        if (data.type !== 'new_message' || !data.message || !data.conversationId) return;

        // Keep the cached thread current even when no toast is shown, so
        // opening the conversation later shows this message immediately
        // instead of a stale snapshot.
        appendMessageToConversationCache(queryClient, user.id, data.conversationId, data.message);

        // Only toast messages sent to me, and not while already viewing that chat
        if (data.message.senderId === user.id) return;
        if (window.location.pathname === `/messages/${data.conversationId}`) return;

        addToast({
          type: 'message',
          title: data.sender?.name || 'New Message',
          message: getMessageToastPreview(data.message),
          avatarUrl: data.sender?.profileImage ?? undefined,
          avatarFallback: data.sender?.name,
          conversationId: data.conversationId,
        }, { dedupeKey: data.message.id ? `message:${data.message.id}` : undefined });
      },
    });

    return () => {
      // Cleanup will be handled by the socket singleton
    };
  }, [user, addToast, queryClient]);

  const getRemainingMs = useCallback((id: string) => {
    const entry = timersRef.current.get(id);
    if (!entry) return 0;
    if (entry.timer && entry.startedAt !== null) {
      return Math.max(0, entry.remainingMs - (Date.now() - entry.startedAt));
    }
    return entry.remainingMs;
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <NotificationToasts isPageVisible={isPageVisible} getRemainingMs={getRemainingMs} />
    </ToastContext.Provider>
  );
}

function NotificationToasts({
  isPageVisible,
  getRemainingMs,
}: {
  isPageVisible: boolean;
  getRemainingMs: (id: string) => number;
}) {
  const { toasts, removeToast } = useNotificationToasts();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            paused={!isPageVisible}
            remainingMs={getRemainingMs(toast.id)}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({
  toast,
  paused,
  remainingMs,
  onClose,
}: {
  toast: Toast;
  paused: boolean;
  remainingMs: number;
  onClose: () => void;
}) {
  const router = useRouter();

  const getIcon = () => {
    switch (toast.type) {
      case 'reaction':
        if (toast.reactionType) {
          const Icon = reactionIcons[toast.reactionType];
          return <Icon className={`w-5 h-5 ${reactionColors[toast.reactionType]}`} />;
        }
        return <ThumbsUp className="w-5 h-5 text-blue-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'mention':
        return <AtSign className="w-5 h-5 text-purple-500" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'comment_like':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'message':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Heart className="w-5 h-5 text-red-500" />;
    }
  };

  const getBgColor = () => {
    switch (toast.type) {
      case 'reaction':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'comment':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'mention':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
      case 'follow':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'comment_like':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'message':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700';
    }
  };

  const handleClick = () => {
    if (toast.type === 'message' && toast.conversationId) {
      router.push(`/messages/${toast.conversationId}`);
      onClose();
    }
  };

  const isClickable = toast.type === 'message' && Boolean(toast.conversationId);

  const remainingFraction = Math.max(0, Math.min(1, remainingMs / TOAST_DURATION_MS));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 400 }}
      onClick={isClickable ? handleClick : undefined}
      className={`relative flex items-start gap-3 p-4 rounded-xl border shadow-lg ${getBgColor()} ${isClickable ? 'cursor-pointer' : ''}`}
    >
      {/* Icon / sender avatar */}
      {toast.type === 'message' ? (
        <UserAvatar
          imageSrc={toast.avatarUrl}
          name={toast.avatarFallback}
          className="flex-shrink-0 h-9 w-9 bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
        />
      ) : (
        <div className="flex-shrink-0 p-2 rounded-full bg-white dark:bg-neutral-900">
          {getIcon()}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white text-sm">
          {toast.title}
        </p>
        <p className="text-sm text-gray-600 dark:text-neutral-400 truncate">
          {toast.message}
        </p>
      </div>

      {/* Close Button */}
      <button
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
      >
        <X className="w-4 h-4 text-gray-500 dark:text-neutral-400" />
      </button>

      {/* Progress bar mirrors the dismiss timer: frozen while the tab is
          hidden, resumes from the remaining fraction when it is visible. */}
      <motion.div
        initial={false}
        animate={paused ? { width: `${remainingFraction * 100}%` } : { width: '0%' }}
        transition={paused ? { duration: 0 } : { duration: remainingMs / 1000, ease: 'linear' }}
        className="absolute bottom-0 left-0 h-1 bg-blue-500 rounded-b-xl"
        style={{ width: `${remainingFraction * 100}%` }}
      />
    </motion.div>
  );
}
