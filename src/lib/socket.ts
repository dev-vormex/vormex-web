// Socket.IO Client for Real-time Features

import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/lib/utils/constants';
import type { ChatUser, Message } from '@/lib/api/chat';

let socket: Socket | null = null;
let lifecycleHandlersRegistered = false;
let socketAuthenticated = false;
const joinedChatRooms = new Set<string>();
let feedRoomJoined = false;
const CHAT_CONNECT_GRACE_MS = 1500;
const CHAT_AUTH_GRACE_MS = 2500;
const CHAT_SEND_ACK_TIMEOUT_MS = 8000;

// Reaction types matching backend enum
export type ReactionType = 'LIKE' | 'CELEBRATE' | 'SUPPORT' | 'INSIGHTFUL' | 'CURIOUS';

export interface ReactionSummary {
  type: ReactionType;
  count: number;
}

type SocketObject = Record<string, unknown>;

export interface SocketEventHandlers {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: { message: string }) => void;
  
  // Post events
  onPostCreated?: (data: { post: unknown }) => void;
  onPostLiked?: (data: { 
    postId: string; 
    userId: string; 
    liked: boolean; 
    likesCount: number;
    reactionType?: ReactionType | null;
    reactionSummary?: ReactionSummary[];
  }) => void;
  onPostReacted?: (data: { 
    postId: string; 
    userId: string; 
    liked: boolean; 
    reactionType: ReactionType | null;
    likesCount: number;
    reactionSummary: ReactionSummary[];
  }) => void;
  
  // Comment events
  onCommentCreated?: (data: { postId: string; comment: unknown; commentsCount: number }) => void;
  onCommentLiked?: (data: { commentId: string; userId: string; liked: boolean; likesCount: number }) => void;
  
  // Poll events
  onPollUpdated?: (data: { 
    postId: string; 
    pollOptions: unknown[];
    voterId: string;
    votedOptionId?: string;
    totalVotes?: number;
  }) => void;
  
  // Notification events
  onNotificationComment?: (data: SocketObject) => void;
  onNotificationMention?: (data: SocketObject) => void;
  onNotificationLike?: (data: SocketObject) => void;
  onNotificationReaction?: (data: SocketObject) => void;
  onNotificationCommentLike?: (data: SocketObject) => void;
  
  // User events
  onUserOnline?: (data: { userId: string }) => void;
  onUserOffline?: (data: { userId: string }) => void;
  onUserLocationChanged?: (data: { userId: string; city: string; state: string; country: string }) => void;
  
  // Location request
  onLocationRequest?: (data: { message: string; timestamp: Date }) => void;
  
  // Story events
  onStoryCreated?: (data: { story: unknown; author: unknown; timestamp: Date }) => void;
  onStoryDeleted?: (data: { storyId: string; authorId: string; timestamp: Date }) => void;
  onStoryViewed?: (data: { storyId: string; viewerId: string; viewCount: number; timestamp: Date }) => void;
  onStoryReaction?: (data: { storyId: string; user: unknown; reaction: string; reactionCount: number; timestamp: Date }) => void;
  onStoryReply?: (data: { storyId: string; reply: unknown; timestamp: Date }) => void;
  
  // Chat events
  onChatNewMessage?: (data: { conversationId: string; message: Message }) => void;
  onChatNotification?: (data: { type: string; conversationId: string; message: Message; sender: ChatUser }) => void;
  onChatUserTyping?: (data: { conversationId: string; userId: string; isTyping: boolean }) => void;
  onChatMessagesDelivered?: (data: { conversationId: string; deliveredAt: Date }) => void;
  onChatMessagesRead?: (data: { conversationId: string; readBy: string; readAt: Date }) => void;
  onChatMessageDeleted?: (data: { messageId: string; conversationId: string; deletedBy?: string; forEveryone: boolean }) => void;
  onChatMessageEdited?: (data: { messageId: string; conversationId: string; content: string; editedAt: Date }) => void;
  onChatMessageReaction?: (data: { messageId: string; conversationId: string; userId: string; emoji: string; action: string }) => void;
  onChatMessageDelivered?: (data: { messageId: string; deliveredAt: Date }) => void;
  
  // Reel events
  onReelEngagementUpdate?: (data: { 
    reelId: string; 
    type: 'like' | 'comment' | 'share'; 
    userId?: string;
    liked?: boolean;
    likesCount?: number;
    commentsCount?: number;
    sharesCount?: number;
    comment?: { id: string; author: unknown; content: string; parentId?: string };
  }) => void;
  
  // New notification event
  onNotificationNew?: (data: {
    id: string;
    type: string;
    title: string;
    body: string;
    actor: unknown;
    post?: unknown;
    reel?: unknown;
    data: SocketObject;
    isRead: boolean;
    createdAt: string;
  }) => void;
}

