'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Activity,
  TrendingUp,
  BookOpen,
  MessageSquare,
  Heart,
  X,
} from 'lucide-react';
import { ProfileSection, RevealItem } from './ProfileSection';
import type { ProfileUser, ProfileStats } from '@/types/profile';

interface ProfileAboutProps {
  user: ProfileUser;
  stats: ProfileStats;
  isOwner?: boolean;
  onRemoveInterest?: (interest: string) => void;
}

export function ProfileAbout({ user, stats, isOwner, onRemoveInterest }: ProfileAboutProps) {
  const [expanded, setExpanded] = useState(false);
  const bioPreviewLength = 200;

  const shouldShowExpandButton =
    user.bio && user.bio.length > bioPreviewLength;
  const displayBio = expanded
    ? user.bio
    : user.bio?.slice(0, bioPreviewLength) + (shouldShowExpandButton ? '...' : '');

  return (
    <ProfileSection
      icon={<BookOpen className="w-5 h-5" />}
      title="About"
    >
      {/* Bio */}
      {user.bio ? (
        <div className="mb-8">
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap text-[15px]">
            {displayBio}
          </p>
          {shouldShowExpandButton && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-semibold flex items-center gap-1 hover:gap-1.5 transition-all"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Show more <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <p className="text-neutral-400 italic mb-8 text-sm">No bio added yet.</p>
      )}

      {/* Interests */}
      {user.interests && user.interests.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
            Interests & Passions
          </h3>
          <div className="flex min-w-0 flex-wrap gap-2 overflow-hidden">
            {user.interests.map((interest, index) => (
              <RevealItem key={interest} index={index}>
                <span className="group inline-flex max-w-full select-none items-center gap-1.5 rounded-lg bg-neutral-100 py-1.5 pl-3.5 pr-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">
                  <span className="min-w-0 break-words">{interest}</span>
                  {isOwner && onRemoveInterest && (
                    <button
                      onClick={() => onRemoveInterest(interest)}
                      className="p-0.5 rounded-full text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title="Remove interest"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              </RevealItem>
            ))}
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Activity className="w-4 h-4" />}
          label="Active Days"
          value={stats.totalActiveDays}
          index={0}
        />
        <StatCard
          icon={<MessageSquare className="w-4 h-4" />}
          label="Posts"
          value={stats.totalPosts}
          index={1}
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Articles"
          value={stats.totalArticles}
          index={2}
        />
        <StatCard
          icon={<Heart className="w-4 h-4" />}
          label="Likes"
          value={stats.totalLikesReceived}
          index={3}
        />
      </div>

      {/* Education info */}
      {(user.college || user.degree) && (
        <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">
            Education
          </h3>
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
              <GraduationCap className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />
            </div>
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-neutral-900 dark:text-white">
                {user.degree || 'Student'}
                {user.branch && ` in ${user.branch}`}
              </p>
              <p className="mt-0.5 break-words text-sm text-neutral-600 dark:text-neutral-400">{user.college}</p>
              {(user.currentYear || user.graduationYear) && (
                <p className="text-neutral-400 dark:text-neutral-500 text-xs mt-1">
                  {user.currentYear && `Year ${user.currentYear}`}
                  {user.currentYear && user.graduationYear && ' • '}
                  {user.graduationYear && `Class of ${user.graduationYear}`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </ProfileSection>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  index: number;
}

function StatCard({ icon, label, value, index }: StatCardProps) {
  return (
    <RevealItem index={index}>
      <div className="group flex flex-col items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-center dark:border-neutral-800 dark:bg-neutral-800/50 sm:p-4">
        <div className="mb-2 text-neutral-400">
          {icon}
        </div>
        <p className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
          {value.toLocaleString()}
        </p>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">
          {label}
        </p>
      </div>
    </RevealItem>
  );
}
