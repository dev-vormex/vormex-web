'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { getUnreadCount } from '@/lib/api/chat';
import { initializeSocket } from '@/lib/socket';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/lib/auth/useAuth';

const UNREAD_COUNT_STALE_TIME = 30 * 1000;

/**
 * Total unread direct messages for the current user.
 * Refetches on incoming chat socket events and when navigating to /messages,
 * so nav badges stay in sync as conversations are read.
 */
export function useUnreadMessagesCount(): number {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pathname = usePathname();

  const { data } = useQuery({
    queryKey: queryKeys.chatUnreadCount(user?.id),
    queryFn: getUnreadCount,
    enabled: !!user,
    staleTime: UNREAD_COUNT_STALE_TIME,
  });

  useEffect(() => {
    if (!user) return;

    const socket = initializeSocket();
    // The same message reaches this hook via both chat:new_message and
    // chat:notification; bump the badge once per message id.
    const countedMessageIds = new Set<string>();

    const invalidateUnreadCount = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chatUnreadCount(user.id) });
    };

    const handleIncomingMessage = (data: { conversationId?: string; message?: { id?: string; senderId?: string } }) => {
      const message = data?.message;
      if (message?.id && message.senderId && message.senderId !== user.id) {
        if (!countedMessageIds.has(message.id)) {
          countedMessageIds.add(message.id);
          if (countedMessageIds.size > 200) {
            const first = countedMessageIds.values().next().value;
            if (first) countedMessageIds.delete(first);
          }
          // Don't count messages for the conversation currently on screen —
          // they're being read immediately.
          const viewingConversation =
            data.conversationId && window.location.pathname === `/messages/${data.conversationId}`;
          if (!viewingConversation) {
            // Bump instantly so the badge reacts without a network round-trip…
            queryClient.setQueryData<{ unreadCount: number } | undefined>(
              queryKeys.chatUnreadCount(user.id),
              (previous) => ({ unreadCount: (previous?.unreadCount ?? 0) + 1 })
            );
          }
        }
      }
      // …and reconcile with the server shortly after.
      invalidateUnreadCount();
    };

    socket.on('chat:new_message', handleIncomingMessage);
    socket.on('chat:notification', handleIncomingMessage);
    socket.on('chat:messages_read', invalidateUnreadCount);

    return () => {
      socket.off('chat:new_message', handleIncomingMessage);
      socket.off('chat:notification', handleIncomingMessage);
      socket.off('chat:messages_read', invalidateUnreadCount);
    };
  }, [user, queryClient]);

  // Reading a conversation clears unreads server-side; refresh when the user
  // navigates within messaging so the badge catches up.
  useEffect(() => {
    if (!user || !pathname?.startsWith('/messages')) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.chatUnreadCount(user.id) });
  }, [user, pathname, queryClient]);

  return data?.unreadCount ?? 0;
}
