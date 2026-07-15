'use client';

import { useState } from 'react';
import {
  BookMarked,
  ExternalLink,
  Github,
  GitFork,
  RefreshCw,
  Star,
  Unplug,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { GitHubProfile } from '@/types/profile';
import { GitHubContributionGraph } from './GitHubContributionGraph';

interface GitHubStatsProps {
  github: GitHubProfile;
  isOwner: boolean;
  onSync?: () => Promise<void>;
  onConnect?: () => void;
  onDisconnect?: () => Promise<void>;
}
function formatLastSynced(lastSyncedAt: string | null) {
  if (!lastSyncedAt) return null;
  return new Date(lastSyncedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function GitHubStats({
  github,
  isOwner,
  onSync,
  onConnect,
  onDisconnect,
}: GitHubStatsProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!onSync) return;
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  };

  if (!github.connected) {
    return (
      <Card className="overflow-hidden border border-slate-200/80 bg-white p-0 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)] dark:border-neutral-800 dark:bg-neutral-950">
        <div className="border-b border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-6 dark:border-neutral-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.14),_rgba(10,10,10,1)_52%)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/15 dark:bg-white dark:text-slate-950">
              <Github className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                GitHub
              </h2>
              <p className="text-sm text-slate-600 dark:text-neutral-400">
                Show real repository stats and a contribution graph on your profile.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-500">
            <Github className="h-8 w-8" />
          </div>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600 dark:text-neutral-400">
            {isOwner
              ? 'Connect your GitHub account and we’ll surface your public contribution graph, languages, and repositories in a polished profile card.'
              : 'This profile has not connected GitHub yet.'}
          </p>
          {isOwner && onConnect && (
            <Button
              onClick={onConnect}
              className="mt-5 bg-slate-950 px-5 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
            >
              <Github className="mr-2 h-4 w-4" />
              Connect GitHub
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const stats = github.stats;
  const syncedLabel = formatLastSynced(github.lastSyncedAt);

  return (
    <Card className="overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 shadow-none dark:border-neutral-800 dark:bg-neutral-900">
      <div className="border-b border-neutral-100 px-4 py-5 dark:border-neutral-800 sm:px-6">
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
              <Github className="h-3.5 w-3.5" />
              GitHub Showcase
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">
                Live GitHub profile snapshot
              </h2>
              {github.username && (
                <a
                  href={github.profileUrl || `https://github.com/${github.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                className="inline-flex min-w-0 items-center gap-1 break-all text-sm font-medium text-neutral-600 underline-offset-4 hover:underline dark:text-neutral-300"
                >
                  @{github.username}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-neutral-400">
              Public visitors can see the contribution graph and summary after the account is connected and synced.
            </p>
          </div>

          {isOwner && (
            <div className="flex items-center gap-2">
              {onSync && (
                <Button
                  onClick={handleSync}
                  disabled={isSyncing}
                  variant="outline"
                  className="border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync GitHub'}
                </Button>
              )}
              {onDisconnect && (
                <Button
                  onClick={onDisconnect}
                  variant="ghost"
                  className="text-slate-600 hover:bg-white/80 hover:text-slate-950 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white"
                >
                  <Unplug className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6 sm:py-6">
        {!stats ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              GitHub is connected, and the stats are still syncing.
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-neutral-400">
              {isOwner
                ? 'Run a sync and we’ll pull the latest repositories, languages, and contribution graph into your profile.'
                : 'This profile will show its GitHub graph once the initial sync completes.'}
            </p>
            {isOwner && onSync && (
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="mt-5 bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync now'}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard
                icon={<BookMarked className="h-4 w-4" />}
                label="Public Repositories"
                value={stats.totalPublicRepos}
              />
              <MetricCard
                icon={<Star className="h-4 w-4" />}
                label="Total Stars"
                value={stats.totalStars}
              />
              <MetricCard
                icon={<GitFork className="h-4 w-4" />}
                label="Total Forks"
                value={stats.totalForks}
              />
              <MetricCard
                icon={<Users className="h-4 w-4" />}
                label="Followers"
                value={stats.followers}
              />
            </div>

            <div className="mt-6 min-w-0">
              {github.contributionCalendar ? (
                <GitHubContributionGraph
                  contributionCalendar={github.contributionCalendar}
                  username={github.username}
                />
              ) : (
                <ContributionGraphPlaceholder
                  isOwner={isOwner}
                  isSyncing={isSyncing}
                  onSync={onSync ? handleSync : undefined}
                />
              )}

            </div>

            {syncedLabel && (
              <p className="mt-5 text-right text-xs text-slate-500 dark:text-neutral-500">
                Last synced {syncedLabel}
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <div className="min-w-0 rounded-lg border border-neutral-200 bg-white p-3 sm:p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 break-words text-sm text-slate-600 dark:text-neutral-400">{label}</p>
    </div>
  );
}

interface ContributionGraphPlaceholderProps {
  isOwner: boolean;
  isSyncing: boolean;
  onSync?: () => Promise<void>;
}

function ContributionGraphPlaceholder({
  isOwner,
  isSyncing,
  onSync,
}: ContributionGraphPlaceholderProps) {
  return (
    <section className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-8 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-500">
        <Github className="h-4 w-4" />
        Contribution Graph
      </div>
      <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
        Contribution data is not ready yet
      </h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-neutral-400">
        {isOwner
          ? 'Sync GitHub once and this profile will show the same contribution-style graph to every visitor.'
          : 'This profile has GitHub connected, but the contribution graph is still being prepared.'}
      </p>
      {isOwner && onSync && (
        <Button
          onClick={() => void onSync()}
          disabled={isSyncing}
          className="mt-5 bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync GitHub'}
        </Button>
      )}
    </section>
  );
}
