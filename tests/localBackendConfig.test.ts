import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSecurityHeaders, resolveBackendUrl } from '../next.config';
import { resolveApiUrl, resolveSocketUrl } from '../src/lib/utils/constants';

test('local web defaults proxy REST to localhost:5000', () => {
  assert.equal(resolveBackendUrl({}), 'http://localhost:5000');
  assert.equal(resolveApiUrl({}), '/api');
});

test('local Socket.IO defaults to localhost:5000', () => {
  assert.equal(resolveSocketUrl({}), 'http://localhost:5000');
});

test('deployment environment can override every local default', () => {
  const env = {
    NEXT_PUBLIC_API_URL: '/api',
    NEXT_PUBLIC_BACKEND_URL: 'https://api.example.com/',
    NEXT_PUBLIC_SOCKET_URL: 'https://socket.example.com/',
  };

  assert.equal(resolveBackendUrl(env), 'https://api.example.com');
  assert.equal(resolveApiUrl(env), '/api');
  assert.equal(resolveSocketUrl(env), 'https://socket.example.com');
});

test('production retains the secure backend fallback when deployment env is incomplete', () => {
  assert.equal(
    resolveBackendUrl({ NODE_ENV: 'production' }),
    'https://vormex-backend.onrender.com'
  );
  assert.equal(
    resolveSocketUrl({ NODE_ENV: 'production' }),
    'https://vormex-backend.onrender.com'
  );
});

test('production responses enforce privacy and browser security headers', () => {
  const headers = new Map(
    buildSecurityHeaders({ NODE_ENV: 'production', NEXT_PUBLIC_BACKEND_URL: 'https://api.example.com' })
      .map(({ key, value }) => [key, value])
  );

  assert.match(headers.get('Content-Security-Policy') ?? '', /frame-ancestors 'none'/);
  assert.doesNotMatch(headers.get('Content-Security-Policy') ?? '', /unsafe-eval/);
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(headers.get('X-Frame-Options'), 'DENY');
  assert.match(headers.get('Strict-Transport-Security') ?? '', /includeSubDomains/);
});

test('production CSP lets Razorpay Checkout load, frame, and report', () => {
  const csp =
    new Map(
      buildSecurityHeaders({ NODE_ENV: 'production', NEXT_PUBLIC_BACKEND_URL: 'https://api.example.com' })
        .map(({ key, value }) => [key, value])
    ).get('Content-Security-Policy') ?? '';

  const directives = new Map(
    csp.split(';').map((directive) => {
      const [name, ...values] = directive.trim().split(/\s+/);
      return [name, values.join(' ')];
    })
  );

  assert.match(directives.get('script-src') ?? '', /https:\/\/checkout\.razorpay\.com/);
  assert.match(directives.get('frame-src') ?? '', /https:\/\/api\.razorpay\.com/);
  assert.match(directives.get('connect-src') ?? '', /https:\/\/api\.razorpay\.com/);
  assert.match(directives.get('connect-src') ?? '', /https:\/\/lumberjack\.razorpay\.com/);
});

test('Permissions-Policy delegates the Payment Request API to Razorpay only', () => {
  const permissionsPolicy =
    new Map(
      buildSecurityHeaders({ NODE_ENV: 'production' }).map(({ key, value }) => [key, value])
    ).get('Permissions-Policy') ?? '';

  assert.match(permissionsPolicy, /payment=\(self "https:\/\/api\.razorpay\.com" "https:\/\/checkout\.razorpay\.com"\)/);
  assert.doesNotMatch(permissionsPolicy, /payment=\*/);
});
