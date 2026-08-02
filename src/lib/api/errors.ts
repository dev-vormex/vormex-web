export type StructuredApiError = {
  status?: number;
  code?: string;
  retryable?: boolean;
  message: string;
};

export function getStructuredApiError(error: unknown): StructuredApiError {
  const candidate = error as {
    message?: string;
    status?: number;
    code?: string;
    retryable?: boolean;
    response?: {
      status?: number;
      data?: { error?: string; message?: string; code?: string; retryable?: boolean };
    };
  };
  const data = candidate?.response?.data;
  const code = candidate?.code ?? data?.code;
  const retryable = code === 'user_blocked' || code === 'resource_unavailable'
    ? false
    : candidate?.retryable ?? data?.retryable;
  return {
    status: candidate?.status ?? candidate?.response?.status,
    code,
    retryable,
    message: data?.error || data?.message || candidate?.message || 'Request failed',
  };
}

export function isTerminalSafetyError(error: unknown): boolean {
  const structured = getStructuredApiError(error);
  return structured.retryable === false ||
    structured.code === 'user_blocked' ||
    structured.code === 'resource_unavailable';
}
