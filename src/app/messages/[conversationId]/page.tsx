'use client';

import { useEffect, useState, use, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/useAuth';
import { ChatMessages, ChatInput, ChatHeader, type UploadingMessage, type OptimisticMessage } from '@/components/chat';
import ChatSettingsPanel from '@/components/chat/ChatSettingsPanel';
import { getConversation, type Conversation, type ConversationsResponse, type Message } from '@/lib/api/chat';
import { initializeSocket } from '@/lib/socket';
import * as storeAPI from '@/lib/api/store';
import {
  readCachedConversation,
  readCachedConversations,
  writeCachedConversation,
} from '@/lib/chat/browserCache';
import {
  buildChatCustomizationEntitlements,
  DEFAULT_CHAT_CUSTOMIZATION_ENTITLEMENTS,
  isWallpaperUnlocked,
} from '@/lib/chat/customization';
import { CHAT_STALE_TIME, queryKeys } from '@/lib/queryKeys';
import {
  CHAT_MESSAGE_CONFIRMED_EVENT,
  CHAT_OUTBOX_UPDATED_EVENT,
  drainChatOutbox,
  listChatOutboxEntries,
  retryChatOutboxEntry,
  type ChatOutboxEntry,
} from '@/lib/chat/outbox';

interface ConversationPageProps {
  params: Promise<{ conversationId: string }>;
}

type ReplyTarget = {
  conversationId: string;
  id: string;
  content: string;
  senderName: string;
};

function getStoredWallpaper(conversationId: string): string {
  if (typeof window === 'undefined') return 'default';

  try {
    return localStorage.getItem(`chat_wallpaper_${conversationId}`) || 'default';
  } catch {
    return 'default';
  }
}

// This page only renders the chat area - the layout.tsx handles the sidebar with ChatList
export default function ConversationPage({ params }: ConversationPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const conversationId = resolvedParams.conversationId;
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [wallpapersByConversation, setWallpapersByConversation] = useState<Record<string, string>>({});
  const [uploadingMessagesByConversation, setUploadingMessagesByConversation] = useState<Record<string, UploadingMessage[]>>({});
  const [optimisticMessagesByConversation, setOptimisticMessagesByConversation] = useState<Record<string, OptimisticMessage[]>>({});
  const [confirmedMessagesByConversation, setConfirmedMessagesByConversation] = useState<Record<string, Message[]>>({});
  const [lastReceivedMessagesByConversation, setLastReceivedMessagesByConversation] = useState<Record<string, string>>({});
  const [chatCustomization, setChatCustomization] = useState(DEFAULT_CHAT_CUSTOMIZATION_ENTITLEMENTS);
  const conversationQueryKey = useMemo(
    () => queryKeys.chatConversation(user?.id, conversationId),
    [conversationId, user?.id]
  );
  const conversationsQueryKey = useMemo(
    () => queryKeys.chatConversations(user?.id),
    [user?.id]
  );
  const queryCachedConversation =
    queryClient.getQueryData<Conversation>(conversationQueryKey);
  const browserConversationCache = readCachedConversation(user?.id, conversationId);
  const queryCachedConversations =
    user?.id
      ? queryClient.getQueryData<ConversationsResponse>(conversationsQueryKey)
      : undefined;
  const browserConversationsCache =
    user?.id && !queryCachedConversations
      ? readCachedConversations(user.id)
      : undefined;
  const cachedConversationFromList = (
    queryCachedConversations ?? browserConversationsCache?.value
  )?.conversations.find((cachedConversation) => cachedConversation.id === conversationId);
  const initialConversation =
    queryCachedConversation ??
    browserConversationCache?.value ??
    cachedConversationFromList;
  const initialConversationUpdatedAt =
    (queryCachedConversation
      ? queryClient.getQueryState(conversationQueryKey)?.dataUpdatedAt
      : undefined) ??
    browserConversationCache?.savedAt ??
    (cachedConversationFromList
      ? queryClient.getQueryState(conversationsQueryKey)?.dataUpdatedAt ??
        browserConversationsCache?.savedAt
      : undefined);

  const {
    data: conversation,
    isLoading,
    isError,
    error,
  } = useQuery<Conversation>({
    queryKey: conversationQueryKey,
    queryFn: async () => {
      const fetchedConversation = await getConversation(conversationId);
      writeCachedConversation(user?.id, fetchedConversation);
      return fetchedConversation;
    },
    enabled: Boolean(conversationId && user?.id),
    staleTime: CHAT_STALE_TIME,
    refetchOnMount: false,
    initialData: initialConversation,
    initialDataUpdatedAt: initialConversationUpdatedAt,
  });

  const wallpaper = wallpapersByConversation[conversationId] ?? getStoredWallpaper(conversationId);
  const effectiveWallpaper = isWallpaperUnlocked(
    wallpaper,
    chatCustomization.ownedThemePacks
  )
    ? wallpaper
    : 'default';
  const visibleReplyTo = replyTo?.conversationId === conversationId ? replyTo : null;
  const uploadingMessages = uploadingMessagesByConversation[conversationId] ?? [];
  const optimisticMessages = optimisticMessagesByConversation[conversationId] ?? [];
  const confirmedMessages = confirmedMessagesByConversation[conversationId] ?? [];
  const lastReceivedMessage = lastReceivedMessagesByConversation[conversationId] ?? '';

  useEffect(() => {
    if (!user?.id) return;
    if (queryClient.getQueryData<Conversation>(conversationQueryKey)) return;

    const browserCache = readCachedConversation(user.id, conversationId);
    if (browserCache) {
      queryClient.setQueryData(conversationQueryKey, browserCache.value, {
        updatedAt: browserCache.savedAt,
      });
      return;
    }

    const conversationFromList = readCachedConversations(user.id)?.value.conversations.find(
      (cachedConversation) => cachedConversation.id === conversationId
    );
    if (conversationFromList) {
      queryClient.setQueryData(conversationQueryKey, conversationFromList);
    }
  }, [conversationId, conversationQueryKey, queryClient, user?.id]);

  // Callback to track the last message received from other user
  const handleLastMessageUpdate = useCallback((message: string) => {
    setLastReceivedMessagesByConversation((previousMessages) => ({
      ...previousMessages,
      [conversationId]: message,
    }));
  }, [conversationId]);

  // Handle optimistic message - add to list for immediate display
  const handleOptimisticMessage = useCallback((message: OptimisticMessage) => {
    setOptimisticMessagesByConversation((previousMessages) => ({
      ...previousMessages,
      [conversationId]: (previousMessages[conversationId] ?? []).some(
        (existingMessage) => existingMessage.id === message.id
      )
        ? (previousMessages[conversationId] ?? []).map((existingMessage) =>
            existingMessage.id === message.id ? { ...existingMessage, ...message } : existingMessage
          )
        : [...(previousMessages[conversationId] ?? []), message],
    }));
  }, [conversationId]);

  const handleOptimisticMessageResolved = useCallback((optimisticId: string) => {
    setOptimisticMessagesByConversation((previousMessages) => ({
      ...previousMessages,
      [conversationId]: (previousMessages[conversationId] ?? []).filter(
        (message) => message.id !== optimisticId
      ),
    }));
  }, [conversationId]);

  const handleConfirmedMessage = useCallback((message: Message) => {
    setConfirmedMessagesByConversation((previousMessages) => {
      const conversationMessages = previousMessages[conversationId] ?? [];
      return {
        ...previousMessages,
        [conversationId]: conversationMessages.some((existingMessage) => existingMessage.id === message.id)
          ? conversationMessages
          : [...conversationMessages, message],
      };
    });
  }, [conversationId]);

  useEffect(() => {
    if (!user?.id) return;

    const applyOutboxEntry = (entry: ChatOutboxEntry) => {
      if (entry.ownerId !== user.id || entry.conversationId !== conversationId) return;
      handleOptimisticMessage({
        id: entry.clientMessageId,
        conversationId: entry.conversationId,
        senderId: user.id,
        content: entry.content,
        contentType: entry.contentType,
        mediaUrl: entry.mediaUrl,
        fileName: entry.fileName,
        fileSize: entry.fileSize,
        replyToId: entry.replyToId,
        status: entry.status === 'failed' ? 'FAILED' : 'SENDING',
        createdAt: entry.createdAt,
      });
    };

    const handleOutboxUpdated = (event: Event) => {
      applyOutboxEntry((event as CustomEvent<ChatOutboxEntry>).detail);
    };
    const handleMessageConfirmed = (event: Event) => {
      const detail = (event as CustomEvent<{ conversationId: string; message: Message }>).detail;
      if (detail?.conversationId !== conversationId || !detail.message) return;
      handleConfirmedMessage(detail.message);
      if (detail.message.clientMessageId) {
        handleOptimisticMessageResolved(detail.message.clientMessageId);
      }
    };

    void listChatOutboxEntries(user.id)
      .then((entries) => entries.forEach(applyOutboxEntry))
      .then(() => drainChatOutbox(user.id))
      .catch((error) => console.error('Could not restore chat outbox:', error));

    window.addEventListener(CHAT_OUTBOX_UPDATED_EVENT, handleOutboxUpdated);
    window.addEventListener(CHAT_MESSAGE_CONFIRMED_EVENT, handleMessageConfirmed);
    return () => {
      window.removeEventListener(CHAT_OUTBOX_UPDATED_EVENT, handleOutboxUpdated);
      window.removeEventListener(CHAT_MESSAGE_CONFIRMED_EVENT, handleMessageConfirmed);
    };
  }, [
    conversationId,
    handleConfirmedMessage,
    handleOptimisticMessage,
    handleOptimisticMessageResolved,
    user?.id,
  ]);

  const handleRetryMessage = useCallback((clientMessageId: string) => {
    void retryChatOutboxEntry(clientMessageId).catch((error) => {
      console.error('Could not retry chat message:', error);
    });
  }, []);

  // Load purchased chat customization packs from inventory
  useEffect(() => {
    const loadChatCustomization = async () => {
      if (!user?.id) return;

      try {
        const inventory = await storeAPI.getMyInventory();
        // Handle case where inventory is undefined or not an array
        const ownedSlugs = Array.isArray(inventory) ? inventory.map((item) => item.itemSlug) : [];
        setChatCustomization(buildChatCustomizationEntitlements(ownedSlugs));
      } catch (error) {
        console.error('Failed to load chat customization packs:', error);
        setChatCustomization(DEFAULT_CHAT_CUSTOMIZATION_ENTITLEMENTS);
      }
    };

    loadChatCustomization();
  }, [user?.id]);

  useEffect(() => {
    if (wallpaper !== 'default' && effectiveWallpaper === 'default') {
      localStorage.setItem(`chat_wallpaper_${conversationId}`, 'default');
    }
  }, [conversationId, effectiveWallpaper, wallpaper]);

  // Save wallpaper preference
  const handleWallpaperChange = (newWallpaper: string) => {
    setWallpapersByConversation((previousWallpapers) => ({
      ...previousWallpapers,
      [conversationId]: newWallpaper,
    }));
    localStorage.setItem(`chat_wallpaper_${conversationId}`, newWallpaper);
  };

  const handleUploadingMessagesChange = useCallback((messages: UploadingMessage[]) => {
    setUploadingMessagesByConversation((previousMessages) => ({
      ...previousMessages,
      [conversationId]: messages,
    }));
  }, [conversationId]);

  // Initialize socket
  useEffect(() => {
    if (user?.id) {
      initializeSocket();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!conversation || !user?.id) return;

    queryClient.setQueryData(conversationQueryKey, conversation);
    writeCachedConversation(user.id, conversation);
  }, [conversation, conversationQueryKey, queryClient, user?.id]);

  const handleBack = () => {
    router.push('/messages');
  };

  const otherUser = conversation?.otherParticipant;

  // Loading state
  if (!conversation && (!user?.id || isLoading)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error state
  if ((isError && !conversation) || !conversation || !otherUser) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load conversation';

    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{errorMessage || 'Conversation not found'}</p>
          <button
            onClick={handleBack}
            className="text-blue-600 hover:underline"
          >
            Go back to messages
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <ChatHeader 
          user={otherUser}
          conversationId={resolvedParams.conversationId}
          onBack={handleBack}
          onInfo={() => setShowSettings(true)}
        />

        {/* Messages */}
        <ChatMessages
          key={resolvedParams.conversationId}
          conversationId={resolvedParams.conversationId}
          currentUserId={user!.id}
          otherUser={otherUser}
          wallpaper={effectiveWallpaper}
          availableReactions={chatCustomization.availableReactions}
          animatedBubbles={chatCustomization.animatedBubbles}
          onReply={(msg) => setReplyTo({ ...msg, conversationId })}
          uploadingMessages={uploadingMessages}
          optimisticMessages={optimisticMessages}
          confirmedMessages={confirmedMessages}
          onLastMessageUpdate={handleLastMessageUpdate}
          onRetryMessage={handleRetryMessage}
        />

        {/* Input */}
        <ChatInput
          key={`input-${resolvedParams.conversationId}`}
          conversationId={resolvedParams.conversationId}
          currentUserId={user!.id}
          replyTo={visibleReplyTo || undefined}
          onCancelReply={() => {
            setReplyTo((previousReply) =>
              previousReply?.conversationId === conversationId ? null : previousReply
            );
          }}
          onUploadingMessagesChange={handleUploadingMessagesChange}
          onOptimisticMessage={handleOptimisticMessage}
          onOptimisticMessageResolved={handleOptimisticMessageResolved}
          onConfirmedMessage={handleConfirmedMessage}
          otherUserId={otherUser.id}
          otherUserName={otherUser.name}
          lastReceivedMessage={lastReceivedMessage}
          enabledMessageEffects={chatCustomization.messageEffects}
        />
      </div>

      {/* Settings Panel */}
      <ChatSettingsPanel
        key={`settings-${resolvedParams.conversationId}`}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        conversationId={resolvedParams.conversationId}
        otherUser={otherUser}
        currentWallpaper={effectiveWallpaper}
        onWallpaperChange={handleWallpaperChange}
        ownedThemePacks={chatCustomization.ownedThemePacks}
        onOpenStore={() => router.push('/store')}
      />
    </>
  );
}
