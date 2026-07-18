'use client';

import { uploadChatMedia, sendMessage, type Message } from '@/lib/api/chat';
import {
  isChatSocketReady,
  sendChatMessage as sendRealtimeChatMessage,
} from '@/lib/socket';

const DATABASE_NAME = 'vormex-chat-outbox';
const DATABASE_VERSION = 1;
const STORE_NAME = 'messages';
const MAX_AUTO_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

export const CHAT_OUTBOX_UPDATED_EVENT = 'vormex:chat-outbox-updated';
export const CHAT_MESSAGE_CONFIRMED_EVENT = 'vormex:chat-message-confirmed';

export type ChatOutboxStatus = 'pending' | 'sending' | 'failed';

export interface ChatOutboxEntry {
  clientMessageId: string;
  ownerId: string;
  conversationId: string;
  content: string;
  contentType: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  replyToId?: string;
  createdAt: string;
  attempts: number;
  status: ChatOutboxStatus;
  nextAttemptAt?: number;
  localFile?: Blob;
  localFileType?: 'image' | 'video' | 'document' | 'audio';
}

type AttemptOptions = {
  manual?: boolean;
  onUploadProgress?: (progress: number) => void;
};

const inFlightAttempts = new Map<string, Promise<Message>>();
const drainTimers = new Map<string, ReturnType<typeof setTimeout>>();

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is unavailable'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'clientMessageId' });
        store.createIndex('ownerId', 'ownerId', { unique: false });
        store.createIndex('ownerConversation', ['ownerId', 'conversationId'], { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open the chat outbox'));
    request.onblocked = () => reject(new Error('Chat outbox database upgrade is blocked'));
  });
}

async function runTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void
): Promise<T> {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let result: T;
    let hasResult = false;
    let settled = false;
    const captureResult = (value: T) => {
      result = value;
      hasResult = true;
    };
    const fail = (reason?: unknown) => {
      if (settled) return;
      settled = true;
      try {
        transaction.abort();
      } catch {
        // The transaction may already have aborted because of the request error.
      }
      database.close();
      reject(reason ?? transaction.error ?? new Error('Chat outbox transaction failed'));
    };

    operation(store, captureResult, fail);
    transaction.onerror = () => fail(transaction.error ?? new Error('Chat outbox transaction failed'));
    transaction.onabort = () => fail(transaction.error ?? new Error('Chat outbox transaction was aborted'));
    transaction.oncomplete = () => {
      database.close();
      if (settled) return;
      settled = true;
      if (hasResult) {
        resolve(result!);
      } else {
        reject(new Error('Chat outbox transaction completed without a result'));
      }
    };
  });
}

function dispatchOutboxUpdate(entry: ChatOutboxEntry): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CHAT_OUTBOX_UPDATED_EVENT, { detail: entry }));
}

function dispatchConfirmedMessage(entry: ChatOutboxEntry, message: Message): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CHAT_MESSAGE_CONFIRMED_EVENT, {
    detail: { conversationId: entry.conversationId, message },
  }));
}

function shouldFallbackToRestSend(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('realtime connection unavailable') ||
    message.includes('not authenticated') ||
    message.includes('socket authentication failed') ||
    message.includes('acknowledgement timed out')
  );
}

function retryDelay(attempts: number): number {
  return Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * (2 ** Math.max(0, attempts - 1)));
}

