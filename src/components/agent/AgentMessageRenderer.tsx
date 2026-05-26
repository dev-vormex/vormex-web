'use client';

import React from 'react';
import Link from 'next/link';
import type { AgentTurnResponse, AgentUiIntent } from '@/lib/api/agent';

interface AgentMessageRendererProps {
  response: AgentTurnResponse;
  onNavigate?: (intent: AgentUiIntent) => void;
}

type AgentPerson = {
  id: string;
  username?: string;
  name?: string;
  profileImage?: string | null;
  headline?: string | null;
  skills?: AgentSkill[];
};

type AgentSkill = string | { name?: string | null; skill?: { name?: string | null } | null };

const TAB_TO_ROUTE: Record<string, string> = {
  feed: '/',
  find: '/find-people',
  find_people: '/find-people',
  post: '/',
  profile: '/profile',
  groups: '/groups',
  notifications: '/notifications',
  messages: '/messages',
  chat: '/messages',
  growth: '/dashboard',
  growth_hub: '/dashboard',
};

function normalizeSkillLabel(skill: AgentSkill): string | null {
  if (typeof skill === 'string') {
    return skill;
  }

  return skill.name || skill.skill?.name || null;
}

function getIntentRoute(intent: AgentUiIntent): string | null {
  if (intent.route) {
    return intent.route;
  }

  if (intent.type === 'switch_tab' && intent.tab) {
    return TAB_TO_ROUTE[intent.tab] || null;
  }

  if (intent.type === 'open_profile' && intent.userId) {
    return `/profile/${intent.userId}`;
  }

  if (intent.type === 'open_chat') {
    return intent.conversationId ? `/messages/${intent.conversationId}` : '/messages';
  }

  if (intent.type === 'open_group' && intent.groupId) {
    return `/groups/${intent.groupId}`;
  }

  if (intent.type === 'open_groups') {
    return '/groups';
  }

  if (intent.type === 'open_notifications') {
    return '/notifications';
  }

  if (intent.type === 'open_growth_task') {
    return '/dashboard';
  }

  return null;
}

function getIntentLabel(intent: AgentUiIntent): string {
  if (intent.label) {
    return intent.label;
  }

  if (intent.type === 'switch_tab' && intent.tab) {
    return `Open ${intent.tab.replace(/_/g, ' ')}`;
  }

  if (intent.type === 'open_profile') return 'Open profile';
  if (intent.type === 'open_chat') return 'Open chat';
  if (intent.type === 'open_group') return 'Open group';
  if (intent.type === 'open_groups') return 'Open groups';
  if (intent.type === 'open_notifications') return 'Open notifications';
  if (intent.type === 'open_growth_task') return 'Open dashboard';

  return 'Open';
}

function getInlinePeopleIntent(response: AgentTurnResponse): AgentUiIntent | null {
  return response.uiIntents.find((intent) => {
    const payload = intent.payload;
    return intent.type === 'show_inline_results' && payload?.resultType === 'people' && Array.isArray(payload.people);
  }) || null;
}

function getNavigableIntents(response: AgentTurnResponse): AgentUiIntent[] {
  const seenRoutes = new Set<string>();
  const intents: AgentUiIntent[] = [];

  for (const intent of response.uiIntents) {
    const route = getIntentRoute(intent);
    if (!route || seenRoutes.has(route)) continue;
    seenRoutes.add(route);
    intents.push(intent);
  }

  return intents.slice(0, 3);
}

function PersonCardCompact({ person }: { person: AgentPerson }) {
  const displayName = person.name || person.username || 'Vormex user';
  const profileHref = person.username ? `/profile/${person.username}` : `/profile/${person.id}`;
  const skills = (person.skills || [])
    .map(normalizeSkillLabel)
    .filter((skill): skill is string => Boolean(skill));

  return (
    <Link
      href={profileHref}
      className="flex-shrink-0 w-48 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
    >
      <div className="p-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-neutral-700 overflow-hidden flex-shrink-0">
            {person.profileImage ? (
              <img
                src={person.profileImage}
                alt={person.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-500 dark:text-neutral-400">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
              {displayName}
            </p>
            {person.username && (
              <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">
                @{person.username}
              </p>
            )}
            {person.headline && (
              <p className="text-xs text-gray-600 dark:text-neutral-300 mt-0.5 line-clamp-2">
                {person.headline}
              </p>
            )}
          </div>
        </div>
        {skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {skills.slice(0, 3).map((skill, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export function AgentMessageRenderer({
  response,
  onNavigate,
}: AgentMessageRendererProps) {
  const inlinePeopleIntent = getInlinePeopleIntent(response);
  const inlinePayload = inlinePeopleIntent?.payload;
  const people = (inlinePayload?.people || []) as AgentPerson[];
  const navigableIntents = getNavigableIntents(response);

  return (
    <div className="space-y-3">
      <p className="text-gray-700 dark:text-neutral-300 whitespace-pre-wrap">
        {response.assistantMessage}
      </p>

      {people.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-3">
          <div className="mb-3">
            {typeof inlinePayload?.title === 'string' && (
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {inlinePayload.title}
              </p>
            )}
            {typeof inlinePayload?.subtitle === 'string' && (
              <p className="text-xs text-gray-500 dark:text-neutral-400">
                {inlinePayload.subtitle}
              </p>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 scrollbar-thin">
            {people.map((person) => (
              <PersonCardCompact key={person.id} person={person} />
            ))}
          </div>
        </div>
      )}

      {navigableIntents.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {navigableIntents.map((intent) => {
            const route = getIntentRoute(intent);
            if (!route) return null;

            return (
              <Link
                key={`${intent.type}:${route}`}
                href={route}
                onClick={() => onNavigate?.(intent)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                {getIntentLabel(intent)}
              </Link>
            );
          })}
        </div>
      )}

      {response.pendingActions && response.pendingActions.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          {response.pendingActions.length} action needs approval.
        </div>
      )}
    </div>
  );
}
