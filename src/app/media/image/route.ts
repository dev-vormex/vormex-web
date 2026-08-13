import type { NextRequest } from 'next/server';

/**
 * Re-serves images from hosts that refuse to be hotlinked at list scale.
 *
 * Google throttles bursts of avatar requests from a single client and answers
 * with a non-image response, which Chrome surfaces as net::ERR_BLOCKED_BY_ORB.
 * A Find People grid trips this on every load, leaving every card showing an
 * initial. Fetching server-side sidesteps the browser-side burst limit, and the
 * response is cached so repeat views never touch Google again.
 *
 * Deliberately a closed allowlist, not a general image proxy: an open one is an
 * SSRF hole and free bandwidth for anyone who finds the URL.
 */
const ALLOWED_HOSTS = [/(?:^|\.)googleusercontent\.com$/i];

const UPSTREAM_TIMEOUT_MS = 8_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

function isAllowed(target: URL): boolean {
  return target.protocol === 'https:' && ALLOWED_HOSTS.some((host) => host.test(target.hostname));
}

export async function GET(request: NextRequest): Promise<Response> {
  const requested = request.nextUrl.searchParams.get('u');
  if (!requested) {
    return new Response('Missing image url', { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(requested);
  } catch {
    return new Response('Invalid image url', { status: 400 });
  }

  if (!isAllowed(target)) {
    return new Response('Image host not allowed', { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      // No cookies or client headers — this must never act on the viewer's behalf.
      credentials: 'omit',
      redirect: 'follow',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: { Accept: 'image/*' },
    });
  } catch {
    return new Response('Image fetch failed', { status: 502 });
  }

  const contentType = upstream.headers.get('content-type') ?? '';
  if (!upstream.ok || !contentType.startsWith('image/')) {
    return new Response('Image unavailable', { status: 502 });
  }

  const declaredLength = Number(upstream.headers.get('content-length') ?? '0');
  if (declaredLength > MAX_IMAGE_BYTES) {
    return new Response('Image too large', { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': CACHE_CONTROL,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