export async function putChatOutboxEntry(entry: ChatOutboxEntry): Promise<void> {
  await runTransaction<void>('readwrite', (store, resolve, reject) => {
    const request = store.put(entry);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getChatOutboxEntry(clientMessageId: string): Promise<ChatOutboxEntry | undefined> {
  return runTransaction<ChatOutboxEntry | undefined>('readonly', (store, resolve, reject) => {
    const request = store.get(clientMessageId);
    request.onsuccess = () => resolve(request.result as ChatOutboxEntry | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function listChatOutboxEntries(ownerId: string): Promise<ChatOutboxEntry[]> {
  return runTransaction<ChatOutboxEntry[]>('readonly', (store, resolve, reject) => {
    const request = store.index('ownerId').getAll(ownerId);
    request.onsuccess = () => resolve((request.result as ChatOutboxEntry[]).sort(
      (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt)
    ));
    request.onerror = () => reject(request.error);
  });
}

export async function deleteChatOutboxEntry(clientMessageId: string): Promise<void> {
  await runTransaction<void>('readwrite', (store, resolve, reject) => {
    const request = store.delete(clientMessageId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function sendEntry(entry: ChatOutboxEntry, onUploadProgress?: (progress: number) => void): Promise<Message> {
  let activeEntry = entry;

  if (!activeEntry.mediaUrl && activeEntry.localFile && activeEntry.localFileType) {
    const uploadFile = new File(
      [activeEntry.localFile],
      activeEntry.fileName || `attachment-${activeEntry.clientMessageId}`,
      { type: activeEntry.localFile.type || 'application/octet-stream' }
    );
    const upload = await uploadChatMedia(uploadFile, activeEntry.localFileType, onUploadProgress);
    activeEntry = {
      ...activeEntry,
      mediaUrl: upload.mediaUrl,
      mediaType: upload.mediaType,
      fileName: upload.fileName,
      fileSize: upload.fileSize,
    };
    await putChatOutboxEntry(activeEntry);
  }

  const payload = {
    content: activeEntry.content,
    contentType: activeEntry.contentType,
    mediaUrl: activeEntry.mediaUrl,
    mediaType: activeEntry.mediaType,
    fileName: activeEntry.fileName,
    fileSize: activeEntry.fileSize,
    replyToId: activeEntry.replyToId,
    clientMessageId: activeEntry.clientMessageId,
  };

  if (isChatSocketReady()) {
    try {
      return await sendRealtimeChatMessage({
        conversationId: activeEntry.conversationId,
        ...payload,
      });
    } catch (error) {
      if (!shouldFallbackToRestSend(error)) throw error;
    }
  }

  return sendMessage(activeEntry.conversationId, payload);
}

export async function attemptChatOutboxEntry(
  clientMessageId: string,
  options: AttemptOptions = {}
): Promise<Message> {
  const existingAttempt = inFlightAttempts.get(clientMessageId);
  if (existingAttempt) return existingAttempt;

  const attempt = (async () => {
    let entry = await getChatOutboxEntry(clientMessageId);
    if (!entry) throw new Error('Outbox message no longer exists');

    if (!options.manual && entry.attempts >= MAX_AUTO_ATTEMPTS) {
      throw new Error('Automatic retry limit reached');
    }

    if (options.manual && entry.attempts >= MAX_AUTO_ATTEMPTS) {
      entry = { ...entry, attempts: 0, nextAttemptAt: undefined };
    }

    const sendingEntry: ChatOutboxEntry = {
      ...entry,
      status: 'sending',
      attempts: entry.attempts + 1,
      nextAttemptAt: undefined,
    };
    await putChatOutboxEntry(sendingEntry);
    dispatchOutboxUpdate(sendingEntry);

    try {
      const message = await sendEntry(sendingEntry, options.onUploadProgress);
      await deleteChatOutboxEntry(clientMessageId);
      dispatchConfirmedMessage(sendingEntry, message);
      return message;
    } catch (error) {
      const failedEntry: ChatOutboxEntry = {
        ...(await getChatOutboxEntry(clientMessageId) ?? sendingEntry),
        status: 'failed',
        attempts: sendingEntry.attempts,
        nextAttemptAt: Date.now() + retryDelay(sendingEntry.attempts),
      };
      await putChatOutboxEntry(failedEntry);
      dispatchOutboxUpdate(failedEntry);
      if (failedEntry.attempts < MAX_AUTO_ATTEMPTS) {
        scheduleChatOutboxDrain(failedEntry.ownerId);
      }
      throw error;
    }
  })();

  inFlightAttempts.set(clientMessageId, attempt);
  try {
    return await attempt;
  } finally {
    inFlightAttempts.delete(clientMessageId);
  }
}

export async function retryChatOutboxEntry(clientMessageId: string): Promise<Message> {
  const entry = await getChatOutboxEntry(clientMessageId);
  if (!entry) throw new Error('This failed message is no longer available to retry');
  const pendingEntry: ChatOutboxEntry = {
    ...entry,
    status: 'pending',
    attempts: entry.attempts >= MAX_AUTO_ATTEMPTS ? 0 : entry.attempts,
    nextAttemptAt: undefined,
  };
  await putChatOutboxEntry(pendingEntry);
  dispatchOutboxUpdate(pendingEntry);
  return attemptChatOutboxEntry(clientMessageId, { manual: true });
}

export async function drainChatOutbox(ownerId: string): Promise<void> {
  if (!ownerId) return;
  const now = Date.now();
  const entries = await listChatOutboxEntries(ownerId);
  const eligibleEntries = entries.filter(
    (entry) => entry.attempts < MAX_AUTO_ATTEMPTS && (entry.nextAttemptAt ?? 0) <= now
  );

  await Promise.allSettled(
    eligibleEntries.map((entry) => attemptChatOutboxEntry(entry.clientMessageId))
  );
  scheduleChatOutboxDrain(ownerId);
}

export async function scheduleChatOutboxDrain(ownerId: string): Promise<void> {
  const existingTimer = drainTimers.get(ownerId);
  if (existingTimer) clearTimeout(existingTimer);

  const entries = await listChatOutboxEntries(ownerId);
  const retryable = entries.filter((entry) => entry.attempts < MAX_AUTO_ATTEMPTS);
  if (retryable.length === 0) {
    drainTimers.delete(ownerId);
    return;
  }

  const nextAttemptAt = Math.min(...retryable.map((entry) => entry.nextAttemptAt ?? Date.now()));
  const timer = setTimeout(() => {
    drainTimers.delete(ownerId);
    void drainChatOutbox(ownerId);
  }, Math.max(0, nextAttemptAt - Date.now()));
  drainTimers.set(ownerId, timer);
}
