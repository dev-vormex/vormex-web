'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, X, MessageCircle } from 'lucide-react';
import { ChatList } from '@/components/chat';
import { useAuth } from '@/lib/auth/useAuth';

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex-1 min-h-0">
      {/* Mobile: show conversation list here (desktop sidebar already shows it) */}
      <div className="flex h-full min-h-0 flex-col md:hidden">
        <div className="px-4 pt-4 pb-3 border-b border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className="p-2 -ml-2 rounded-full text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              Messaging
            </h1>
          </div>
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
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatList currentUserId={user?.id} searchQuery={searchQuery} />
        </div>
      </div>

      {/* Desktop: empty state */}
      <div className="hidden md:flex flex-1 items-center justify-center p-6 bg-gray-50 dark:bg-neutral-950">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Select a conversation
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
            Pick a chat from the left to start messaging, or find someone new to connect with.
          </p>
          <Link
            href="/find-people"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2 rounded-full border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
          >
            Find people
          </Link>
        </div>
      </div>
    </div>
  );
}
