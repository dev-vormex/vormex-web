import { AxiosError } from 'axios';
import type { ApiError } from '@/types/auth';

function formatRetryAfter(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError | undefined;
    if (apiError?.error) {
      if (apiError.retryAfterSeconds && apiError.retryAfterSeconds > 0) {
        return `${apiError.error} Try again in ${formatRetryAfter(apiError.retryAfterSeconds)}.`;
      }
      return apiError.error;
    }
    if (error.response?.status === 401) {
      return 'Unauthorized. Please login again.';
    }
    if (error.response?.status === 403) {
      return 'Email verification required. Please check your inbox.';
    }
    if (error.response?.status === 404) {
      return 'Resource not found.';
    }
    if (error.response?.status === 500) {
      return 'Server error. Please try again later.';
    }
    return error.message || 'An unexpected error occurred';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

