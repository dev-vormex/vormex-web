import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IMAGE_PROXY_PATH, isHotlinkHostileImage, resolveMediaUrl } from '../src/lib/utils/media';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
}

test('empty-ish image values fall back to initials rather than a broken request', () => {
  for (const value of [null, undefined, '', '   ', 'null', 'undefined', 'about:blank']) {
    assert.equal(resolveMediaUrl(value), null);
  }
});

test('inline and own-CDN images are served directly', () => {
  assert.equal(
    resolveMediaUrl('https://vormex.b-cdn.net/profiles/banners/a.avif'),
    'https://vormex.b-cdn.net/profiles/banners/a.avif'
  );
  assert.equal(resolveMediaUrl('data:image/png;base64,iVBOR'), 'data:image/png;base64,iVBOR');
  assert.equal(resolveMediaUrl('blob:http://localhost:3000/abc'), 'blob:http://localhost:3000/abc');
});

// Google throttles bursts of avatar requests and answers with a non-image
// response, which Chrome reports as net::ERR_BLOCKED_BY_ORB — a Find People
// grid asks for 20+ at once, so every card fell back to its initial. These must
// stay behind the same-origin proxy.
test('Google-hosted avatars are routed through the same-origin proxy', () => {
  const stored = 'https://lh3.googleusercontent.com/a/ACg8ocJPn=s96-c';
  const resolved = resolveMediaUrl(stored) ?? '';

  assert.ok(resolved.startsWith(`${IMAGE_PROXY_PATH}?u=`), `expected proxy url, got ${resolved}`);
  assert.ok(isHotlinkHostileImage(stored));

  // Circles are 96 CSS px, so the stored 96px source is too small on HiDPI.
  const upstream = decodeURIComponent(resolved.slice(`${IMAGE_PROXY_PATH}?u=`.length));
  assert.equal(upstream, 'https://lh3.googleusercontent.com/a/ACg8ocJPn=s256-c');
});

test('hotlink allowlist matches subdomains but not lookalike hosts', () => {
  assert.ok(isHotlinkHostileImage('https://lh3.googleusercontent.com/a/x'));
  assert.ok(!isHotlinkHostileImage('https://googleusercontent.com.evil.io/a'));
  assert.ok(!isHotlinkHostileImage('http://lh3.googleusercontent.com/a/x'));
  assert.ok(!isHotlinkHostileImage('https://vormex.b-cdn.net/a.png'));
});

test('backend-relative media never targets a hardcoded deployment', () => {
  const media = source('src/lib/utils/media.ts');
  const avatar = source('src/components/ui/UserAvatar.tsx');

  // A pinned host here is what broke avatars every time the API target moved.
  assert.doesNotMatch(media, /vormex-backend\.onrender\.com/);
  assert.doesNotMatch(media, /localhost:5000/);

  // One resolver, so the two copies cannot drift apart again.
  assert.match(avatar, /resolveMediaUrl/);
  assert.doesNotMatch(avatar, /function resolveImageSrc/);
});

test('the image proxy is a closed allowlist, not an open relay', () => {
  const route = source('src/app/media/image/route.ts');

  assert.match(route, /googleusercontent/);
  assert.match(route, /protocol === 'https:'/);
  assert.match(route, /status: 403/);
  assert.match(route, /startsWith\('image\/'\)/);
  assert.match(route, /AbortSignal\.timeout/);
});