export interface ChatSendPayload {
  conversationId: string;
  content: string;
  contentType?: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  replyToId?: string;
  clientMessageId?: string;
}

interface ChatSendAck {
  ok?: boolean;
  message?: Message;
  error?: string;
}

function waitForSocketConnect(
  sock: Socket,
  timeoutMs = CHAT_CONNECT_GRACE_MS
): Promise<boolean> {
  if (sock.connected) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;

    function finish(connected: boolean) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      sock.off('connect', handleConnect);
      sock.off('connect_error', handleConnectError);
      resolve(connected);
    }

    function handleConnect() {
      finish(true);
    }

    function handleConnectError() {
      finish(false);
    }

    const timer = setTimeout(() => finish(false), timeoutMs);

    sock.once('connect', handleConnect);
    sock.once('connect_error', handleConnectError);
    sock.connect();
  });
}

function waitForSocketReady(
  sock: Socket,
  timeoutMs = CHAT_AUTH_GRACE_MS
): Promise<boolean> {
  if (sock.connected && socketAuthenticated) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;

    function finish(ready: boolean) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      sock.off('socket:authenticated', handleAuthenticated);
      sock.off('socket:unauthenticated', handleUnauthenticated);
      sock.off('connect_error', handleConnectError);
      sock.off('disconnect', handleDisconnect);
      resolve(ready);
    }

    function handleAuthenticated() {
      socketAuthenticated = true;
      finish(true);
    }

    function handleUnauthenticated() {
      socketAuthenticated = false;
      finish(false);
    }

    function handleConnectError() {
      socketAuthenticated = false;
      finish(false);
    }

    function handleDisconnect() {
      socketAuthenticated = false;
      finish(false);
    }

    const timer = setTimeout(() => finish(false), timeoutMs);

    sock.once('socket:authenticated', handleAuthenticated);
    sock.once('socket:unauthenticated', handleUnauthenticated);
    sock.once('connect_error', handleConnectError);
    sock.once('disconnect', handleDisconnect);

    if (!sock.connected) {
      sock.connect();
    } else if (socketAuthenticated) {
      finish(true);
    }
  });
}

function ensureSocketLifecycle(sock: Socket): void {
  if (lifecycleHandlersRegistered) {
    return;
  }

  lifecycleHandlersRegistered = true;

  sock.on('connect', () => {
    socketAuthenticated = false;
    console.log('✅ Socket connected:', sock.id);

    if (feedRoomJoined) {
      sock.emit('feed:join');
    }
  });

  sock.on('socket:authenticated', () => {
    socketAuthenticated = true;
    joinedChatRooms.forEach((conversationId) => {
      sock.emit('chat:join', { conversationId });
    });
  });

  sock.on('socket:unauthenticated', () => {
    socketAuthenticated = false;
  });

  sock.on('disconnect', (reason) => {
    socketAuthenticated = false;
    console.log('❌ Socket disconnected:', reason);
  });

  sock.on('connect_error', (error) => {
    const message = (error?.message || '').toLowerCase();
    if (message.includes('timeout')) {
      console.warn('Socket connection timeout. Verify backend is running on:', SOCKET_URL);
      return;
    }
    console.error('Socket connection error:', error);
  });
}

