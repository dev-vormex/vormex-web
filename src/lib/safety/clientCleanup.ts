'use client';

import type { QueryClient } from '@tanstack/react-query';
import type { ConversationsResponse } from '@/lib/api/chat';
import { queryKeys } from '@/lib/queryKeys';
import { evictCachedConversations } from '@/lib/chat/browserCache';
import { clearConversationChatOutbox } from '@/lib/chat/outbox';
import { clearCachedFeed } from '@/lib/feed/browserCache';
import { clearDailyModules } from '@/lib/feed/dailyModulesCache';
import { clearCachedStories } from '@/lib/stories/browserCache';

const SAFETY_SENSITIVE_QUERY_ROOTS = new Set([
  'feed',
  'reels-feed',
  'stories',
  'daily-matches',
  'smart-matches',
  'people-from-college',
  'find-people-initial',
  'people-search',
  'profile',
  'profile-core',
  'profile-activity-years',
  'profile-activity-heatmap',
  'notifications',
  'connections',
  'followers',
  'following',
  'chat-unread-count',
]);

export async function removeUnavailableConversations(params: {
  queryClient: QueryClient;
  ownerId: string;
  conversationIds: string[];
}): Promise<void> {
  const conversationIds = Array.from(new Set(params.conversationIds.filter(Boolean)));
  if (conversationIds.length === 0) return;
  const unavailableIds = new Set(conversationIds);

  params.queryClient.setQueryData<ConversationsResponse>(
    queryKeys.chatConversations(params.ownerId),
    (previous) => previous
      ? {
          ...previous,
          unavailableConversationIds: conversationIds,
          conversations: previous.conversations.filter((conversation) => !unavailableIds.has(conversation.id)),
        }
      : previous
  );
  conversationIds.forEach((conversationId) => {
    params.queryClient.removeQueries({
      queryKey: queryKeys.chatConversation(params.ownerId, conversationId),
      exact: true,
    });
    params.queryClient.removeQueries({
      queryKey: queryKeys.chatMessages(params.ownerId, conversationId),
      exact: true,
    });
  });

  evictCachedConversations(params.ownerId, conversationIds);
  await clearConversationChatOutbox(params.ownerId, conversationIds);
}

export function removeProfileQueries(queryClient: QueryClient, identifiers: string[]): void {
  const normalizedIdentifiers = new Set(
    identifiers.map((identifier) => identifier.trim().toLowerCase()).filter(Boolean)
  );
  if (normalizedIdentifiers.size === 0) return;

  queryClient.removeQueries({
    predicate: (query) => {
      const root = String(query.queryKey[0] ?? '');
      if (!root.startsWith('profile')) return false;
      return query.queryKey.slice(1).some((value) =>
        normalizedIdentifiers.has(String(value ?? '').trim().toLowerCase())
      );
    },
  });
}

export async function refreshSafetySensitiveQueries(
  queryClient: QueryClient,
  ownerId?: string | null
): Promise<void> {
  if (ownerId) {
    clearCachedFeed(ownerId);
    clearCachedStories(ownerId);
    clearDailyModules(ownerId);
  }

  // Reset removes stale payloads immediately and refetches active observers.
  // Invalidating alone leaves blocked content visible until that refetch settles.
  await queryClient.resetQueries({
    predicate: (query) => SAFETY_SENSITIVE_QUERY_ROOTS.has(String(query.queryKey[0] ?? '')),
  });
}
