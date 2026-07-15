import test from 'node:test';
import assert from 'node:assert/strict';
import { getProxyRedirectPath } from '../src/lib/routing/authProxy';

test('public landing and people pages remain available without authentication', () => {
  assert.equal(getProxyRedirectPath({ pathname: '/', hasToken: false, onboardingCompleted: false }), null);
  assert.equal(getProxyRedirectPath({ pathname: '/people', hasToken: false, onboardingCompleted: false }), null);
});
