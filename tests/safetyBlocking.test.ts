import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { getStructuredApiError, isTerminalSafetyError } from '../src/lib/api/errors';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

test('blocked and unavailable API failures are terminal even when retryability is omitted', () => {
  const blocked = {
    response: {
      status: 403,
      data: { error: 'This action is unavailable', code: 'user_blocked' },
    },
  };
  const unavailable = {
    response: {
      status: 404,
      data: { error: 'Resource unavailable', code: 'resource_unavailable' },
    },
  };

  assert.equal(isTerminalSafetyError(blocked), true);
  assert.equal(isTerminalSafetyError(unavailable), true);
  assert.deepEqual(getStructuredApiError(blocked), {
    status: 403,
    code: 'user_blocked',
    retryable: false,
    message: 'This action is unavailable',
  });
});

test('transient server failures remain retryable', () => {
  const failure = {
    response: {
      status: 503,
      data: { error: 'Try again', code: 'temporarily_unavailable', retryable: true },
    },
  };

  assert.equal(isTerminalSafetyError(failure), false);
  assert.equal(getStructuredApiError(failure)?.retryable, true);
});

test('blocked profile and story state is evicted instead of being repainted from cache', () => {
  const profilePage = source('src/components/profile/ProfilePage.tsx');
  const profileHeader = source('src/components/profile/ProfileHeader.tsx');
  const storyViewer = source('src/components/stories/StoryViewer.tsx');
  const chatList = source('src/components/chat/ChatList.tsx');
  const cleanup = source('src/lib/safety/clientCleanup.ts');

  assert.match(profilePage, /markProfileUnavailable/);
  assert.match(profilePage, /removeProfileQueries/);
  assert.match(profilePage, /Profile unavailable/);
  assert.match(profileHeader, /handleProfileActionError/);
  assert.doesNotMatch(profileHeader, /console\.error\('Failed to (send connection request|toggle follow|remove connection):/);
  assert.match(storyViewer, /clearCachedStories/);
  assert.match(storyViewer, /isTerminalSafetyError/);
  assert.doesNotMatch(storyViewer, /console\.error\('Error reacting to story:'/);
  assert.doesNotMatch(storyViewer, /console\.error\('Error sending reply:'/);
  assert.match(chatList, /This conversation is unavailable/);
  assert.doesNotMatch(chatList, /console\.error\('Failed to start conversation:'/);
  assert.match(cleanup, /clearCachedFeed/);
  assert.match(cleanup, /clearCachedStories/);
  assert.match(cleanup, /resetQueries/);
});
