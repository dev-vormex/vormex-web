'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { getConversations, Conversation, ConversationsResponse } from '@/lib/api/chat';
import { initializeSocket } from '@/lib/socket';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/queryKeys';

interface ChatListProps {
  selectedConversationId?: string;
  onSelectConversation?: (conversation: Conversation) => void;
  currentUserId?: string;
}

type ConversationPreviewMessage = NonNullable<Conversation['lastMessage']>;

export default function ChatList({ 
  selectedConversationId, 
  onSelectConversation,
  currentUserId 
}: ChatListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const cachedConversations = currentUserId
    ? queryClient.getQueryData<ConversationsResponse>(
        queryKeys.chatConversations(currentUserId)
      )
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

      queryClient.setQueryData(queryKeys.chatConversations(currentUserId), {
        conversations: nextConversations,
        hasMore: overrides?.hasMore ?? hasMoreRef.current,
        nextCursor: overrides?.nextCursor ?? nextCursorRef.current,
      });
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

    const cachedData = queryClient.getQueryData<ConversationsResponse>(
      queryKeys.chatConversations(currentUserId)
    );

    if (cachedData) {
      setConversations(cachedData.conversations);
      setHasMore(cachedData.hasMore);
      setNextCursor(cachedData.nextCursor);
      setLoading(false);
      setError(null);
    }

    initializeSocket();
    void fetchConversations(undefined, !!cachedData);
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
        
        // Refresh to get new conversation
        void fetchConversations(undefined, true);
        return previousConversations;
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

  if (loading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
        <button 
          onClick={() => fetchConversations()}
          className="block mx-auto mt-2 text-blue-500 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <div className="text-4xl mb-4">💬</div>
        <p>No conversations yet</p>
        <p className="text-sm mt-2">Start a chat with someone!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isSelected={selectedConversationId === conversation.id}
            currentUserId={currentUserId}
          onClick={() => handleSelectConversation(conversation)}
        />
      ))}
        
        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loading}
            className="w-full py-3 text-sm text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800"
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

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800',
        isSelected 
          ? 'bg-blue-50 dark:bg-blue-900/20' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        isUnread && !isSelected && 'bg-gray-50 dark:bg-gray-800/30'
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
          {other.profileImage ? (
            <img
              src={other.profileImage}
              alt={other.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            other.name.charAt(0).toUpperCase()
          )}
        </div>
        {/* Online indicator */}
        {other.isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={cn(
            'font-medium truncate',
            isUnread && 'text-gray-900 dark:text-white font-semibold'
          )}>
            {other.name}
          </span>
          {lastMessage && (
            <span className="text-xs text-gray-500 flex-shrink-0">
              {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: false })}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {lastMessage ? (
            <>
              {isSentByMe && (
                <span className="text-gray-400 text-sm">
                  {lastMessage.status === 'READ' ? '✓✓' : lastMessage.status === 'DELIVERED' ? '✓✓' : '✓'}
                </span>
              )}
              <p className={cn(
                'text-sm truncate',
                isUnread 
                  ? 'text-gray-900 dark:text-white font-medium' 
                  : 'text-gray-500 dark:text-gray-400'
              )}>
                {lastMessage.contentType === 'image' ? '📷 Photo' :
                 lastMessage.contentType === 'file' ? '📎 File' :
                 lastMessage.contentType === 'voice' ? '🎤 Voice message' :
                 lastMessage.contentType === 'post' ? '📄 Shared a post' :
                 lastMessage.contentType === 'reel' ? '🎬 Reel' :
                 lastMessage.contentType === 'video' ? '🎬 Video' :
                 lastMessage.content}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">No messages yet</p>
          )}
        </div>
      </div>

      {/* Unread badge */}
      {isUnread && (
        <div className="flex-shrink-0 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-xs text-white font-medium">
            {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
          </span>
        </div>
      )}
    </div>
  );
}
