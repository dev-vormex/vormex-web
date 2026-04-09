'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { ChatList } from '@/components/chat';
import { useAuth } from '@/lib/auth/useAuth';

interface MessagesLayoutProps {
  children: React.ReactNode;
}

export default function MessagesLayout({ children }: MessagesLayoutProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const selectedConversationId = useMemo(() => {
    const prefix = '/messages/';
    if (!pathname.startsWith(prefix)) return undefined;
    const maybeId = pathname.slice(prefix.length).split('/')[0]?.trim();
    return maybeId || undefined;
  }, [pathname]);

  return (
    <ProtectedRoute>
      <div className="h-[100dvh] w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
        <div className="flex h-full w-full">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex md:w-80 lg:w-[22rem] shrink-0 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Messaging</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your conversations
              </p>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatList
                selectedConversationId={selectedConversationId}
                currentUserId={user?.id}
              />
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0 min-h-0 flex flex-col bg-white dark:bg-gray-950">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