function bindSocketHandler<T extends (...args: never[]) => void>(
  sock: Socket,
  event: string,
  handler?: T
): void {
  if (!handler) {
    return;
  }

  const listener = handler as unknown as (...args: unknown[]) => void;
  sock.off(event, listener);
  sock.on(event, listener);
}

function getOrCreateSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.25,
      timeout: 10000,
    });
    ensureSocketLifecycle(socket);
  } else {
    if (!socket.connected) {
      socket.connect();
    }
  }

  return socket;
}

/**
 * Initialize Socket.IO connection
 */
export function initializeSocket(handlers?: SocketEventHandlers): Socket {
  const sock = getOrCreateSocket();

  if (handlers) {
    registerSocketHandlers(sock, handlers);
  }

  return sock;
}

/**
 * True only when chat can be sent over realtime without any connect/auth wait.
 */
export function isChatSocketReady(): boolean {
  return Boolean(socket?.connected && socketAuthenticated);
}

/**
 * Register event handlers on an existing socket connection
 */
function registerSocketHandlers(sock: Socket, handlers: SocketEventHandlers): void {
  bindSocketHandler(sock, 'connect', handlers.onConnect);
  bindSocketHandler(sock, 'disconnect', handlers.onDisconnect);

  bindSocketHandler(sock, 'error', handlers.onError);

  bindSocketHandler(sock, 'post:created', handlers.onPostCreated);
  bindSocketHandler(sock, 'post:liked', handlers.onPostLiked);
  bindSocketHandler(sock, 'post:reacted', handlers.onPostReacted);
  bindSocketHandler(sock, 'comment:created', handlers.onCommentCreated);
  bindSocketHandler(sock, 'comment:liked', handlers.onCommentLiked);
  bindSocketHandler(sock, 'poll:updated', handlers.onPollUpdated);
  bindSocketHandler(sock, 'notification:comment', handlers.onNotificationComment);
  bindSocketHandler(sock, 'notification:reaction', handlers.onNotificationReaction);
  bindSocketHandler(sock, 'notification:mention', handlers.onNotificationMention);
  bindSocketHandler(sock, 'notification:like', handlers.onNotificationLike);
  bindSocketHandler(sock, 'notification:comment_like', handlers.onNotificationCommentLike);
  bindSocketHandler(sock, 'user:online', handlers.onUserOnline);
  bindSocketHandler(sock, 'user:offline', handlers.onUserOffline);
  bindSocketHandler(sock, 'user:location_changed', handlers.onUserLocationChanged);
  bindSocketHandler(sock, 'location:request', handlers.onLocationRequest);
  bindSocketHandler(sock, 'story:created', handlers.onStoryCreated);
  bindSocketHandler(sock, 'story:deleted', handlers.onStoryDeleted);
  bindSocketHandler(sock, 'story:viewed', handlers.onStoryViewed);
  bindSocketHandler(sock, 'story:reaction', handlers.onStoryReaction);
  bindSocketHandler(sock, 'story:reply', handlers.onStoryReply);
  bindSocketHandler(sock, 'chat:new_message', handlers.onChatNewMessage);
  bindSocketHandler(sock, 'chat:notification', handlers.onChatNotification);
  bindSocketHandler(sock, 'chat:user_typing', handlers.onChatUserTyping);
  bindSocketHandler(sock, 'chat:messages_delivered', handlers.onChatMessagesDelivered);
  bindSocketHandler(sock, 'chat:messages_read', handlers.onChatMessagesRead);
  bindSocketHandler(sock, 'chat:message_deleted', handlers.onChatMessageDeleted);
  bindSocketHandler(sock, 'chat:message_edited', handlers.onChatMessageEdited);
  bindSocketHandler(sock, 'chat:message_reaction', handlers.onChatMessageReaction);
  bindSocketHandler(sock, 'chat:message_delivered', handlers.onChatMessageDelivered);
  bindSocketHandler(sock, 'reel:engagement_update', handlers.onReelEngagementUpdate);
  bindSocketHandler(sock, 'notification:new', handlers.onNotificationNew);
}

