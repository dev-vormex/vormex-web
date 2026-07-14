'use client';

import type { QueryClient } from '@tanstack/react-query';
import type { Message, MessagesResponse } from '@/lib/api/chat';
import { queryKeys } from '@/lib/queryKeys';
import { readCachedMessages, writeCachedMessages } from './browserCache';

export function normalizeMessage(message: Message): Message {
  // Trust only the explicit server edit marker. Inferring edits from
  // updatedAt drift falsely labels every delivered/read message "(edited)",
  // because status receipts also bump updatedAt.
  return {
    ...message,
    isEdited: message.isEdited === true || Boolean(message.editedAt),
  };
}

export function mergeMessages(existingMessages: Message[], incomingMessages: Message[]): Message[] {
  if (incomingMessages.length === 0) {
    return existingMessages;
  }

  const messageMap = new Map(existingMessages.map((message) => [message.id, message]));
  const clientMessageIdMap = new Map(
    existingMessages
      .map((message) => [message.clientMessageId, message.id] as const)
      .filter(([clientMessageId]) => Boolean(clientMessageId))
  );

  incomingMessages.forEach((incomingMessage) => {
    const normalizedMessage = normalizeMessage(incomingMessage);
    const existingIdForClientMessage = normalizedMessage.clientMessageId
      ? clientMessageIdMap.get(normalizedMessage.clientMessageId)
      : undefined;
    const existingMessage = messageMap.get(existingIdForClientMessage || normalizedMessage.id);
    if (existingIdForClientMessage && existingIdForClientMessage !== normalizedMessage.id) {
      messageMap.delete(existingIdForClientMessage);
    }

    messageMap.set(
      normalizedMessage.id,
      existingMessage
        ? {
            ...existingMessage,
            ...normalizedMessage,
            sender: normalizedMessage.sender ?? existingMessage.sender,
            reactions: normalizedMessage.reactions ?? existingMessage.reactions,
            replyTo: normalizedMessage.replyTo ?? existingMessage.replyTo,
          }
        : normalizedMessage
    );
    if (normalizedMessage.clientMessageId) {
      clientMessageIdMap.set(normalizedMessage.clientMessageId, normalizedMessage.id);
    }
  });

  return Array.from(messageMap.values()).sort(
    (firstMessage, secondMessage) =>
      new Date(firstMessage.createdAt).getTime() - new Date(secondMessage.createdAt).getTime()
  );
}

/**
 * Merge a realtime message into the cached thread of its conversation. When a
 * message arrives while the conversation is closed, only the conversation-list
 * preview gets updated — the cached thread silently goes stale while still
 * looking fresh by timestamp. Opening the chat (e.g. by clicking the message
 * toast) then renders that snapshot without the newest message. Keeping the
 * thread caches current here makes the message visible the moment the chat
 * mounts.
 */
export function appendMessageToConversationCache(
  queryClient: QueryClient,
  userId: string | undefined | null,
  conversationId: string,
  message: Message
): void {
  const messagesQueryKey = queryKeys.chatMessages(conversationId);
  const cachedResponse =
    queryClient.getQueryData<MessagesResponse>(messagesQueryKey) ??
    readCachedMessages(userId, conversationId)?.value;

  // No cached thread yet — the first open fetches from the server anyway.
  if (!cachedResponse) return;

  if (cachedResponse.messages.some((existingMessage) => existingMessage.id === message.id)) {
    return;
  }

  const nextResponse: MessagesResponse = {
    ...cachedResponse,
    messages: mergeMessages(cachedResponse.messages, [message]),
  };

  queryClient.setQueryData(messagesQueryKey, nextResponse);
  writeCachedMessages(userId, conversationId, nextResponse);
}
