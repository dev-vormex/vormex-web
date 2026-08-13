'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Bookmark,
  Film,
  Group,
  HomeIcon,
  MessageCircle,
  MoreHorizontal,
  Sparkles,
  Users,
} from 'lucide-react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth } from '@/lib/auth/useAuth';
import { useUnreadMessagesCount } from '@/hooks/useUnreadMessagesCount';
import { PANEL_SURFACE } from '@/components/feed/surface';

/**
 * FeedLeftNav — the desktop navigation rail for the feed.
 *
 * The feed was a centred `max-w-6xl` column, which left roughly a third of a
 * wide screen empty while navigation lived in a floating bottom pill — a mobile
 * pattern running on desktop. This puts labelled navigation in that dead space.
 *
 * It appears at `xl` and up only; below that the existing dock still handles
 * navigation (see VormexDock, which hides its desktop dock on the feed at the
 * same breakpoint so the two never both show).
 */

type RailItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

export function FeedLeftNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const unreadMessagesCount = useUnreadMessagesCount();

  const items: RailItem[] = [
    { title: 'Home', href: '/feed', icon: HomeIcon },
    { title: 'Reels', href: '/reels', icon: Film },
    { title: 'Find people', href: '/find-people', icon: Users },
    { title: 'Groups', href: '/groups', icon: Group },
    { title: 'Messages', href: '/messages', icon: MessageCircle, badge: unreadMessagesCount },
    { title: 'Notifications', href: '/notifications', icon: Bell },
    { title: 'Saved', href: '/more/saved', icon: Bookmark },
    { title: 'Premium', href: '/premium', icon: Sparkles },
    { title: 'More', href: '/more', icon: MoreHorizontal },
  ];

  const isActive = (href: string) =>
    href === '/feed' ? pathname === '/feed' || pathname === '/' : pathname.startsWith(href);

  return (
    <nav aria-label="Primary" className="sticky top-[62px] space-y-3">
      {user && (
        <Link
          href="/profile"
          className={`${PANEL_SURFACE} flex items-center gap-3 p-3 transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800/60`}
        >
          <UserAvatar
            imageSrc={user.profileImage}
            name={user.name}
            className="h-10 w-10 flex-shrink-0 bg-gray-200 text-base font-bold text-gray-500 dark:bg-neutral-700"
            fallbackClassName="text-base font-bold"
          />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-gray-900 dark:text-white">
              {user.name}
            </p>
            <p className="truncate text-[11.5px] text-gray-500 dark:text-neutral-400">
              View your profile
            </p>
          </div>
        </Link>
      )}

      <div className={`${PANEL_SURFACE} p-2`}>
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800/70'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                  <span className="flex-1 truncate">{item.title}</span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export default FeedLeftNav;
