'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  getConversations,
  type ChatUser,
  type Conversation,
  type ConversationsResponse,
  type Message,
} from '@/lib/api/chat';
import { initializeSocket } from '@/lib/socket';
import { format, isToday, isThisWeek, isThisYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { CHAT_STALE_TIME, queryKeys } from '@/lib/queryKeys';
import {
  readCachedConversations,
  writeCachedConversations,
} from '@/lib/chat/browserCache';
import {
  Check,
  CheckCheck,
  Image as ImageIcon,
  Paperclip,
  Mic,
  Film,
  FileText,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';

interface ChatListProps {
  selectedConversationId?: string;
  onSelectConversation?: (conversation: Conversation) => void;
  currentUserId?: string;
  searchQuery?: string;
}

type ConversationPreviewMessage = Pick<
  Message,
  'id' | 'conversationId' | 'senderId' | 'receiverId' | 'content' | 'contentType' | 'status' | 'createdAt' | 'updatedAt' | 'sender'
>;

function fallbackChatUser(userId: string): ChatUser {
  return {
    id: userId,
    username: '',
    name: '',
    profileImage: null,
    isOnline: false,
    lastActiveAt: null,
  };
}

function buildInstantConversationFromMessage(
  conversationId: string,
  message: ConversationPreviewMessage,
  currentUserId?: string,
  selectedConversationId?: string
): Conversation | null {
  if (!currentUserId) {
    return null;
  }

  const sender = message.sender || fallbackChatUser(message.senderId);
  const otherParticipant =
    message.senderId === currentUserId
      ? fallbackChatUser(message.receiverId)
      : sender;
  const participant1Id =
    message.senderId === currentUserId
      ? message.senderId
      : message.receiverId === currentUserId
        ? message.receiverId
        : currentUserId;
  const participant2Id = participant1Id === message.senderId ? message.receiverId : message.senderId;

  return {
    id: conversationId,
    participant1Id,
    participant2Id,
    participant1: participant1Id === sender.id ? sender : fallbackChatUser(participant1Id),
    participant2: participant2Id === sender.id ? sender : fallbackChatUser(participant2Id),
    otherParticipant,
    lastMessage: {
      id: message.id,
      content: message.content,
      contentType: message.contentType,
      senderId: message.senderId,
      status: message.status,
      createdAt: message.createdAt,
    },
    lastMessageAt: message.createdAt,
    unreadCount:
      message.senderId !== currentUserId && conversationId !== selectedConversationId ? 1 : 0,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

// Compact LinkedIn-style timestamp: 2:34 PM / Tue / Mar 4 / Mar 4, 2024
function formatConversationTime(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  if (isToday(date)) return format(date, 'h:mm a');
  if (isThisWeek(date, { weekStartsOn: 1 })) return format(date, 'EEE');
  if (isThisYear(date)) return format(date, 'MMM d');
  return format(date, 'MMM d, yyyy');
}

type PreviewInfo = {
  text: string;
  Icon?: React.ComponentType<{ className?: string }>;
};

// Human-readable preview for the last message; also handles structured
// payloads (e.g. shared posts) that were stored as JSON strings.
function getMessagePreview(lastMessage: NonNullable<Conversation['lastMessage']>): PreviewInfo {
  switch (lastMessage.contentType) {
    case 'image':
      return { text: 'Photo', Icon: ImageIcon };
    case 'file':
      return { text: 'Attachment', Icon: Paperclip };
    case 'voice':
      return { text: 'Voice message', Icon: Mic };
    case 'reel':
    case 'video':
      return { text: 'Video', Icon: Film };
    case 'post':
    case 'application/x-shared-post':
      return { text: 'Shared a post', Icon: FileText };
  }

  const content = lastMessage.content?.trim() ?? '';
  if (content.startsWith('{')) {
    try {
      const data = JSON.parse(content);
      if (data?.type === 'shared_post') return { text: 'Shared a post', Icon: FileText };
      if (data?.type === 'shared_reel' || data?.reelId) return { text: 'Video', Icon: Film };
    } catch {
      // Not JSON — fall through to raw content
    }
  }

  return { text: content };
}

export default function ChatList({
  selectedConversationId,
  onSelectConversation,
  currentUserId,
  searchQuery,
}: ChatListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const conversationsQueryKey = queryKeys.chatConversations(currentUserId);
  const cachedConversations = currentUserId
    ? queryClient.getQueryData<ConversationsResponse>(conversationsQueryKey) ??
      readCachedConversations(currentUserId)?.value
    : undefined;
  const [conversations, setConversations] = useState<Conversation[]>(
    () => cachedConversations?.conversations ?? []
  );
  const [loading, setLoading] = useState(() => !cachedConversations);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(() => cachedConversations?.hasMore ?? false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(
    () => cachedConversations?.nextCursor
  );
  const conversationCountRef = useRef(conversations.length);
  const hasMoreRef = useRef(hasMore);
  const nextCursorRef = useRef(nextCursor);

  useEffect(() => {
    conversationCountRef.current = conversations.length;
  }, [conversations.length]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  const writeConversationCache = useCallback(
    (
      nextConversations: Conversation[],
      overrides?: Pick<ConversationsResponse, 'hasMore' | 'nextCursor'>
    ) => {
      if (!currentUserId) return;

      const nextResponse = {
        conversations: nextConversations,
        hasMore: overrides?.hasMore ?? hasMoreRef.current,
        nextCursor: overrides?.nextCursor ?? nextCursorRef.current,
      };

      queryClient.setQueryData(queryKeys.chatConversations(currentUserId), nextResponse);
      writeCachedConversations(currentUserId, nextResponse);
    },
    [currentUserId, queryClient]
  );

  const setConversationState = useCallback(
    (
      updater:
        | Conversation[]
        | ((previousConversations: Conversation[]) => Conversation[]),
      overrides?: Pick<ConversationsResponse, 'hasMore' | 'nextCursor'>
    ) => {
      setConversations((previousConversations) => {
        const nextConversations =
          typeof updater === 'function'
            ? updater(previousConversations)
            : updater;

        writeConversationCache(nextConversations, overrides);
        return nextConversations;
      });
    },
    [writeConversationCache]
  );

  const fetchConversations = useCallback(async (cursor?: string, background = false) => {
    if (!currentUserId) return;

    try {
      setError(null);

      // Only show loading if we don't have any conversations yet
      if (!cursor && !background && conversationCountRef.current === 0) {
        setLoading(true);
      }

      const result = await getConversations(30, cursor);

      if (cursor) {
        setConversationState((previousConversations) => {
          const seen = new Set(previousConversations.map((conversation) => conversation.id));
          const appendedConversations = result.conversations.filter(
            (conversation) => !seen.has(conversation.id)
          );
          return [...previousConversations, ...appendedConversations];
        }, {
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
        });
      } else {
        setConversationState(result.conversations, {
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
        });
      }

      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, setConversationState]);

  useEffect(() => {
    if (!currentUserId) {
      setConversations([]);
      setHasMore(false);
      setNextCursor(undefined);
      setLoading(false);
      return;
    }

    const queryKey = queryKeys.chatConversations(currentUserId);
    let shouldFetch = true;
    let cachedData = queryClient.getQueryData<ConversationsResponse>(queryKey);

    if (cachedData) {
      const updatedAt = queryClient.getQueryState(queryKey)?.dataUpdatedAt ?? 0;
      shouldFetch = Date.now() - updatedAt > CHAT_STALE_TIME;
    } else {
      const browserCache = readCachedConversations(currentUserId);
      if (browserCache) {
        cachedData = browserCache.value;
        queryClient.setQueryData(queryKey, cachedData, {
          updatedAt: browserCache.savedAt,
        });
        shouldFetch = !browserCache.isFresh;
      }
    }

    if (cachedData) {
      setConversations(cachedData.conversations);
      setHasMore(cachedData.hasMore);
      setNextCursor(cachedData.nextCursor);
      setLoading(false);
      setError(null);
    }

    initializeSocket();
    if (shouldFetch) {
      void fetchConversations(undefined, !!cachedData);
    }
  }, [currentUserId, fetchConversations, queryClient]);

  // Listen for new messages to update conversation list
  useEffect(() => {
    const socket = initializeSocket();

    // Track recently processed message IDs to prevent duplicates
    const processedMessageIds = new Set<string>();

    const handleNewMessage = (data: {
      conversationId: string;
      message: ConversationPreviewMessage;
    }) => {
      // Deduplicate: skip if already processed
      if (processedMessageIds.has(data.message.id)) {
        return;
      }
      processedMessageIds.add(data.message.id);
      // Keep set bounded
      if (processedMessageIds.size > 50) {
        const first = processedMessageIds.values().next().value;
        if (first !== undefined) processedMessageIds.delete(first);
      }

      setConversationState((previousConversations) => {
        const existingIndex = previousConversations.findIndex(
          (conversation) => conversation.id === data.conversationId
        );
        
        if (existingIndex >= 0) {
          // Check if this is truly a new message (not already displayed)
          const existingConv = previousConversations[existingIndex];
          if (existingConv.lastMessage?.id === data.message.id) {
            return previousConversations; // Same message, skip update
          }

          // Update existing conversation and move to top
          const updated = [...previousConversations];
          const conv = { ...updated[existingIndex] };
          conv.lastMessage = {
            id: data.message.id,
            content: data.message.content,
            contentType: data.message.contentType,
            senderId: data.message.senderId,
            status: data.message.status,
            createdAt: data.message.createdAt,
          };
          conv.lastMessageAt = data.message.createdAt;
          
          // Increment unread if not the sender
          if (data.message.senderId !== currentUserId && data.conversationId !== selectedConversationId) {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
          }
          
          updated.splice(existingIndex, 1);
          return [conv, ...updated];
        }
        
        const instantConversation = buildInstantConversationFromMessage(
          data.conversationId,
          data.message,
          currentUserId,
          selectedConversationId
        );

        // Refresh in the background for complete participant metadata, but do not
        // make the user wait for REST before the new chat appears.
        void fetchConversations(undefined, true);
        return instantConversation
          ? [instantConversation, ...previousConversations]
          : previousConversations;
      });
    };

    // Handle chat:notification which has a slightly different structure
    const handleChatNotification = (data: {
      type: string;
      conversationId: string;
      message: ConversationPreviewMessage;
    }) => {
      if (data.type === 'new_message') {
        handleNewMessage({ conversationId: data.conversationId, message: data.message });
      }
    };

    const handleMessagesRead = (data: { conversationId: string; readBy?: string }) => {
      if (data.readBy && data.readBy !== currentUserId) {
        return;
      }

      setConversationState((previousConversations) =>
        previousConversations.map(c =>
          c.id === data.conversationId 
            ? { ...c, unreadCount: 0 } 
            : c
        )
      );
    };

    const handleConfirmedMessage = (event: Event) => {
      const detail = (event as CustomEvent<{
        conversationId: string;
        message: ConversationPreviewMessage;
      }>).detail;

      if (!detail?.conversationId || !detail?.message) {
        return;
      }

      handleNewMessage(detail);
    };

    socket.on('chat:new_message', handleNewMessage);
    socket.on('chat:notification', handleChatNotification);
    socket.on('chat:messages_read', handleMessagesRead);
    window.addEventListener('vormex:chat-message-confirmed', handleConfirmedMessage as EventListener);

    return () => {
      socket.off('chat:new_message', handleNewMessage);
      socket.off('chat:notification', handleChatNotification);
      socket.off('chat:messages_read', handleMessagesRead);
      window.removeEventListener('vormex:chat-message-confirmed', handleConfirmedMessage as EventListener);
    };
  }, [currentUserId, fetchConversations, selectedConversationId, setConversationState]);

  const handleSelectConversation = (conversation: Conversation) => {
    setConversationState((previousConversations) =>
      previousConversations.map((existingConversation) =>
        existingConversation.id === conversation.id
          ? { ...existingConversation, unreadCount: 0 }
          : existingConversation
      )
    );

    if (onSelectConversation) {
      onSelectConversation(conversation);
    } else {
      router.push(`/messages/${conversation.id}`);
    }
  };

  const loadMore = () => {
    if (hasMore && nextCursor) {
      void fetchConversations(nextCursor);
    }
  };

  const normalizedSearch = searchQuery?.trim().toLowerCase() ?? '';
  const visibleConversations = normalizedSearch
    ? conversations.filter((conversation) => {
        const other = conversation.otherParticipant;
        return (
          other?.name?.toLowerCase().includes(normalizedSearch) ||
          other?.username?.toLowerCase().includes(normalizedSearch)
        );
      })
    : conversations;

  if (loading && conversations.length === 0) {
    return (
      <div className="px-2 py-2 space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-neutral-800 shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-3.5 w-1/2 bg-gray-200 dark:bg-neutral-800 rounded" />
              <div className="h-3 w-3/4 bg-gray-200 dark:bg-neutral-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={() => fetchConversations()}
          className="mt-3 px-5 py-1.5 rounded-full border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">
          <MessageCircle className="w-7 h-7 text-gray-400 dark:text-neutral-500" />
        </div>
        <p className="font-semibold text-gray-900 dark:text-white">No conversations yet</p>
        <p className="text-sm mt-1 text-gray-500 dark:text-neutral-400">
          Connect with people to start messaging.
        </p>
        <Link
          href="/find-people"
          className="mt-4 inline-flex px-5 py-1.5 rounded-full border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
        >
          Find people
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-2 pb-24 md:pb-4">
        {visibleConversations.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-500 dark:text-neutral-400">
            No conversations match &ldquo;{searchQuery?.trim()}&rdquo;
          </p>
        ) : (
          visibleConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedConversationId === conversation.id}
              currentUserId={currentUserId}
              onClick={() => handleSelectConversation(conversation)}
            />
          ))
        )}

        {hasMore && !normalizedSearch && (
          <button
            onClick={loadMore}
            disabled={loading}
            className="w-full py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
          >
            {loading ? 'Loading...' : 'Load more'}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Conversation Item Component
// ============================================
interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  currentUserId?: string;
  onClick: () => void;
}

function ConversationItem({
  conversation,
  isSelected,
  currentUserId,
  onClick
}: ConversationItemProps) {
  const other = conversation.otherParticipant;
  const lastMessage = conversation.lastMessage;
  const isUnread = conversation.unreadCount > 0;
  const isSentByMe = lastMessage?.senderId === currentUserId;
  const preview = lastMessage ? getMessagePreview(lastMessage) : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-left transition-colors',
        isSelected
          ? 'bg-blue-50 dark:bg-blue-950/40'
          : 'hover:bg-gray-100 dark:hover:bg-neutral-800/70'
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <UserAvatar
          imageSrc={other.profileImage}
          name={other.name}
          className="h-12 w-12 bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
        />
        {/* Online indicator */}
        {other.isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-white dark:ring-neutral-900"></div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn(
            'text-sm truncate text-gray-900 dark:text-white',
            isUnread ? 'font-bold' : 'font-semibold'
          )}>
            {other.name}
          </span>
          {lastMessage && (
            <span className={cn(
              'text-xs flex-shrink-0',
              isUnread ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-400 dark:text-neutral-500'
            )}>
              {formatConversationTime(lastMessage.createdAt)}
            </span>
          )}
        </div>

        <div className="mt-0.5 flex items-center gap-1.5">
          {lastMessage && preview ? (
            <>
              {isSentByMe &&
                (lastMessage.status === 'READ' ? (
                  <CheckCheck className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                ) : lastMessage.status === 'DELIVERED' ? (
                  <CheckCheck className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                ) : (
                  <Check className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                ))}
              {preview.Icon && (
                <preview.Icon className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-neutral-500" />
              )}
              <p className={cn(
                'text-sm truncate',
                isUnread
                  ? 'text-gray-900 dark:text-white font-medium'
                  : 'text-gray-500 dark:text-neutral-400'
              )}>
                {isSentByMe && 'You: '}
                {preview.text}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400 dark:text-neutral-500 italic">No messages yet</p>
          )}
        </div>
      </div>

      {/* Unread badge */}
      {isUnread && (
        <div className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-[11px] text-white font-bold">
            {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
          </span>
        </div>
      )}
    </button>
  );
}
