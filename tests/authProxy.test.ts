import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProxyRedirectPath,
  hasOrphanedHttpOnlyAuthCookies,
  hasProxySession,
} from '../src/lib/routing/authProxy';

test('redirects anonymous users away from protected routes', () => {
  const redirectPath = getProxyRedirectPath({
    pathname: '/profile/jane',
    hasToken: false,
    onboardingCompleted: false,
  });

  assert.equal(redirectPath, '/login');
});

test('redirects authenticated users away from login', () => {
  const redirectPath = getProxyRedirectPath({
    pathname: '/login',
    hasToken: true,
    onboardingCompleted: true,
  });

  assert.equal(redirectPath, '/feed');
});

test('redirects authenticated users with incomplete onboarding to onboarding', () => {
  const redirectPath = getProxyRedirectPath({
    pathname: '/feed',
    hasToken: true,
    onboardingCompleted: false,
  });

  assert.equal(redirectPath, '/onboarding');
});

test('allows public routes without auth', () => {
  const redirectPath = getProxyRedirectPath({
    pathname: '/forgot-password',
    hasToken: false,
    onboardingCompleted: false,
  });

  assert.equal(redirectPath, null);
});

test('uses auth presence cookie as the proxy session signal', () => {
  assert.equal(hasProxySession({ authPresent: 'true' }), true);
  assert.equal(hasProxySession({ accessToken: 'stale-access-token' }), false);
});

test('detects orphaned httpOnly auth cookies for cleanup', () => {
  assert.equal(
    hasOrphanedHttpOnlyAuthCookies({ accessToken: 'stale-access-token' }),
    true
  );
  assert.equal(
    hasOrphanedHttpOnlyAuthCookies({
      authPresent: 'true',
      accessToken: 'active-access-token',
    }),
    false
  );
});
