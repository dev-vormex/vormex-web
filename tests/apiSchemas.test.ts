import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accountabilityPartnersResponseSchema,
} from '../src/lib/api/accountability';
import {
  circleDetailResponseSchema,
  discoverCirclesResponseSchema,
} from '../src/lib/api/circles';

test('accountability response schema accepts a valid partner payload', () => {
  const parsed = accountabilityPartnersResponseSchema.parse({
    partners: [
      {
        id: 'pair_1',
        user1Id: 'user_1',
        user2Id: 'user_2',
        goal: 'Finish DSA prep',
        status: 'active',
        sharedStreak: 4,
        bestStreak: 8,
        lastCheckIn: '2026-03-31T00:00:00.000Z',
        checkInsCompleted: 9,
        partner: {
          id: 'user_2',
          name: 'Jane',
          username: 'jane',
          profileImage: null,
          headline: 'Backend Engineer',
          college: 'VIT',
        },
      },
    ],
  });

  assert.equal(parsed.partners[0]?.partner.username, 'jane');
});

test('accountability response schema rejects malformed partner payloads', () => {
  assert.throws(() => {
    accountabilityPartnersResponseSchema.parse({
      partners: [
        {
          id: 'pair_1',
          user1Id: 'user_1',
          user2Id: 'user_2',
          goal: 'Finish DSA prep',
          status: 'active',
          sharedStreak: 4,
          bestStreak: 8,
          lastCheckIn: null,
          checkInsCompleted: 9,
          partner: {
            name: 'Jane',
            username: 'jane',
            profileImage: null,
            headline: 'Backend Engineer',
            college: 'VIT',
          },
        },
      ],
    });
  });
});

test('circle schemas parse discover and detail payloads', () => {
  const discover = discoverCirclesResponseSchema.parse({
    circles: [
      {
        id: 'circle_1',
        name: 'System Design',
        slug: 'system-design',
        description: 'Discussing system design interviews',
        imageUrl: null,
        coverImageUrl: null,
        emoji: '🧠',
        category: 'career',
        campus: 'Remote',
        tags: ['architecture'],
        type: 'community',
        isPrivate: false,
        memberCount: 120,
        activeMembers: 24,
        postsCount: 57,
        weeklyActivity: 12,
        createdAt: '2026-03-31T00:00:00.000Z',
      },
    ],
    total: 1,
    page: 1,
    totalPages: 1,
  });

  const detail = circleDetailResponseSchema.parse({
    circle: {
      ...discover.circles[0],
      topMembers: [
        {
          id: 'user_1',
          name: 'Alex',
          username: 'alex',
          profileImage: null,
          headline: 'Engineer',
          college: null,
          role: 'admin',
          xpInCircle: 1200,
          joinedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
      _count: {
        members: 120,
        posts: 57,
      },
    },
  });

  assert.equal(discover.circles[0]?.slug, 'system-design');
  assert.equal(detail.circle.topMembers[0]?.role, 'admin');
});