/**
 * Get the current socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Remove specific event handlers from the socket
 */
export function removeSocketHandlers(eventNames: string[]): void {
  if (!socket) return;
  eventNames.forEach(event => {
    socket?.off(event);
  });
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    lifecycleHandlersRegistered = false;
    socketAuthenticated = false;
    joinedChatRooms.clear();
  }
}

/**
 * Join a post room for real-time updates
 */
export function joinPostRoom(postId: string): void {
  socket?.emit('post:join', { postId });
}

/**
 * Leave a post room
 */
export function leavePostRoom(postId: string): void {
  socket?.emit('post:leave', { postId });
}

/**
 * Join the global feed room for scalable post fanout
 */
export function joinFeedRoom(): void {
  feedRoomJoined = true;
  getOrCreateSocket().emit('feed:join');
}

/**
 * Leave the global feed room
 */
export function leaveFeedRoom(): void {
  feedRoomJoined = false;
  getOrCreateSocket().emit('feed:leave');
}

/**
 * Like/Unlike a post via WebSocket (legacy, uses default LIKE reaction)
 */
export function likePost(postId: string): void {
  socket?.emit('post:like', { postId });
}

/**
 * React to a post via WebSocket with specific reaction type
 */
export function reactToPost(postId: string, reactionType: ReactionType): void {
  socket?.emit('post:react', { postId, reactionType });
}

/**
 * Create a comment via WebSocket
 */
export function createComment(
  postId: string,
  content: string,
  parentId?: string,
  mentions?: string[]
): void {
  socket?.emit('post:comment', { postId, content, parentId, mentions });
}

/**
 * Like/Unlike a comment via WebSocket
 */
export function likeComment(commentId: string, postId: string): void {
  socket?.emit('comment:like', { commentId, postId });
}

/**
 * Vote on a poll via WebSocket
 */
export function votePoll(postId: string, optionId: string): void {
  socket?.emit('poll:vote', { postId, optionId });
}

/**
 * Update location via WebSocket
 */
export function updateLocation(data: {
  lat?: number;
  lng?: number;
  accuracy?: number;
  activity?: string;
}): void {
  socket?.emit('location:update', data);
}

/**
 * Send typing indicator (for future use)
 */
export function sendTypingIndicator(postId: string, isTyping: boolean): void {
  socket?.emit('typing', { postId, isTyping });
}

// ============================================
// CHAT SOCKET FUNCTIONS
// ============================================

/**
 * Join a chat conversation room
 */
export function joinChatRoom(conversationId: string): void {
  joinedChatRooms.add(conversationId);
  const sock = getOrCreateSocket();
  if (sock.connected && socketAuthenticated) {
    sock.emit('chat:join', { conversationId });
  }
}

/**
 * Leave a chat conversation room
 */
export function leaveChatRoom(conversationId: string): void {
  joinedChatRooms.delete(conversationId);
  if (socket?.connected && socketAuthenticated) {
    socket.emit('chat:leave', { conversationId });
  }
}

/**
 * Send a chat message via WebSocket
 */
export async function sendChatMessage(data: ChatSendPayload): Promise<Message> {
  const sock = getOrCreateSocket();
  const connected = await waitForSocketConnect(sock);
  const ready = connected && (await waitForSocketReady(sock));

  if (!ready) {
    throw new Error('Realtime connection unavailable');
  }

  return new Promise((resolve, reject) => {
    sock.timeout(CHAT_SEND_ACK_TIMEOUT_MS).emit(
      'chat:send_message',
      data,
      (error: Error | null, response?: ChatSendAck) => {
        if (error) {
          reject(new Error('Realtime send acknowledgement timed out'));
          return;
        }

        if (response?.ok && response.message) {
          resolve(response.message);
          return;
        }

        reject(new Error(response?.error || 'Failed to send message'));
      }
    );
  });
}

