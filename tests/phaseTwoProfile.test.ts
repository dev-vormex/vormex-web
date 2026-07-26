import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { materializeCoreProfile } from '../src/lib/api/profile';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
}

test('core profile materializes a render-safe shell for deferred sections', () => {
  const profile = materializeCoreProfile({
    user: { id: 'u1', username: 'ada', name: 'Ada' } as never,
    stats: { connectionsCount: 2, followersCount: 3 } as never,
  });

  assert.equal(profile.user.id, 'u1');
  assert.deepEqual(profile.skills, []);
  assert.deepEqual(profile.projects, []);
  assert.deepEqual(profile.recentActivity.items, []);
});

test('web profile paints core before requesting the full bundle', () => {
  const page = source('src/components/profile/ProfilePage.tsx');
  const coreFetch = page.indexOf('queryFn: () => getCoreProfile(targetUserId)');
  const visible = page.indexOf('setLoading(false)', coreFetch);
  const bundleFetch = page.indexOf('queryFn: () => getProfile(targetUserId)', coreFetch);

  assert.ok(coreFetch >= 0);
  assert.ok(visible > coreFetch);
  assert.ok(bundleFetch > visible);
});

test('profile link prefetches route and core data only on navigation intent', () => {
  const link = source('src/components/profile/ProfileLink.tsx');

  assert.match(link, /queryKeys\.profileCore\(profileId\)/);
  assert.match(link, /getCoreProfile\(profileId\)/);
  assert.match(link, /onPointerEnter/);
  assert.match(link, /onFocus/);
  assert.match(link, /onTouchStart/);
  assert.doesNotMatch(link, /useEffect/);
});
