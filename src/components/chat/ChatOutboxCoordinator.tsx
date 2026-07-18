'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import {
  syncChat,
  type ChatSyncResponse,
  type ConversationsResponse,
  type Message,
} from '@/lib/api/chat';
import { initializeSocket } from '@/lib/socket';
import { drainChatOutbox } from '@/lib/chat/outbox';
import { appendMessageToConversationCache } from '@/lib/chat/messageCache';
import {
  readCachedConversations,
  writeCachedConversation,
  writeCachedConversations,
} from '@/lib/chat/browserCache';
import { queryKeys } from '@/lib/queryKeys';
import { onForegroundMessage } from '@/lib/firebase';

export const CHAT_SYNC_EVENT = 'vormex:chat-sync';

function syncCursorKey(userId: string): string {
  return `vormex:chat:sync-cursor:${encodeURIComponent(userId)}`;
}

function conversationSortTime(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function ChatOutboxCoordinator() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const syncRunningRef = useRef(false);

  const applySyncResponse = useCallback((response: ChatSyncResponse) => {
    if (!user?.id) return;

    const changedMessages = [...response.messages, ...response.statusChanges];
    changedMessages.forEach((message) => {
      appendMessageToConversationCache(queryClient, user.id, message.conversationId, message);
    });

    if (response.conversations.length > 0) {
      const conversationsQueryKey = queryKeys.chatConversations(user.id);
      const cachedResponse =
        queryClient.getQueryData<ConversationsResponse>(conversationsQueryKey) ??
        readCachedConversations(user.id)?.value ??
        { conversations: [], hasMore: false };
      const conversationMap = new Map(
        cachedResponse.conversations.map((conversation) => [conversation.id, conversation])
      );
      response.conversations.forEach((conversation) => {
        conversationMap.set(conversation.id, conversation);
        queryClient.setQueryData(queryKeys.chatConversation(user.id, conversation.id), conversation);
        writeCachedConversation(user.id, conversation);
      });
      const nextResponse: ConversationsResponse = {
        ...cachedResponse,
        conversations: Array.from(conversationMap.values()).sort(
          (left, right) =>
            conversationSortTime(right.lastMessageAt ?? right.updatedAt) -
            conversationSortTime(left.lastMessageAt ?? left.updatedAt)
        ),
      };
      queryClient.setQueryData(conversationsQueryKey, nextResponse);
      writeCachedConversations(user.id, nextResponse);
    }

    window.dispatchEvent(new CustomEvent<ChatSyncResponse>(CHAT_SYNC_EVENT, { detail: response }));
  }, [queryClient, user?.id]);

  const runDeltaSync = useCallback(async () => {
    if (!user?.id || syncRunningRef.current) return;
    syncRunningRef.current = true;
    try {
      let cursor = localStorage.getItem(syncCursorKey(user.id)) || undefined;
      let hasMore = false;
      do {
        const response = await syncChat(cursor);
        applySyncResponse(response);
        cursor = response.cursor;
        localStorage.setItem(syncCursorKey(user.id), response.cursor);
        hasMore = response.hasMore;
      } while (hasMore);
    } catch (error) {
      console.error('Chat delta sync failed:', error);
    } finally {
      syncRunningRef.current = false;
    }
  }, [applySyncResponse, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const socket = initializeSocket();
    const recover = () => {
      void drainChatOutbox(user.id).catch((error) => {
        console.error('Could not drain chat outbox:', error);
      });
      void runDeltaSync();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') recover();
    };

    recover();
    socket.on('socket:authenticated', recover);
    window.addEventListener('online', recover);
    window.addEventListener('pageshow', recover);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      socket.off('socket:authenticated', recover);
      window.removeEventListener('online', recover);
      window.removeEventListener('pageshow', recover);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [runDeltaSync, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    return onForegroundMessage((payload) => {
      const data = payload?.data as Record<string, string> | undefined;
      if (data?.type !== 'new_message' || !data.conversationId || !data.messageId) return;
      const senderId = data.user_id || '';
      const createdAt = data.messageCreatedAt || new Date().toISOString();
      const message: Message = {
        id: data.messageId,
        clientMessageId: data.clientMessageId || undefined,
        conversationId: data.conversationId,
        senderId,
        receiverId: user.id,
        content: data.messageContent || payload?.notification?.body || '',
        contentType: data.contentType || 'text',
        mediaUrl: data.mediaUrl || undefined,
        mediaType: data.mediaType || undefined,
        fileName: data.fileName || undefined,
        fileSize: data.fileSize ? Number.parseInt(data.fileSize, 10) : undefined,
        status: 'SENT',
        isDeleted: false,
        sender: {
          id: senderId,
          username: '',
          name: data.senderName || payload?.notification?.title || '',
          profileImage: data.senderImage || null,
          isOnline: false,
          lastActiveAt: null,
        },
        reactions: [],
        createdAt,
        updatedAt: data.messageUpdatedAt || createdAt,
      };
      applySyncResponse({
        messages: [message],
        statusChanges: [],
        conversations: [],
        cursor: localStorage.getItem(syncCursorKey(user.id)) || '',
        hasMore: false,
      });
    }) ?? undefined;
  }, [applySyncResponse, user?.id]);

  return null;
}
