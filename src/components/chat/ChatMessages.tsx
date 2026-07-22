'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Message,
  MessagesResponse,
  type ChatSyncResponse,
  getMessages,
  markAsRead as markConversationAsRead,
} from '@/lib/api/chat';
import { 
  initializeSocket,
  joinChatRoom, 
  leaveChatRoom, 
  markChatAsRead,
  deleteChatMessage,
  editChatMessage,
  reactToChatMessage
} from '@/lib/socket';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import MessageMenu, { MessageQuickActions } from './MessageMenu';
import { WALLPAPER_OPTIONS } from './ChatSettingsPanel';
import type { UploadingMessage, OptimisticMessage } from './ChatInput';
import { DEFAULT_CHAT_REACTIONS } from '@/lib/chat/customization';
import { queryKeys } from '@/lib/queryKeys';
import {
  readCachedMessages,
  writeCachedMessages,
} from '@/lib/chat/browserCache';
import { mergeMessages, normalizeMessage } from '@/lib/chat/messageCache';
import { CHAT_SYNC_EVENT } from './ChatOutboxCoordinator';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';

const INITIAL_FIRST_ITEM_INDEX = 100_000;

type AutoScrollMode = 'instant' | 'smooth' | null;

type VirtualMessageItem =
  | { kind: 'date'; dateKey: string }
  | { kind: 'message'; message: Message; showAvatar: boolean }
  | { kind: 'optimistic'; message: OptimisticMessage }
  | { kind: 'uploading'; message: UploadingMessage }
  | { kind: 'typing' };

function confirmedVirtualRowCount(messages: Message[]): number {
  let dateRows = 0;
  let previousDate = '';
  messages.forEach((message) => {
    const dateKey = format(new Date(message.createdAt), 'yyyy-MM-dd');
    if (dateKey !== previousDate) {
      previousDate = dateKey;
      dateRows += 1;
    }
  });
  return messages.length + dateRows;
}

interface ChatMessagesProps {
  conversationId: string;
  currentUserId: string;
  otherUser: {
    id: string;
    name: string;
    username: string;
    profileImage?: string | null;
    isOnline?: boolean;
  };
  wallpaper?: string;
  availableReactions?: string[];
  animatedBubbles?: boolean;
  onReply?: (message: { id: string; content: string; senderName: string }) => void;
  uploadingMessages?: UploadingMessage[];
  optimisticMessages?: OptimisticMessage[];
  confirmedMessages?: Message[];
  onLastMessageUpdate?: (message: string) => void;
  onRetryMessage?: (clientMessageId: string) => void;
}

