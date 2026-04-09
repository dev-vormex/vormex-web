import test from 'node:test';
import assert from 'node:assert/strict';
import { getProxyRedirectPath } from '../src/lib/routing/authProxy';

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

  assert.equal(redirectPath, '/');
});

test('redirects authenticated users with incomplete onboarding to onboarding', () => {
  const redirectPath = getProxyRedirectPath({
    pathname: '/',
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
