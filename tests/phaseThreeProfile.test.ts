import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { profileQueryAliases } from '../src/lib/api/profile';
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
