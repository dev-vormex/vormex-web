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

  // Production uses the same-origin Next.js rewrite so HttpOnly auth cookies
  // stay first-party. Local development can override this in .env.local.
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

  // Previous local-development socket fallback:
  // if (process.env.NODE_ENV !== 'production') return 'http://localhost:5000';
  return 'https://vormex-backend.onrender.com';
}

export const SOCKET_URL = resolveSocketUrl();
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
