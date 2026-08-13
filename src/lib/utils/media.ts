import { BACKEND_ORIGIN } from './constants';

/** Same-origin route that re-serves images we cannot hotlink. */
export const IMAGE_PROXY_PATH = '/media/image';

/**
 * Hosts that stop serving images once a page asks for a lot of them at once.
 * Google is the one that bites: a Find People grid requests 20+ avatars in a
 * single burst, Google answers those with a non-image response, and Chrome
 * reports every one as net::ERR_BLOCKED_BY_ORB — so each card silently falls
 * back to its initial. Server-side fetches of the very same URLs still return
 * `200 image/jpeg`, so re-serving them from our own origin keeps them
 * first-party, cacheable, and out of Google's per-client burst limit.
 */
const HOTLINK_HOSTILE_HOSTS = [/(?:^|\.)googleusercontent\.com$/i];

/** Kept in sync with the proxy route's allowlist. */
export function isHotlinkHostileImage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && HOTLINK_HOSTILE_HOSTS.some((host) => host.test(parsed.hostname));
  } catch {
    return false;
  }
}

/**
 * Google serves whatever size the `=s<n>-c` suffix asks for, and accounts are
 * stored with `=s96-c` — too small for the 96px avatar circles on HiDPI screens.
 */
function requestSharperGoogleImage(url: string): string {
  return url.replace(/=s(\d+)(-c)?$/i, (match, size: string, crop: string | undefined) =>
    Number(size) >= 256 ? match : `=s256${crop ?? ''}`
  );
}

function throughProxyIfNeeded(url: string): string {
  if (!isHotlinkHostileImage(url)) return url;
  return `${IMAGE_PROXY_PATH}?u=${encodeURIComponent(requestSharperGoogleImage(url))}`;
}

/**
 * Origin that serves backend-relative media paths. Always derived from the
 * backend this build actually talks to — pinning a specific deployment here is
 * what makes media break every time the API target is switched. An empty string
 * means "same origin", which the `/api` rewrite host already fronts.
 */
function backendMediaOrigin(): string {
  if (/^https?:\/\//i.test(BACKEND_ORIGIN)) return BACKEND_ORIGIN;

  const configuredBackend = process.env.NEXT_PUBLIC_BACKEND_URL?.trim().replace(/\/+$/, '') ?? '';
  return /^https?:\/\//i.test(configuredBackend) ? configuredBackend : '';
}

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

  if (/^(data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }

  if (/^https?:/i.test(trimmed)) {
    return throughProxyIfNeeded(trimmed);
  }

  if (trimmed.startsWith('//')) {
    return throughProxyIfNeeded(`https:${trimmed}`);
  }

  if (trimmed.startsWith('/')) {
    return `${backendMediaOrigin()}${trimmed}`;
  }

  if (/^(uploads|profiles|avatars|images)\//i.test(trimmed)) {
    return `${backendMediaOrigin()}/${trimmed}`;
  }

  return null;
}
