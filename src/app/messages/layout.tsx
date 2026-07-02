'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, X, SquarePen } from 'lucide-react';
import { ChatList } from '@/components/chat';
import { useAuth } from '@/lib/auth/useAuth';

interface MessagesLayoutProps {
  children: React.ReactNode;
}

export default function MessagesLayout({ children }: MessagesLayoutProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const selectedConversationId = useMemo(() => {
    const prefix = '/messages/';
    if (!pathname.startsWith(prefix)) return undefined;
    const maybeId = pathname.slice(prefix.length).split('/')[0]?.trim();
    return maybeId || undefined;
  }, [pathname]);

  return (
    <ProtectedRoute>
      <div className="h-[100dvh] w-full overflow-hidden bg-gray-50 dark:bg-neutral-950">
        <div className="flex h-full w-full">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex md:w-80 lg:w-96 shrink-0 flex-col border-r border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <div className="px-4 pt-4 pb-3 border-b border-gray-200 dark:border-neutral-800">
              <div className="flex items-center gap-1">
                <Link
                  href="/"
                  className="p-2 -ml-2 rounded-full text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Back to home"
                  aria-label="Back to home"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                  Messaging
                </h1>
                <Link
                  href="/find-people"
                  className="ml-auto p-2 -mr-2 rounded-full text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Start a new conversation"
                  aria-label="Start a new conversation"
                >
                  <SquarePen className="w-5 h-5" />
                </Link>
              </div>

              {/* Conversation search */}
              <div className="relative mt-3">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations"
                  className="w-full pl-9 pr-9 py-2 rounded-full bg-gray-100 dark:bg-neutral-800 text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-neutral-700"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatList
                selectedConversationId={selectedConversationId}
                currentUserId={user?.id}
                searchQuery={searchQuery}
              />
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0 min-h-0 flex flex-col bg-white dark:bg-neutral-900">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
