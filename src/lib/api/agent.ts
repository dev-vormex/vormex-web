import apiClient from './client';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface AgentUiIntent {
  type: string;
  tab?: string;
  userId?: string;
  conversationId?: string;
  groupId?: string;
  route?: string;
  label?: string;
  prefillText?: string;
  payload?: Record<string, unknown> | null;
}

export interface AgentActionRecord {
  type: string;
  toolName: string;
  status: 'executed' | 'suggested' | 'blocked';
  title: string;
  summary: string;
  pendingActionId?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  uiIntents?: AgentUiIntent[];
  payload?: Record<string, unknown> | null;
}

export interface AgentPendingActionSummary {
  id: string;
  sessionId: string;
  userId: string;
  toolName: string;
  actionType: string;
  title: string;
  summary: string;
  input?: Record<string, unknown> | null;
  status: string;
  context?: Record<string, unknown> | null;
  createdAt: string;
  expiresAt: string;
  resolvedAt?: string | null;
}

export interface AgentSessionSummary {
  sessionId: string;
  status: string;
  mode: string;
  currentSurface?: string | null;
  memorySummary?: string | null;
  allowAutonomousActions: boolean;
  lastResponseId?: string | null;
}

export interface AgentSessionResponse {
  sessionId: string;
  mode: string;
  sessionState: AgentSessionSummary;
}

export interface AgentTurnResponse {
  assistantMessage: string;
  executedActions: AgentActionRecord[];
  suggestedActions: AgentActionRecord[];
  uiIntents: AgentUiIntent[];
  pendingActions?: AgentPendingActionSummary[];
  memorySummary?: string | null;
  sessionState: AgentSessionSummary;
}

export interface SendAgentMessageParams {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  sessionId?: string | null;
  surface?: string;
  surfaceContext?: Record<string, unknown>;
  allowAutonomousActions?: boolean;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getAgentErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string; code?: string }; status?: number } }).response;
    const message = response?.data?.error;

    if (response?.status === 403) {
      return message || 'Vormex AI Agent is not enabled for this account yet.';
    }

    if (message) {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Vormex AI is unavailable right now. Please try again shortly.';
}

export async function createOrResumeAgentSession(params: {
  sessionId?: string | null;
  mode?: string;
  surface?: string;
  allowAutonomousActions?: boolean;
  metadata?: Record<string, unknown>;
} = {}): Promise<AgentSessionResponse> {
  return apiClient.post('/agent/sessions', {
    mode: params.mode || 'assistant',
    surface: params.surface || 'global',
    allowAutonomousActions: params.allowAutonomousActions ?? true,
    metadata: params.metadata || {},
    ...(params.sessionId ? { sessionId: params.sessionId } : {}),
  }) as Promise<AgentSessionResponse>;
}

export async function runAgentTurn(
  sessionId: string,
  params: {
    inputText: string;
    surface?: string;
    surfaceContext?: Record<string, unknown>;
    allowAutonomousActions?: boolean;
  }
): Promise<AgentTurnResponse> {
  return apiClient.post(`/agent/sessions/${sessionId}/turns`, {
    inputText: params.inputText,
    surface: params.surface || 'global',
    surfaceContext: params.surfaceContext || {},
    allowAutonomousActions: params.allowAutonomousActions ?? true,
  }) as Promise<AgentTurnResponse>;
}

/**
 * Compatibility helper for older callers. Creates/resumes a session, then runs one turn.
 */
export async function sendAgentMessage(
  params: SendAgentMessageParams
): Promise<AgentTurnResponse> {
  const session = await createOrResumeAgentSession({
    sessionId: params.sessionId,
    surface: params.surface,
    allowAutonomousActions: params.allowAutonomousActions,
    metadata: {
      source: 'web_agent_panel',
      conversationHistory: params.conversationHistory || [],
    },
  });

  return runAgentTurn(session.sessionId, {
    inputText: params.message,
    surface: params.surface,
    surfaceContext: params.surfaceContext,
    allowAutonomousActions: params.allowAutonomousActions,
  });
}
