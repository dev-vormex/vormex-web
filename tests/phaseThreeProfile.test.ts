import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { profileQueryAliases } from '../src/lib/api/profile';
import { isOwnProfileTarget, resolveProfileTarget } from '../src/lib/routing/profileTarget';
import type { CoreProfileResponse } from '../src/types/profile';

test('profile query aliases cover route, UUID, username, and at-username', () => {
  const profile = {
    user: {
      id: 'user-id',
      username: 'ada',
    },
  } as Pick<CoreProfileResponse, 'user'>;

  assert.deepEqual(
    profileQueryAliases('@Ada', profile),
    ['@Ada', 'user-id', 'ada', '@ada']
  );
});

test('profile header hydrates relationship controls without mount status requests', () => {
  const header = readFileSync(
    join(process.cwd(), 'src/components/profile/ProfileHeader.tsx'),
    'utf8'
  );

  assert.doesNotMatch(header, /getConnectionStatus\(/);
  assert.doesNotMatch(header, /getFollowStatus\(/);
  assert.match(header, /viewerContext\?\.connectionStatus/);
  assert.match(header, /viewerContext\?\.isFollowing/);
  assert.match(header, /onViewerContextChange/);
});

test('mutual profile context loads only near its viewport sentinel', () => {
  const header = readFileSync(
    join(process.cwd(), 'src/components/profile/ProfileHeader.tsx'),
    'utf8'
  );

  assert.match(header, /new IntersectionObserver/);
  assert.match(header, /rootMargin: '300px 0px'/);
  assert.match(header, /ref=\{mutualSectionRef\}/);
  assert.doesNotMatch(
    header,
    /Promise\.allSettled\(\[[\s\S]*?getConnectionStatus/
  );
});

test('profile page writes response aliases and preserves core viewer context', () => {
  const page = readFileSync(
    join(process.cwd(), 'src/components/profile/ProfilePage.tsx'),
    'utf8'
  );

  assert.match(page, /profileQueryAliases\(targetUserId, core\)/);
  assert.match(page, /profileQueryAliases\(targetUserId, nextProfile\)/);
  assert.match(
    page,
    /viewerContext:\s*\{[\s\S]*?\.\.\.core\.viewerContext,[\s\S]*?\.\.\.bundle\.viewerContext/
  );
  assert.match(page, /viewerContext=\{profile\.viewerContext\}/);
});

test('/profile/<username> resolves to that person, not the signed-in user', () => {
  // The next.config rewrite sends /profile/:id to /profile?user=:id without
  // changing the browser URL, so useSearchParams() sees no `user` param and the
  // path is the only thing carrying the identifier.
  assert.equal(resolveProfileTarget(null, '/profile/sricharan'), 'sricharan');
  assert.equal(resolveProfileTarget(undefined, '/profile/%40ada'), '@ada');
  // An explicit ?user= (what ProfileLink builds) still wins.
  assert.equal(resolveProfileTarget('ada', '/profile/sricharan'), 'ada');
});

test('profile entry point leaves its own sibling routes alone', () => {
  assert.equal(resolveProfileTarget(null, '/profile'), undefined);
  assert.equal(resolveProfileTarget(null, '/profile/edit'), undefined);
  assert.equal(resolveProfileTarget(null, '/profile/ada/network'), undefined);
  assert.equal(resolveProfileTarget('   ', '/profile'), undefined);
});

test('only the own-profile entry points sit behind the auth gate', () => {
  assert.equal(isOwnProfileTarget(undefined), true);
  assert.equal(isOwnProfileTarget('me'), true);
  assert.equal(isOwnProfileTarget('ME'), true);
  assert.equal(isOwnProfileTarget('ada'), false);

  const page = readFileSync(join(process.cwd(), 'src/app/profile/page.tsx'), 'utf8');
  assert.match(page, /resolveProfileTarget\(searchParams\.get\('user'\), pathname\)/);
  assert.match(page, /isOwnProfileTarget\(requestedUser\)\s*\?\s*<ProtectedRoute>/);
});

test('profile ownership follows the loaded profile, not the URL shape', () => {
  const page = readFileSync(
    join(process.cwd(), 'src/components/profile/ProfilePage.tsx'),
    'utf8'
  );

  // Arriving by username means targetUserId is a handle, never authUser.id, so
  // the id comparison alone hid every owner control on your own profile.
  assert.match(page, /profile\.user\.id === authUser\.id/);
  // fetchProfile must not depend on isOwner, which now changes once the profile
  // loads and would otherwise trigger a redundant background refetch.
  assert.doesNotMatch(page, /\[authUser, commitCoreProfile[^\]]*isOwner/);
});
