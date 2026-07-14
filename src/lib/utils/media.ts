import { BACKEND_ORIGIN } from './constants';

export function resolveMediaUrl(mediaUrl?: string | null): string | null {
  const trimmed = mediaUrl?.trim();

  if (
    !trimmed ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed === 'about:blank'
  ) {
    return null;
  }

  if (/^(https?:|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    if (/^https?:\/\//i.test(BACKEND_ORIGIN)) {
      return `${BACKEND_ORIGIN}${trimmed}`;
    }

    if (process.env.NODE_ENV !== 'production') {
      // Previous local backend: `http://localhost:5000${trimmed}`
      return `https://vormex-backend.onrender.com${trimmed}`;
    }

    return trimmed;
  }

  if (/^(uploads|profiles|avatars|images)\//i.test(trimmed)) {
    if (/^https?:\/\//i.test(BACKEND_ORIGIN)) {
      return `${BACKEND_ORIGIN}/${trimmed}`;
    }

    if (process.env.NODE_ENV !== 'production') {
      // Previous local backend: `http://localhost:5000/${trimmed}`
      return `https://vormex-backend.onrender.com/${trimmed}`;
    }
  }

  return null;
}
