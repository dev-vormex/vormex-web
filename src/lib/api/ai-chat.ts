import { AxiosError } from 'axios';
import apiClient from './client';

// ============================================
// Types
// ============================================

export interface ConversationStartersResponse {
  starters: string[];
}

export interface RevivalSuggestionsResponse {
  suggestions: string[];
}

export interface GrammarFixResponse {
  original: string;
  corrected: string;
  changes: string[];
}

export interface SmartRepliesResponse {
  replies: string[];
}

export interface ToneChangeResponse {
  original: string;
  transformed: string;
  tone: string;
}

export interface TranslationResponse {
  original: string;
  translated: string;
  targetLanguage: string;
}

export interface ExpansionResponse {
  original: string;
  expanded: string;
}

export interface CareerChatHistoryItem {
  content: string;
  role: 'user' | 'assistant';
}

export interface CareerChatResponse {
  reply: string;
}

export interface AIErrorPayload {
  code?: string;
  error?: string;
  requestId?: string;
  retryAfterSeconds?: number;
}

export type ToneType = 'professional' | 'casual' | 'friendly' | 'formal' | 'enthusiastic' | 'concise';
export type LanguageType = 'english' | 'hindi' | 'telugu' | 'hinglish' | 'tenglish';

export class AIAPIError extends Error {
  readonly code?: string;
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;
  readonly status?: number;

  constructor(
    message: string,
    options: {
      code?: string;
      requestId?: string;
      retryAfterSeconds?: number;
      status?: number;
    } = {}
  ) {
    super(message);
    this.name = 'AIAPIError';
    this.code = options.code;
    this.requestId = options.requestId;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.status = options.status;
  }
}

function normalizeAIError(error: unknown): AIAPIError {
  if (error instanceof AIAPIError) {
    return error;
  }

  if (error instanceof AxiosError) {
    const axiosError = error as AxiosError<AIErrorPayload>;
    const payload = axiosError.response?.data;
    return new AIAPIError(payload?.error || axiosError.message || 'AI request failed.', {
      code: payload?.code,
      requestId: payload?.requestId,
      retryAfterSeconds: payload?.retryAfterSeconds,
      status: axiosError.response?.status,
    });
  }

  if (error instanceof Error) {
    return new AIAPIError(error.message);
  }

  return new AIAPIError('AI request failed.');
}

async function postAIRequest<T>(path: string, body: unknown): Promise<T> {
  try {
    return (await apiClient.post(path, body)) as T;
  } catch (error) {
    throw normalizeAIError(error);
  }
}

export function getAIErrorMessage(
  error: unknown,
  fallbackMessage: string = 'I apologize, but I encountered an issue. Please try again later.'
): string {
  const normalizedError = normalizeAIError(error);

  if (normalizedError.code === 'ai_not_configured') {
    return normalizedError.message || 'AI is not configured on the backend.';
  }

  if (normalizedError.status === 429) {
    return normalizedError.retryAfterSeconds
      ? `AI is cooling down. Please try again in ${normalizedError.retryAfterSeconds} seconds.`
      : 'AI is cooling down. Please try again in a moment.';
  }

  if (normalizedError.status === 503) {
    return 'AI is temporarily busy. Please try again shortly.';
  }

  return normalizedError.message || fallbackMessage;
}

// ============================================
// AI Chat API Functions
// ============================================

/**
 * Get personalized conversation starters based on both users' profiles
 */
export async function getConversationStarters(
  otherUserId: string
): Promise<ConversationStartersResponse> {
  return postAIRequest('/ai/chat/conversation-starters', { otherUserId });
}

/**
 * Get suggestions to continue a stalled conversation
 */
export async function getChatRevivalSuggestions(
  conversationId: string,
  otherUserId: string
): Promise<RevivalSuggestionsResponse> {
  return postAIRequest('/ai/chat/revival-suggestions', {
    conversationId,
    otherUserId,
  });
}

/**
 * Fix grammar and spelling in a message
 */
export async function fixGrammar(
  message: string,
  context?: string
): Promise<GrammarFixResponse> {
  return postAIRequest('/ai/chat/fix-grammar', { message, context });
}

/**
 * Get smart reply suggestions based on the last message
 */
export async function getSmartReplies(
  lastMessage: string,
  conversationId?: string
): Promise<SmartRepliesResponse> {
  return postAIRequest('/ai/chat/smart-replies', {
    lastMessage,
    conversationId,
  });
}

/**
 * Change the tone of a message
 */
export async function changeTone(
  message: string,
  tone: ToneType
): Promise<ToneChangeResponse> {
  return postAIRequest('/ai/chat/change-tone', { message, tone });
}

/**
 * Translate a message to another language
 */
export async function translateMessage(
  message: string,
  targetLanguage: LanguageType
): Promise<TranslationResponse> {
  return postAIRequest('/ai/chat/translate', { message, targetLanguage });
}

/**
 * Expand a short message into a more detailed one
 */
export async function expandMessage(
  message: string,
  context?: 'professional' | 'casual'
): Promise<ExpansionResponse> {
  return postAIRequest('/ai/chat/expand', { message, context });
}

export async function sendCareerChatMessage(
  message: string,
  conversationHistory: CareerChatHistoryItem[]
): Promise<CareerChatResponse> {
  return postAIRequest('/ai/chat/career-chat', {
    message,
    conversationHistory,
  });
}
