'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { checkUserStatus, getSocket, initializeSocket } from '@/lib/socket';
import ReportModal from '@/components/reports/ReportModal';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { MoreVertical, Flag, ArrowLeft, Phone, Video, Info } from 'lucide-react';

interface ChatHeaderProps {
  user: {
    id: string;
    name: string;
    username: string;
    profileImage?: string | null;
    isOnline?: boolean;
    lastActiveAt?: string | null;
    verified?: boolean;
    isVerified?: boolean;
    profileBadgeStyle?: string | null;
    isPremium?: boolean;
  };
  conversationId: string;
  onBack?: () => void;
  onInfo?: () => void;
}

export default function ChatHeader({ user, conversationId, onBack, onInfo }: ChatHeaderProps) {
  const [isOnline, setIsOnline] = useState(user.isOnline || false);
  const [lastActive, setLastActive] = useState(user.lastActiveAt);
  const [prevUserStatus, setPrevUserStatus] = useState({
    isOnline: user.isOnline,
    lastActiveAt: user.lastActiveAt,
  });
  const [showMenu, setShowMenu] = useState(false);

  // Re-sync from props during render when the user prop changes
  if (
    prevUserStatus.isOnline !== user.isOnline ||
    prevUserStatus.lastActiveAt !== user.lastActiveAt
  ) {
    setPrevUserStatus({ isOnline: user.isOnline, lastActiveAt: user.lastActiveAt });
    setIsOnline(user.isOnline || false);
    setLastActive(user.lastActiveAt);
  }
  const [showReportModal, setShowReportModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Request fresh presence on mount and whenever the socket (re)authenticates,
  // so "Online / last seen" doesn't wait for an online/offline transition.
  useEffect(() => {
    const socket = initializeSocket();

    const requestStatus = () => {
      checkUserStatus(user.id);
    };

    requestStatus();
    socket.on('socket:authenticated', requestStatus);

    return () => {
      socket.off('socket:authenticated', requestStatus);
    };
  }, [user.id]);

  // Listen for online/offline status
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleOnline = (data: { userId: string }) => {
      if (data.userId === user.id) {
        setIsOnline(true);
      }
    };

    const handleOffline = (data: { userId: string; lastActiveAt?: string }) => {
      if (data.userId === user.id) {
        setIsOnline(false);
        setLastActive(data.lastActiveAt ?? new Date().toISOString());
      }
    };

    // Handle immediate status update when joining chat
    const handleStatus = (data: { userId: string; isOnline: boolean; lastActiveAt?: string | null }) => {
      if (data.userId === user.id) {
        setIsOnline(data.isOnline);
        if (!data.isOnline) {
          setLastActive(data.lastActiveAt ?? new Date().toISOString());
        }
      }
    };

    socket.on('user:online', handleOnline);
    socket.on('user:offline', handleOffline);
    socket.on('user:status', handleStatus);

    return () => {
      socket.off('user:online', handleOnline);
      socket.off('user:offline', handleOffline);
      socket.off('user:status', handleStatus);
    };
  }, [user.id]);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      {/* Back button (mobile) */}
      {onBack && (
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 md:hidden transition-colors"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      {/* Avatar */}
      <Link href={`/profile/${user.username}`} className="relative flex-shrink-0">
        <UserAvatar
          imageSrc={user.profileImage}
          name={user.name}
          className="h-10 w-10 bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
        />
        {/* Online indicator */}
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white dark:ring-neutral-900"></div>
        )}
      </Link>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/profile/${user.username}`}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white hover:underline"
        >
          <span className="truncate">{user.name}</span>
          <VerificationBadge
            profileBadgeStyle={user.profileBadgeStyle}
            isPremium={user.isPremium}
            size="small"
          />
        </Link>
        <p className="text-xs text-gray-500 dark:text-neutral-400">
          {isOnline ? (
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Online
            </span>
          ) : lastActive ? (
            `Last seen ${formatDistanceToNow(new Date(lastActive), { addSuffix: true })}`
          ) : (
            `@${user.username}`
          )}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {/* Voice call (future) */}
        <button
          className="p-2 rounded-full text-gray-400 dark:text-neutral-600 cursor-not-allowed"
          title="Voice call (coming soon)"
          disabled
        >
          <Phone className="w-5 h-5" />
        </button>

        {/* Video call (future) */}
        <button
          className="p-2 rounded-full text-gray-400 dark:text-neutral-600 cursor-not-allowed"
          title="Video call (coming soon)"
          disabled
        >
          <Video className="w-5 h-5" />
        </button>

        {/* Info button */}
        {onInfo && (
          <button
            onClick={onInfo}
            className="p-2 rounded-full text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            title="Chat info"
          >
            <Info className="w-5 h-5" />
          </button>
        )}

        {/* More options menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            title="More options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 shadow-lg z-50">
              <button
                onClick={() => {
                  setShowReportModal(true);
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-neutral-700"
              >
                <Flag className="w-4 h-4" />
                Report User
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        type="chat"
        targetId={conversationId}
        targetName={user.name}
        conversationId={conversationId}
        reportedUserId={user.id}
      />
    </div>
  );
}
