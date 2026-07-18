'use client';

import type {
  Conversation,
  ConversationsResponse,
  MessagesResponse,
} from '@/lib/api/chat';
import { CHAT_STALE_TIME } from '@/lib/queryKeys';

const CACHE_VERSION = 1;
const CACHE_PREFIX = `vormex:chat:${CACHE_VERSION}`;
const BROWSER_CACHE_TTL = 12 * 60 * 60 * 1000;
const MAX_CACHED_CONVERSATIONS = 50;
const MAX_CACHED_MESSAGES = 100;
const MESSAGE_CACHE_WRITE_DEBOUNCE_MS = 500;

const pendingMessageWrites = new Map<string, MessagesResponse>();
const pendingMessageWriteTimers = new Map<string, ReturnType<typeof setTimeout>>();
let pageHideFlushRegistered = false;

type CacheEnvelope<T> = {
  savedAt: number;
  value: T;
};

export type ChatCacheSnapshot<T> = {
  savedAt: number;
  isFresh: boolean;
  value: T;
};

function storage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function keyFor(parts: Array<string | undefined | null>): string {
  return [CACHE_PREFIX, ...parts.map((part) => encodeURIComponent(part ?? ''))].join(':');
}

function readSnapshot<T>(
  key: string,
  isValid: (value: unknown) => value is T
): ChatCacheSnapshot<T> | undefined {
  const cacheStorage = storage();
  if (!cacheStorage) return undefined;

  try {
    const raw = cacheStorage.getItem(key);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as Partial<CacheEnvelope<unknown>>;
    if (
      typeof parsed.savedAt !== 'number' ||
      !isValid(parsed.value) ||
      Date.now() - parsed.savedAt > BROWSER_CACHE_TTL
    ) {
      cacheStorage.removeItem(key);
      return undefined;
    }

    return {
      savedAt: parsed.savedAt,
      isFresh: Date.now() - parsed.savedAt <= CHAT_STALE_TIME,
      value: parsed.value,
    };
  } catch {
    cacheStorage.removeItem(key);
    return undefined;
  }
}

function writeSnapshot<T>(key: string, value: T): void {
  const cacheStorage = storage();
  if (!cacheStorage) return;

  try {
    cacheStorage.setItem(
      key,
      JSON.stringify({
        savedAt: Date.now(),
        value,
      } satisfies CacheEnvelope<T>)
    );
  } catch {
    // Storage can be full or blocked. Memory cache still keeps the UI warm.
  }
}

function flushMessageCacheWrite(key: string): void {
  const pendingResponse = pendingMessageWrites.get(key);
  if (!pendingResponse) return;

  const timer = pendingMessageWriteTimers.get(key);
  if (timer) clearTimeout(timer);
  pendingMessageWriteTimers.delete(key);
  pendingMessageWrites.delete(key);
  writeSnapshot(key, pendingResponse);
}

export function flushPendingMessageCacheWrites(): void {
  [...pendingMessageWrites.keys()].forEach(flushMessageCacheWrite);
}

function registerPageHideFlush(): void {
  if (pageHideFlushRegistered || typeof window === 'undefined') return;
  pageHideFlushRegistered = true;
  window.addEventListener('pagehide', flushPendingMessageCacheWrites);
}

function isConversation(value: unknown): value is Conversation {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Conversation).id === 'string' &&
    typeof (value as Conversation).otherParticipant === 'object'
  );
}

function isConversationsResponse(value: unknown): value is ConversationsResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as ConversationsResponse).conversations)
  );
}

function isMessagesResponse(value: unknown): value is MessagesResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as MessagesResponse).messages)
  );
}

function conversationListKey(userId: string): string {
  return keyFor(['conversations', userId]);
}

function conversationKey(userId: string, conversationId: string): string {
  return keyFor(['conversation', userId, conversationId]);
}

function messagesKey(userId: string, conversationId: string): string {
  return keyFor(['messages', userId, conversationId]);
}

export function readCachedConversations(
  userId?: string | null
): ChatCacheSnapshot<ConversationsResponse> | undefined {
  if (!userId) return undefined;
  return readSnapshot(conversationListKey(userId), isConversationsResponse);
}

export function writeCachedConversations(
  userId: string | undefined | null,
  response: ConversationsResponse
): void {
  if (!userId) return;

  const trimmedResponse: ConversationsResponse = {
    ...response,
    conversations: response.conversations.slice(0, MAX_CACHED_CONVERSATIONS),
  };

  writeSnapshot(conversationListKey(userId), trimmedResponse);
  trimmedResponse.conversations.forEach((conversation) => {
    writeCachedConversation(userId, conversation);
  });
}

export function readCachedConversation(
  userId: string | undefined | null,
  conversationId: string
): ChatCacheSnapshot<Conversation> | undefined {
  if (!userId) return undefined;
  return readSnapshot(conversationKey(userId, conversationId), isConversation);
}

export function writeCachedConversation(
  userId: string | undefined | null,
  conversation: Conversation
): void {
  if (!userId) return;
  writeSnapshot(conversationKey(userId, conversation.id), conversation);
}

export function readCachedMessages(
  userId: string | undefined | null,
  conversationId: string
): ChatCacheSnapshot<MessagesResponse> | undefined {
  if (!userId) return undefined;
  return readSnapshot(messagesKey(userId, conversationId), isMessagesResponse);
}

export function writeCachedMessages(
  userId: string | undefined | null,
  conversationId: string,
  response: MessagesResponse
): void {
  if (!userId) return;

  const key = messagesKey(userId, conversationId);
  pendingMessageWrites.set(key, {
    ...response,
    messages: response.messages.slice(-MAX_CACHED_MESSAGES),
  });

  const existingTimer = pendingMessageWriteTimers.get(key);
  if (existingTimer) clearTimeout(existingTimer);
  pendingMessageWriteTimers.set(
    key,
    setTimeout(() => flushMessageCacheWrite(key), MESSAGE_CACHE_WRITE_DEBOUNCE_MS)
  );
  registerPageHideFlush();
}
