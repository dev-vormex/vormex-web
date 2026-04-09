'use client';

import { ChatList } from '@/components/chat';
import { useAuth } from '@/lib/auth/useAuth';

export default function MessagesPage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 min-h-0">
      {/* Mobile: show conversation list here (desktop sidebar already shows it) */}
      <div className="flex h-full min-h-0 flex-col md:hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Messaging</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Your conversations</p>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatList currentUserId={user?.id} />
        </div>
      </div>

      {/* Desktop: empty state */}
      <div className="hidden md:flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <div className="text-3xl mb-2">💬</div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Select a conversation</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Pick a chat from the left to start messaging.
          </p>
        </div>
      </div>
    </div>
  );
}
