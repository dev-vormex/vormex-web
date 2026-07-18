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

  const result = [...existingMessages];

  const compareMessages = (left: Message, right: Message): number => {
    const byCreatedAt = Date.parse(left.createdAt) - Date.parse(right.createdAt);
    return byCreatedAt !== 0 ? byCreatedAt : left.id.localeCompare(right.id);
  };

  const insertionIndex = (message: Message): number => {
    let low = 0;
    let high = result.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (compareMessages(result[middle], message) <= 0) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    return low;
  };

  incomingMessages.forEach((incomingMessage) => {
    const normalizedMessage = normalizeMessage(incomingMessage);
    const existingIndex = result.findIndex(
      (message) =>
        message.id === normalizedMessage.id ||
        Boolean(
          normalizedMessage.clientMessageId &&
            message.clientMessageId === normalizedMessage.clientMessageId
        )
    );
    const existingMessage = existingIndex >= 0 ? result.splice(existingIndex, 1)[0] : undefined;
    const mergedMessage = existingMessage
      ? {
          ...existingMessage,
          ...normalizedMessage,
          sender: normalizedMessage.sender ?? existingMessage.sender,
          reactions: normalizedMessage.reactions ?? existingMessage.reactions,
          replyTo: normalizedMessage.replyTo ?? existingMessage.replyTo,
        }
      : normalizedMessage;
    result.splice(insertionIndex(mergedMessage), 0, mergedMessage);
  });

  return result;
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
  const messagesQueryKey = queryKeys.chatMessages(userId, conversationId);
  const cachedResponse =
    queryClient.getQueryData<MessagesResponse>(messagesQueryKey) ??
    readCachedMessages(userId, conversationId)?.value;

  // No cached thread yet — the first open fetches from the server anyway.
  if (!cachedResponse) return;

  const nextResponse: MessagesResponse = {
    ...cachedResponse,
    messages: mergeMessages(cachedResponse.messages, [message]),
  };

  queryClient.setQueryData(messagesQueryKey, nextResponse);
  writeCachedMessages(userId, conversationId, nextResponse);
}