/**
 * Send typing indicator for chat
 */
export function sendChatTyping(conversationId: string, isTyping: boolean): void {
  const sock = getOrCreateSocket();
  if (sock.connected && socketAuthenticated) {
    sock.emit('chat:typing', { conversationId, isTyping });
  }
}

/**
 * Mark chat messages as read
 */
export function markChatAsRead(conversationId: string): void {
  const sock = getOrCreateSocket();
  if (sock.connected && socketAuthenticated) {
    sock.emit('chat:mark_read', { conversationId });
  }
}

/**
 * Delete a chat message
 */
export function deleteChatMessage(messageId: string, conversationId: string, forEveryone?: boolean): void {
  getOrCreateSocket().emit('chat:delete_message', { messageId, conversationId, forEveryone });
}

/**
 * Edit a chat message
 */
export function editChatMessage(messageId: string, conversationId: string, content: string): void {
  getOrCreateSocket().emit('chat:edit_message', { messageId, conversationId, content });
}

/**
 * React to a chat message
 */
export function reactToChatMessage(messageId: string, conversationId: string, emoji: string): void {
  getOrCreateSocket().emit('chat:react', { messageId, conversationId, emoji });
}

// ============================================
// REEL SOCKET FUNCTIONS
// ============================================

/**
 * Join a reel room for real-time updates
 */
export function joinReelRoom(reelId: string): void {
  socket?.emit('reel:join', { reelId });
}

/**
 * Leave a reel room
 */
export function leaveReelRoom(reelId: string): void {
  socket?.emit('reel:leave', { reelId });
}

/**
 * Like a reel via WebSocket
 */
export function likeReel(reelId: string): void {
  socket?.emit('reel:like', { reelId });
}

/**
 * Create a reel comment via WebSocket
 */
export function createReelComment(
  reelId: string,
  content: string,
  parentId?: string,
  mentions?: string[]
): void {
  socket?.emit('reel:comment', { reelId, content, parentId, mentions });
}

// ============================================
// ARCADE SOCKET FUNCTIONS
// ============================================

/**
 * Join a social arcade room for live updates.
 */
export function joinArcadeRoomSocket(data: { roomId?: string; inviteCode?: string }): void {
  getOrCreateSocket().emit('arcade:join_room', data);
}

/**
 * Leave a social arcade room without abandoning the persisted room.
 */
export function leaveArcadeRoomSocket(roomId: string): void {
  getOrCreateSocket().emit('arcade:leave_room', { roomId });
}

/**
 * Toggle ready state over Socket.IO.
 */
export function sendArcadeReady(roomId: string, ready: boolean): void {
  getOrCreateSocket().emit('arcade:ready', { roomId, ready });
}

/**
 * Send gameplay input or compact state snapshots to the current arcade room.
 */
export function sendArcadeInput(roomId: string, type: string, data: unknown): void {
  getOrCreateSocket().emit('arcade:input', { roomId, type, data });
}

const socketApi = {
  initializeSocket,
  getSocket,
  disconnectSocket,
  joinPostRoom,
  leavePostRoom,
  joinFeedRoom,
  leaveFeedRoom,
  likePost,
  createComment,
  likeComment,
  votePoll,
  updateLocation,
  sendTypingIndicator,
  // Chat functions
  joinChatRoom,
  leaveChatRoom,
  sendChatMessage,
  sendChatTyping,
  markChatAsRead,
  deleteChatMessage,
  editChatMessage,
  reactToChatMessage,
  // Reel functions
  joinReelRoom,
  leaveReelRoom,
  likeReel,
  createReelComment,
  joinArcadeRoomSocket,
  leaveArcadeRoomSocket,
  sendArcadeInput,
  sendArcadeReady,
};

export default socketApi;
