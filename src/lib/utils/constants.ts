function normalizeApiUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function normalizeOriginUrl(input: string): string {
  return input.trim().replace(/\/+$/, '');
}

function isAbsoluteUrl(input: string): boolean {
  return /^https?:\/\//i.test(input.trim());
}

function resolveApiUrl(): string {
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (publicApiUrl) {
    return normalizeApiUrl(publicApiUrl);
  }

  const publicBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (publicBackendUrl) {
    return normalizeApiUrl(publicBackendUrl);
  }

  // Fall back to same-origin /api so local production builds and reverse-proxy deployments
  // do not crash just because a public backend env var is absent.
  return '/api';
}

export const API_URL = resolveApiUrl();
export const BACKEND_ORIGIN = API_URL.replace(/\/api$/, '');

function resolveSocketUrl(): string {
  const explicitSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (explicitSocketUrl) {
    return normalizeOriginUrl(explicitSocketUrl);
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (backendUrl && isAbsoluteUrl(backendUrl)) {
    return normalizeOriginUrl(backendUrl);
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && isAbsoluteUrl(apiUrl)) {
    return normalizeOriginUrl(apiUrl.replace(/\/api\/?$/, ''));
  }

  // In local development we often proxy REST through Next `/api` rewrites, but
  // Socket.IO still needs the actual backend origin because websocket upgrades
  // are not served by the frontend dev server.
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:5000';
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return isAbsoluteUrl(BACKEND_ORIGIN) ? BACKEND_ORIGIN : '';
}

export const SOCKET_URL = resolveSocketUrl();
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
