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
      return `http://localhost:5000${trimmed}`;
    }

    return trimmed;
  }

  return null;
}