export default function ChatMessages({
  conversationId,
  currentUserId,
  otherUser,
  wallpaper = 'default',
  availableReactions = DEFAULT_CHAT_REACTIONS,
  animatedBubbles = false,
  onReply,
  uploadingMessages = [],
  optimisticMessages = [],
  confirmedMessages = [],
  onLastMessageUpdate,
  onRetryMessage,
}: ChatMessagesProps) {
  const queryClient = useQueryClient();
  const messagesQueryKey = useMemo(
    () => queryKeys.chatMessages(currentUserId, conversationId),
    [conversationId, currentUserId]
  );
  const cachedMessagesResponse = queryClient.getQueryData<MessagesResponse>(
    messagesQueryKey
  ) ?? readCachedMessages(currentUserId, conversationId)?.value;
  const [messages, setMessages] = useState<Message[]>(
    () => cachedMessagesResponse?.messages.map(normalizeMessage) ?? []
  );
  const [loading, setLoading] = useState(() => !cachedMessagesResponse);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(() => cachedMessagesResponse?.hasMore ?? false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(
    () => cachedMessagesResponse?.nextCursor
  );
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewingVideo, setViewingVideo] = useState<string | null>(null);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const virtualItemIndexByMessageIdRef = useRef<Map<string, number>>(new Map());
  const [autoScrollMode, setAutoScrollMode] = useState<AutoScrollMode>('instant');
  const [firstItemIndex, setFirstItemIndex] = useState(INITIAL_FIRST_ITEM_INDEX);
  const firstItemIndexRef = useRef(INITIAL_FIRST_ITEM_INDEX);
  const autoScrollEnabledRef = useRef(true);
  const activeFetchKeyRef = useRef<string | null>(null);
  const optimisticCountRef = useRef(optimisticMessages.length);
  const uploadingCountRef = useRef(uploadingMessages.length);
  const hasHydratedMessageCacheRef = useRef(Boolean(cachedMessagesResponse));
  const messageCountRef = useRef(messages.length);
  const hasMoreRef = useRef(hasMore);
  const nextCursorRef = useRef(nextCursor);
  const processedIncomingMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    messageCountRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const nextResponse = {
      messages,
      hasMore,
      nextCursor,
    };

    queryClient.setQueryData<MessagesResponse>(messagesQueryKey, nextResponse);
    writeCachedMessages(currentUserId, conversationId, nextResponse);
  }, [conversationId, currentUserId, hasMore, loading, messages, messagesQueryKey, nextCursor, queryClient]);

  // Scroll to a specific message and highlight it
  const scrollToMessage = useCallback((messageId: string) => {
    const messageElement = messageRefs.current.get(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      const itemIndex = virtualItemIndexByMessageIdRef.current.get(messageId);
      if (itemIndex !== undefined) {
        virtuosoRef.current?.scrollToIndex({
          index: firstItemIndexRef.current + itemIndex,
          align: 'center',
          behavior: 'smooth',
        });
      }
    }
    setHighlightedMessageId(messageId);
    setTimeout(() => setHighlightedMessageId(null), 1500);
  }, []);

  // Register message ref
  const registerMessageRef = useCallback((messageId: string, element: HTMLDivElement | null) => {
    if (element) {
      messageRefs.current.set(messageId, element);
    } else {
      messageRefs.current.delete(messageId);
    }
  }, []);

  const syncReadState = useCallback(async () => {
    try {
      await markConversationAsRead(conversationId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.chatUnreadCount(currentUserId) });
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'response' in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;
      console.warn(
        status
          ? `Read receipt REST sync failed with ${status}; falling back to socket sync.`
          : 'Read receipt REST sync failed; falling back to socket sync.'
      );
      markChatAsRead(conversationId);
    }
  }, [conversationId, currentUserId, queryClient]);

  const fetchMessages = useCallback(async (cursor?: string) => {
    const fetchKey = cursor ?? '__initial__';
    if (activeFetchKeyRef.current === fetchKey) {
      return;
    }

    try {
      activeFetchKeyRef.current = fetchKey;

      if (cursor) {
        setLoadingMore(true);
      } else if (!hasHydratedMessageCacheRef.current || messageCountRef.current === 0) {
        setLoading(true);
      }

      const result = await getMessages(conversationId, 50, cursor);

      const normalizedMessages = result.messages.map(normalizeMessage);

      if (cursor) {
        setMessages((previousMessages) => {
          const mergedMessages = mergeMessages(previousMessages, normalizedMessages);
          const prependedRows = Math.max(
            0,
            confirmedVirtualRowCount(mergedMessages) - confirmedVirtualRowCount(previousMessages)
          );
          if (prependedRows > 0) {
            firstItemIndexRef.current -= prependedRows;
            setFirstItemIndex(firstItemIndexRef.current);
          }
          return mergedMessages;
        });
      } else {
        setMessages((previousMessages) => mergeMessages(previousMessages, normalizedMessages));
        hasHydratedMessageCacheRef.current = true;
        // Snap to the newest message unless the user already scrolled up to
        // read history while this fetch was in flight.
        if (autoScrollEnabledRef.current) {
          setAutoScrollMode('instant');
        }

        // Find the last message from the other user for AI assistant
        if (onLastMessageUpdate) {
          const lastFromOther = [...result.messages]
            .reverse()
            .find(m => m.senderId !== currentUserId && m.content);
          if (lastFromOther) {
            onLastMessageUpdate(lastFromOther.content);
          }
        }
      }

      // An initial refresh contains only the newest page. If the browser cache
      // already holds older pages, retain its oldest cursor so upward paging
      // continues behind those cached rows instead of skipping history.
      const preserveCachedHistoryCursor =
        !cursor &&
        messageCountRef.current > normalizedMessages.length &&
        Boolean(nextCursorRef.current);
      setHasMore(preserveCachedHistoryCursor ? hasMoreRef.current : result.hasMore);
      setNextCursor(preserveCachedHistoryCursor ? nextCursorRef.current : result.nextCursor);
    } catch (err: unknown) {
      console.error('Failed to fetch messages:', err);
    } finally {
      activeFetchKeyRef.current = null;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [conversationId, currentUserId, onLastMessageUpdate]);

  // Initial load and join room
  useEffect(() => {
    if (!queryClient.getQueryData<MessagesResponse>(messagesQueryKey)) {
      const browserCache = readCachedMessages(currentUserId, conversationId);
      if (browserCache) {
        const normalizedMessages = browserCache.value.messages.map(normalizeMessage);

        queryClient.setQueryData(messagesQueryKey, browserCache.value, {
          updatedAt: browserCache.savedAt,
        });
        setMessages(normalizedMessages);
        setHasMore(browserCache.value.hasMore);
        setNextCursor(browserCache.value.nextCursor);
        setLoading(false);
        hasHydratedMessageCacheRef.current = true;
      }
    }

    // Always revalidate against the server. A cached thread can be missing
    // messages that arrived while this conversation was closed (the socket
    // may have been down, or the events consumed elsewhere), so "fresh by
    // timestamp" does not mean "complete". Cached messages still paint
    // instantly; this fetch merges anything newer without a spinner.
    fetchMessages();

    joinChatRoom(conversationId);
    void syncReadState();

    return () => {
      leaveChatRoom(conversationId);
    };
  }, [conversationId, currentUserId, fetchMessages, messagesQueryKey, queryClient, syncReadState]);

  // Socket event listeners
  useEffect(() => {
    const socket = initializeSocket();

    const appendMessage = (incomingMessage: Message) => {
      autoScrollEnabledRef.current = true;
      setMessages((previousMessages) => mergeMessages(previousMessages, [incomingMessage]));
      setAutoScrollMode('smooth');
    };

    const handleNewMessage = (data: { conversationId: string; message: Message }) => {
      if (data.conversationId === conversationId) {
        if (data.message.id) {
          if (processedIncomingMessageIdsRef.current.has(data.message.id)) {
            return;
          }
          processedIncomingMessageIdsRef.current.add(data.message.id);
          if (processedIncomingMessageIdsRef.current.size > 100) {
            const first = processedIncomingMessageIdsRef.current.values().next().value;
            if (first) processedIncomingMessageIdsRef.current.delete(first);
          }
        }

        appendMessage(data.message);

        // Mark as read if from other user
        if (data.message.senderId !== currentUserId) {
          void syncReadState();
          // Update last received message for AI assistant
          if (data.message.content && onLastMessageUpdate) {
            onLastMessageUpdate(data.message.content);
          }
        }
      }
    };

    let typingExpiryTimer: ReturnType<typeof setTimeout> | null = null;

    const handleTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        if (typingExpiryTimer) {
          clearTimeout(typingExpiryTimer);
          typingExpiryTimer = null;
        }
        setTypingUser(data.isTyping ? data.userId : null);
        if (data.isTyping) {
          // The sender heartbeats "typing" every ~2s while active; if the
          // heartbeats stop (missed stop event, disconnect) the indicator
          // must expire on its own instead of sticking forever.
          typingExpiryTimer = setTimeout(() => setTypingUser(null), 4500);
        }
      }
    };

    const handleMessagesRead = (data: { conversationId: string; readBy: string; readAt: Date }) => {
      if (data.conversationId === conversationId && data.readBy !== currentUserId) {
        setMessages(prev => 
          prev.map(m => 
            m.senderId === currentUserId && m.status !== 'READ'
              ? { ...m, status: 'READ', readAt: new Date(data.readAt).toISOString() }
              : m
          )
        );
      }
    };

    const handleMessagesDelivered = (data: { conversationId: string; deliveredAt: Date }) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => 
          prev.map(m => 
            m.senderId === currentUserId && m.status === 'SENT'
              ? { ...m, status: 'DELIVERED', deliveredAt: new Date(data.deliveredAt).toISOString() }
              : m
          )
        );
      }
    };

    const handleError = (data: { message: string }) => {
      console.error('Chat socket error:', data.message);
    };

    const handleMessageDeleted = (data: { messageId: string; conversationId: string; forEveryone: boolean }) => {
      if (data.conversationId === conversationId) {
        if (data.forEveryone) {
          setMessages(prev => 
            prev.map(m => 
              m.id === data.messageId 
                ? { ...m, isDeleted: true, content: 'This message was deleted' } 
                : m
            )
          );
        } else {
          setMessages(prev => prev.filter(m => m.id !== data.messageId));
        }
      }
    };

    const handleMessageEdited = (data: { messageId: string; conversationId: string; content: string; editedAt: Date }) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => 
          prev.map(m => 
            m.id === data.messageId
              ? { ...m, content: data.content, updatedAt: String(data.editedAt), editedAt: String(data.editedAt), isEdited: true }
              : m
          )
        );
      }
    };

    const handleReaction = (data: { messageId: string; conversationId: string; userId: string; emoji: string; action: string }) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => 
          prev.map(m => {
            if (m.id !== data.messageId) return m;
            
            let reactions = [...(m.reactions || [])];
            
            if (data.action === 'removed') {
              reactions = reactions.filter(r => !(r.userId === data.userId));
            } else if (data.action === 'added') {
              reactions.push({
                id: `temp-${Date.now()}`,
                userId: data.userId,
                emoji: data.emoji,
                user: { id: data.userId, username: '', name: '' }
              });
            } else if (data.action === 'updated') {
              const index = reactions.findIndex(r => r.userId === data.userId);
              if (index >= 0) {
                reactions[index] = { ...reactions[index], emoji: data.emoji };
              }
            }
            
            return { ...m, reactions };
          })
        );
      }
    };

    // Handle chat:notification (sent to user's personal room as fallback)
    const handleChatNotification = (data: { type: string; conversationId: string; message: Message }) => {
      if (data.type === 'new_message' && data.conversationId === conversationId) {
        if (data.message.id) {
          if (processedIncomingMessageIdsRef.current.has(data.message.id)) {
            return;
          }
          processedIncomingMessageIdsRef.current.add(data.message.id);
          if (processedIncomingMessageIdsRef.current.size > 100) {
            const first = processedIncomingMessageIdsRef.current.values().next().value;
            if (first) processedIncomingMessageIdsRef.current.delete(first);
          }
        }

        appendMessage(data.message);

        // Mark as read if from other user
        if (data.message.senderId !== currentUserId) {
          void syncReadState();
          if (data.message.content && onLastMessageUpdate) {
            onLastMessageUpdate(data.message.content);
          }
        }
      }
    };

    socket.on('chat:new_message', handleNewMessage);
    socket.on('chat:notification', handleChatNotification);
    socket.on('chat:user_typing', handleTyping);
    socket.on('chat:messages_read', handleMessagesRead);
    socket.on('chat:messages_delivered', handleMessagesDelivered);
    socket.on('chat:message_deleted', handleMessageDeleted);
    socket.on('chat:message_edited', handleMessageEdited);
    socket.on('chat:message_reaction', handleReaction);
    socket.on('error', handleError);

    return () => {
      if (typingExpiryTimer) {
        clearTimeout(typingExpiryTimer);
      }
      socket.off('chat:new_message', handleNewMessage);
      socket.off('chat:notification', handleChatNotification);
      socket.off('chat:user_typing', handleTyping);
      socket.off('chat:messages_read', handleMessagesRead);
      socket.off('chat:messages_delivered', handleMessagesDelivered);
      socket.off('chat:message_deleted', handleMessageDeleted);
      socket.off('chat:message_edited', handleMessageEdited);
      socket.off('chat:message_reaction', handleReaction);
      socket.off('error', handleError);
    };
  }, [conversationId, currentUserId, onLastMessageUpdate, syncReadState]);

  useEffect(() => {
    if (confirmedMessages.length === 0) return;

    autoScrollEnabledRef.current = true;
    setMessages((previousMessages) => mergeMessages(previousMessages, confirmedMessages));
    setAutoScrollMode('smooth');
  }, [confirmedMessages]);

  useEffect(() => {
    const handleChatSync = (event: Event) => {
      const response = (event as CustomEvent<ChatSyncResponse>).detail;
      const syncedMessages = (response?.messages ?? [])
        .filter((message) => message.conversationId === conversationId);
      const changedMessages = [...syncedMessages, ...(response?.statusChanges ?? [])]
        .filter((message) => message.conversationId === conversationId);
      if (changedMessages.length === 0) return;

      if (syncedMessages.length > 0) {
        autoScrollEnabledRef.current = true;
        setAutoScrollMode('smooth');
      }
      setMessages((previousMessages) => mergeMessages(previousMessages, changedMessages));
    };

    window.addEventListener(CHAT_SYNC_EVENT, handleChatSync);
    return () => window.removeEventListener(CHAT_SYNC_EVENT, handleChatSync);
  }, [conversationId, currentUserId]);

  useEffect(() => {
    const optimisticCountIncreased = optimisticMessages.length > optimisticCountRef.current;
    const uploadingCountIncreased = uploadingMessages.length > uploadingCountRef.current;

    optimisticCountRef.current = optimisticMessages.length;
    uploadingCountRef.current = uploadingMessages.length;

    if (optimisticCountIncreased || uploadingCountIncreased) {
      autoScrollEnabledRef.current = true;
      setAutoScrollMode('smooth');
    }
  }, [optimisticMessages.length, uploadingMessages.length]);

  useEffect(() => {
    if (!autoScrollMode) return;
    virtuosoRef.current?.scrollToIndex({
      index: 'LAST',
      align: 'end',
      behavior: autoScrollMode === 'smooth' ? 'smooth' : 'auto',
    });
    setAutoScrollMode(null);
  }, [autoScrollMode, messages.length, optimisticMessages.length, uploadingMessages.length, typingUser]);

  const confirmedClientMessageIds = new Set(
    messages
      .map((message) => message.clientMessageId)
      .filter((clientMessageId): clientMessageId is string => Boolean(clientMessageId))
  );
  const uploadingMessageIds = new Set(uploadingMessages.map((message) => message.id));
  const visibleOptimisticMessages = optimisticMessages.filter(
    (optimisticMessage) =>
      !confirmedClientMessageIds.has(optimisticMessage.id) &&
      !uploadingMessageIds.has(optimisticMessage.id)
  );
  const virtualItems = useMemo<VirtualMessageItem[]>(() => {
    const items: VirtualMessageItem[] = [];
    const itemIndexes = new Map<string, number>();
    let previousDate = '';
    let previousMessage: Message | null = null;

    messages.forEach((message) => {
      const dateKey = format(new Date(message.createdAt), 'yyyy-MM-dd');
      if (dateKey !== previousDate) {
        items.push({ kind: 'date', dateKey });
        previousDate = dateKey;
        previousMessage = null;
      }
      itemIndexes.set(message.id, items.length);
      items.push({
        kind: 'message',
        message,
        showAvatar: !previousMessage || previousMessage.senderId !== message.senderId,
      });
      previousMessage = message;
    });
    visibleOptimisticMessages.forEach((message) => items.push({ kind: 'optimistic', message }));
    uploadingMessages.forEach((message) => items.push({ kind: 'uploading', message }));
    if (typingUser) items.push({ kind: 'typing' });
    virtualItemIndexByMessageIdRef.current = itemIndexes;
    return items;
  }, [messages, typingUser, uploadingMessages, visibleOptimisticMessages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Get wallpaper styles
  const wallpaperOption = WALLPAPER_OPTIONS.find(w => w.id === wallpaper) || WALLPAPER_OPTIONS[0];
  const wallpaperClasses = cn(wallpaperOption.color, wallpaperOption.pattern);

  const renderVirtualItem = (_index: number, item: VirtualMessageItem) => {
    if (item.kind === 'date') {
      return (
        <div className="flex items-center justify-center my-4">
          <div className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-600 dark:text-gray-300">
            {formatDateSeparator(new Date(item.dateKey))}
          </div>
        </div>
      );
    }

    if (item.kind === 'message') {
      const message = item.message;
      return (
        <MessageBubble
          message={message}
          isOwn={message.senderId === currentUserId}
          showAvatar={item.showAvatar}
          otherUser={otherUser}
          conversationId={conversationId}
          isHighlighted={highlightedMessageId === message.id}
          onScrollToReply={scrollToMessage}
          registerRef={(element) => registerMessageRef(message.id, element)}
          onReply={onReply ? () => onReply({
            id: message.id,
            content: message.content,
            senderName: message.senderId === currentUserId ? 'You' : otherUser.name,
          }) : undefined}
          onViewImage={setViewingImage}
          onViewVideo={setViewingVideo}
          availableReactions={availableReactions}
          animatedBubbles={animatedBubbles}
        />
      );
    }

    if (item.kind === 'optimistic') {
      const optimisticMessage = item.message;
      return (
        <div className="flex w-full min-w-0 max-w-full justify-end mb-2">
          <div className="min-w-0 max-w-[85%] sm:max-w-[70%]">
            {optimisticMessage.replyTo && (
              <div className="text-xs p-2 rounded-t-lg border-l-2 bg-blue-600/20 border-blue-400">
                <span className="text-gray-500 text-[10px]">↩ Replying to</span>
                <p className="truncate text-gray-700 dark:text-gray-300">{optimisticMessage.replyTo.content}</p>
              </div>
            )}
            <div className={cn(
              'bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-sm',
              optimisticMessage.status === 'FAILED' && 'bg-red-600',
              optimisticMessage.replyTo && 'rounded-t-none'
            )}>
              {optimisticMessage.mediaUrl && optimisticMessage.contentType === 'image' && (
                <img src={optimisticMessage.mediaUrl} alt={optimisticMessage.fileName || 'Failed upload'} className="mb-2 max-h-52 rounded-lg object-cover" />
              )}
              {optimisticMessage.mediaUrl && optimisticMessage.contentType === 'video' && (
                <video src={optimisticMessage.mediaUrl} className="mb-2 max-h-52 rounded-lg" muted />
              )}
              <p className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{optimisticMessage.content}</p>
            </div>
            <div className={cn(
              'text-xs text-gray-500 mt-1 flex items-center gap-1 justify-end',
              optimisticMessage.status === 'FAILED' && 'text-red-600 dark:text-red-400'
            )}>
              <span>{format(new Date(optimisticMessage.createdAt), 'HH:mm')}</span>
              {optimisticMessage.status === 'FAILED' ? (
                <button
                  type="button"
                  onClick={() => onRetryMessage?.(optimisticMessage.id)}
                  className="font-semibold underline underline-offset-2"
                  aria-label="Retry failed message"
                >
                  Failed · Retry
                </button>
              ) : <span className="animate-pulse">⏳</span>}
            </div>
          </div>
        </div>
      );
    }

    if (item.kind === 'uploading') {
      const uploadingMessage = item.message;
      return (
        <div className="flex w-full min-w-0 max-w-full justify-end mb-2">
          <div className="relative min-w-0 max-w-[85%] sm:max-w-[70%]">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-sm">
              {uploadingMessage.preview && (uploadingMessage.type === 'image' || uploadingMessage.type === 'video') && (
                <div className="relative mb-2 rounded-lg overflow-hidden">
                  {uploadingMessage.type === 'image' ? (
                    <img src={uploadingMessage.preview} alt="Uploading" className="max-w-full opacity-70 max-h-[200px]" />
                  ) : (
                    <video src={uploadingMessage.preview} className="max-w-full opacity-70 max-h-[200px]" muted />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="rounded-full bg-black/40 px-2 py-1 text-xs font-medium">
                      {uploadingMessage.progress}%
                    </span>
                  </div>
                </div>
              )}
              {(uploadingMessage.type === 'audio' || uploadingMessage.type === 'document') && (
                <div className="flex items-center gap-3">
                  <span className="text-xl">{uploadingMessage.type === 'audio' ? '🎤' : '📄'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{uploadingMessage.fileName || 'Uploading...'}</p>
                    <p className="text-xs opacity-70">Sending... {uploadingMessage.progress}%</p>
                  </div>
                </div>
              )}
              {(uploadingMessage.type === 'image' || uploadingMessage.type === 'video') && (
                <p className="text-sm">
                  {uploadingMessage.type === 'image' ? '📷 Sending photo...' : '🎥 Sending video...'}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
        <div className="flex gap-1">
          <span className="animate-bounce">•</span>
          <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>•</span>
          <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>•</span>
        </div>
        <span>{otherUser.name} is typing...</span>
      </div>
    );
  };

  return (
    <>
    <Virtuoso
      ref={virtuosoRef}
      className={cn(
        'flex-1 min-h-0 min-w-0 w-full max-w-full overflow-x-hidden overscroll-contain',
        wallpaperClasses
      )}
      style={{ overflowAnchor: 'none', overflowX: 'hidden' }}
      data={virtualItems}
      firstItemIndex={firstItemIndex}
      increaseViewportBy={{ top: 96, bottom: 200 }}
      computeItemKey={(index, item) => {
        if (item.kind === 'message') return item.message.id;
        if (item.kind === 'optimistic' || item.kind === 'uploading') return item.message.id;
        if (item.kind === 'date') return `date-${item.dateKey}-${index}`;
        return `typing-${conversationId}`;
      }}
      startReached={() => {
        if (hasMore && !loadingMore && nextCursor && !activeFetchKeyRef.current) {
          void fetchMessages(nextCursor);
        }
      }}
      atBottomStateChange={(atBottom) => {
        autoScrollEnabledRef.current = atBottom;
        if (atBottom) void syncReadState();
      }}
      followOutput={() => autoScrollEnabledRef.current ? 'smooth' : false}
      components={{
        Header: () => loadingMore ? (
          <div className="flex justify-center py-2">
            <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : null,
      }}
      itemContent={(index, item) => (
        <div className="box-border w-full min-w-0 max-w-full px-4">
          {renderVirtualItem(index, item)}
        </div>
      )}
    />
    {/* Image Viewer Modal */}
    {viewingImage && (
      <div 
        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
        onClick={() => setViewingImage(null)}
      >
        <button
          onClick={() => setViewingImage(null)}
          className="absolute top-4 right-4 text-white hover:bg-white/10 p-2 rounded-full transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img 
          src={viewingImage} 
          alt="Full size image" 
          className="max-w-full max-h-full object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
        <a
          href={viewingImage}
          download
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </a>
      </div>
    )}

    {/* Video Viewer Modal */}
    {viewingVideo && (
      <div 
        className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
        onClick={() => setViewingVideo(null)}
      >
        <button
          onClick={() => setViewingVideo(null)}
          className="absolute top-4 right-4 text-white hover:bg-white/10 p-2 rounded-full transition-colors z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <video 
          src={viewingVideo} 
          controls
          autoPlay
          className="max-w-full max-h-full rounded-lg"
          style={{ maxHeight: '90vh', maxWidth: '90vw' }}
          onClick={(e) => e.stopPropagation()}
        />
        <a
          href={viewingVideo}
          download
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-4 right-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </a>
      </div>
    )}
    </>
  );
}

// ============================================
// Message Bubble Component
// ============================================
interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  otherUser: {
    name: string;
    profileImage?: string | null;
  };
  conversationId: string;
  isHighlighted?: boolean;
  onScrollToReply?: (messageId: string) => void;
  registerRef?: (el: HTMLDivElement | null) => void;
  onReply?: () => void;
  onViewImage?: (url: string) => void;
  onViewVideo?: (url: string) => void;
  availableReactions?: string[];
  animatedBubbles?: boolean;
}

function MessageBubble({ 
  message, 
  isOwn, 
  showAvatar, 
  otherUser,
  conversationId,
  isHighlighted = false,
  onScrollToReply,
  registerRef,
  onReply,
  onViewImage,
  onViewVideo,
  availableReactions = DEFAULT_CHAT_REACTIONS,
  animatedBubbles = false,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copied, setCopied] = useState(false);

  const handleDelete = (forEveryone: boolean) => {
    deleteChatMessage(message.id, conversationId, forEveryone);
    setShowActions(false);
    setShowMenu(false);
  };

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      editChatMessage(message.id, conversationId, editContent);
    }
    setIsEditing(false);
  };

  const handleReaction = (emoji: string) => {
    reactToChatMessage(message.id, conversationId, emoji);
    setShowReactions(false);
  };

  if (message.isDeleted) {
    return (
      <div 
        ref={registerRef}
        className={cn(
          'flex w-full min-w-0 max-w-full items-center gap-2',
          isOwn ? 'justify-end' : 'justify-start'
        )}
      >
        <div className="bg-gray-100 dark:bg-gray-800 text-gray-500 italic px-4 py-2 rounded-lg text-sm">
          This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={registerRef}
      className={cn(
        'flex w-full min-w-0 max-w-full gap-2 group transition-all duration-300',
        isOwn ? 'justify-end' : 'justify-start',
        isHighlighted && 'bg-yellow-100/50 dark:bg-yellow-900/30 -mx-2 px-2 py-1 rounded-lg'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
    >
      {/* Avatar for received messages */}
      {!isOwn && (
        <div className={cn('w-8 h-8 flex-shrink-0', !showAvatar && 'invisible')}>
          {showAvatar && (
            <UserAvatar
              imageSrc={otherUser.profileImage}
              name={otherUser.name}
              className="h-8 w-8 bg-gradient-to-br from-blue-400 to-purple-500 text-sm font-medium text-white"
              fallbackClassName="text-sm"
            />
          )}
        </div>
      )}

      <div className={cn(
        'relative min-w-0 max-w-[85%] sm:max-w-[70%]',
        isOwn && 'order-first'
      )}>
        {/* Reply preview - clickable to scroll to original message */}
        {message.replyTo && (
          <button
            onClick={() => onScrollToReply?.(message.replyTo!.id)}
            className={cn(
              'text-xs p-2 rounded-t-lg border-l-2 w-full text-left cursor-pointer hover:opacity-80 transition-opacity',
              isOwn 
                ? 'bg-blue-600/20 border-blue-400' 
                : 'bg-gray-100 dark:bg-gray-800 border-gray-400'
            )}
          >
            <span className="text-gray-500 text-[10px]">↩ Replying to</span>
            <p className="truncate text-gray-700 dark:text-gray-300">{message.replyTo.content}</p>
          </button>
        )}

        {/* Message content */}
        <div className={cn(
          'px-4 py-2 rounded-2xl relative',
          animatedBubbles && 'shadow-sm shadow-blue-400/15 transition-transform duration-150 hover:scale-[1.01]',
          isOwn 
            ? 'bg-blue-600 text-white rounded-br-sm' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm',
          message.replyTo && 'rounded-t-none'
        )}>
          {/* Image content */}
          {message.mediaUrl && message.contentType === 'image' && (
            <button 
              onClick={() => onViewImage?.(message.mediaUrl!)}
              className="block w-full text-left"
            >
              <img 
                src={message.mediaUrl} 
                alt="Shared image" 
                className="rounded-lg max-w-full mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ maxHeight: '300px' }}
              />
            </button>
          )}

          {/* Video content */}
          {message.mediaUrl && message.contentType === 'video' && (
            <div className="relative group cursor-pointer mb-2" onClick={() => onViewVideo?.(message.mediaUrl!)}>
              <video 
                src={message.mediaUrl}
                className="rounded-lg max-w-full"
                style={{ maxHeight: '300px' }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors rounded-lg">
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Audio content */}
          {message.mediaUrl && message.contentType === 'audio' && (
            <div className={cn(
              'flex items-center gap-3 p-2 rounded-lg mb-2',
              isOwn ? 'bg-blue-700/50' : 'bg-gray-200 dark:bg-gray-700'
            )}>
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <span className="text-white text-lg">🎤</span>
              </div>
              <audio 
                src={message.mediaUrl}
                controls
                className="flex-1 h-8"
                style={{ maxWidth: '200px' }}
              />
            </div>
          )}

          {/* Document content */}
          {message.mediaUrl && message.contentType === 'document' && (
            <a 
              href={message.mediaUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors',
                isOwn ? 'bg-blue-700/50 hover:bg-blue-700/70' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
            >
              <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
                <span className="text-white text-lg">📄</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('font-medium truncate text-sm', isOwn ? 'text-white' : 'text-gray-900 dark:text-white')}>
                  {message.fileName || 'Document'}
                </p>
                {message.fileSize && (
                  <p className={cn('text-xs', isOwn ? 'text-blue-200' : 'text-gray-500')}>
                    {(message.fileSize / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
            </a>
          )}

          {/* Generic file content */}
          {message.mediaUrl && message.contentType === 'file' && (
            <a 
              href={message.mediaUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white/10 p-2 rounded mb-2 hover:bg-white/20"
            >
              <span>📎</span>
              <span className="truncate">{message.fileName || 'File'}</span>
            </a>
          )}

          {/* Shared Reel content - thumbnail only, click to open reel */}
          {message.contentType === 'reel' && (() => {
            let reelId: string | null = null;
            try {
              const data = JSON.parse(message.content);
              reelId = data.reelId || null;
            } catch {
              // Legacy: content might be plain text, try to extract reel ID from URL if any
              const match = message.content?.match(/\/reels\/([a-f0-9-]+)/i);
              reelId = match?.[1] || null;
            }
            const thumbnailUrl = message.mediaUrl;
            const reelUrl = reelId ? `/reels/${reelId}` : '/reels';
            // Show thumbnail card even for legacy messages without reelId (links to reels feed)
            return (
              <a
                href={reelUrl}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = reelUrl;
                }}
                className={cn(
                  'block relative rounded-xl overflow-hidden w-24 h-36 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity',
                  isOwn ? 'ring-2 ring-white/30' : 'ring-2 ring-gray-300 dark:ring-gray-600'
                )}
              >
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt="Reel"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={cn(
                    'w-full h-full flex items-center justify-center',
                    isOwn ? 'bg-blue-700/50' : 'bg-gray-200 dark:bg-gray-700'
                  )}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M7 3v18" />
                      <path d="M17 3v18" />
                      <path d="M3 12h18" />
                    </svg>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </a>
            );
          })()}

          {/* Shared Post content */}
          {(message.contentType === 'post' || message.contentType === 'application/x-shared-post') && (() => {
            try {
              const postData = JSON.parse(message.content);
              const postId = postData.postId;
              const postUrl = postData.postUrl || (postId ? `/post/${postId}` : null);
              
              return (
                <a
                  href={postUrl || '#'}
                  onClick={(e) => {
                    if (postUrl) {
                      e.preventDefault();
                      window.location.href = postUrl;
                    }
                  }}
                  className={cn(
                    'block rounded-lg p-3 mb-2 cursor-pointer transition-colors',
                    isOwn ? 'bg-blue-700/50 hover:bg-blue-700/70' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2 text-xs opacity-70">
                    <span>📄</span>
                    <span>Shared Post</span>
                  </div>
                  {postData.mediaUrl && (
                    <img 
                      src={postData.mediaUrl} 
                      alt="Post media" 
                      className="rounded-md w-full h-24 object-cover mb-2"
                    />
                  )}
                  {postData.author && (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <UserAvatar
                          imageSrc={postData.author.profileImage}
                          name={postData.author.name}
                          className="h-6 w-6 text-[10px]"
                          fallbackClassName="text-[10px]"
                        />
                        <p className={cn('font-medium text-sm', isOwn ? 'text-white' : 'text-gray-900 dark:text-white')}>
                          {postData.author.name}
                        </p>
                      </div>
                      {postData.author.username && (
                        <p className={cn('text-xs opacity-60', isOwn ? 'text-blue-200' : 'text-gray-500')}>
                          @{postData.author.username}
                        </p>
                      )}
                    </>
                  )}
                  {/* Legacy format support */}
                  {!postData.author && postData.authorName && (
                    <>
                      <p className={cn('font-medium text-sm', isOwn ? 'text-white' : 'text-gray-900 dark:text-white')}>
                        {postData.authorName}
                      </p>
                      {postData.authorUsername && (
                        <p className={cn('text-xs opacity-60', isOwn ? 'text-blue-200' : 'text-gray-500')}>
                          @{postData.authorUsername}
                        </p>
                      )}
                    </>
                  )}
                  {(postData.preview || postData.contentPreview) && (
                    <p className={cn('text-sm mt-1 line-clamp-2', isOwn ? 'text-blue-100' : 'text-gray-600 dark:text-gray-300')}>
                      {postData.preview || postData.contentPreview}
                    </p>
                  )}
                  <p className="text-xs opacity-50 mt-2 italic">Tap to view post →</p>
                </a>
              );
            } catch {
              return <p className="break-words whitespace-pre-wrap">{message.content}</p>;
            }
          })()}

          {/* Text content - hide for reel (thumbnail only) and shared posts */}
          {message.contentType !== 'post' &&
            message.contentType !== 'application/x-shared-post' &&
            message.contentType !== 'reel' && (isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 bg-white/20 rounded px-2 py-1 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEdit();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
              />
              <button onClick={handleEdit} className="text-xs">Save</button>
            </div>
          ) : (
            <p className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{message.content}</p>
          ))}

          {/* Edited indicator - only show if message was explicitly edited */}
          {!message.isDeleted && message.isEdited && (
            <span className="text-xs opacity-60 ml-1">(edited)</span>
          )}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={cn(
            'flex flex-wrap gap-1 mt-1',
            isOwn ? 'justify-end' : 'justify-start'
          )}>
            {Array.from(new Set(message.reactions.map(r => r.emoji))).map(emoji => {
              const count = message.reactions.filter(r => r.emoji === emoji).length;
              return (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-sm flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <span>{emoji}</span>
                  <span className="text-xs text-gray-500">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Time and status */}
        <div className={cn(
          'text-xs text-gray-500 mt-1 flex items-center gap-1',
          isOwn ? 'justify-end' : 'justify-start'
        )}>
          <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
          {isOwn && (
            <span className={cn(
              message.status === 'READ' && 'text-blue-500'
            )}>
              {message.status === 'READ' ? '✓✓' : message.status === 'DELIVERED' ? '✓✓' : '✓'}
            </span>
          )}
        </div>

        {/* Quick Action buttons (Discord-style) */}
        <MessageQuickActions
          isVisible={showActions && !isEditing && !showMenu}
          isOwn={isOwn}
          onReply={() => onReply?.()}
          onReact={() => setShowReactions(!showReactions)}
          onMore={() => setShowMenu(true)}
        />

        {/* Full Message Menu */}
        <MessageMenu
          isOpen={showMenu}
          onClose={() => setShowMenu(false)}
          isOwn={isOwn}
          messageContent={message.content}
          hasMedia={!!message.mediaUrl}
          mediaUrl={message.mediaUrl}
          onReply={() => onReply?.()}
          onEdit={() => setIsEditing(true)}
          onDelete={handleDelete}
          onReact={handleReaction}
          onCopy={() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          availableReactions={availableReactions}
          anchorPosition={isOwn ? 'right' : 'left'}
        />

        {/* Reaction picker */}
        {showReactions && !showMenu && (
          <div className={cn(
            'absolute -top-10 flex items-center gap-1 bg-white dark:bg-gray-900 shadow-lg rounded-full px-2 py-1',
            isOwn ? 'right-0' : 'left-0'
          )}>
            {availableReactions.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="hover:scale-125 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Copied notification */}
        {copied && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            Copied!
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Utility Functions
// ============================================
function formatDateSeparator(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}
