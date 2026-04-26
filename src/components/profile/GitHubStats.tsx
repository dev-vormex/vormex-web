'use client';

import { useState } from 'react';
import {
  BookMarked,
  Code2,
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
import type { GitHubProfile, LanguageStat, TopRepo } from '@/types/profile';
import { GitHubContributionGraph } from './GitHubContributionGraph';

interface GitHubStatsProps {
  github: GitHubProfile;
  isOwner: boolean;
  onSync?: () => Promise<void>;
  onConnect?: () => void;
  onDisconnect?: () => Promise<void>;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f7df1e',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#cc342d',
  PHP: '#4F5D95',
  Swift: '#FA7343',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Vue: '#41b883',
  Other: '#8b949e',
};

function formatLanguageStats(topLanguages: Record<string, LanguageStat | number>) {
  return Object.entries(topLanguages)
    .map(([name, stat]) => {
      const percentage = typeof stat === 'number' ? stat : stat.percentage;
      return {
        color: LANGUAGE_COLORS[name] || LANGUAGE_COLORS.Other,
        name,
        percentage,
      };
    })
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 6);
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
  const languageData = stats ? formatLanguageStats(stats.topLanguages || {}) : [];
  const syncedLabel = formatLastSynced(github.lastSyncedAt);

  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white p-0 shadow-[0_28px_90px_-58px_rgba(15,23,42,0.6)] dark:border-neutral-800 dark:bg-neutral-950">
      <div className="relative overflow-hidden border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_34%),linear-gradient(135deg,_rgba(248,250,252,0.98),_rgba(255,255,255,0.92))] px-6 py-6 dark:border-neutral-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_30%),linear-gradient(135deg,_rgba(10,10,10,0.98),_rgba(18,18,18,0.95))]">
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/70 dark:text-neutral-400">
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
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-neutral-800 dark:bg-neutral-950/70 dark:text-neutral-300 dark:hover:text-white"
                >
                  @{github.username}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-neutral-400">
              Public visitors can see the same GitHub contribution graph, languages, and repository highlights once the account is connected and synced.
            </p>
          </div>

          {isOwner && (
            <div className="flex items-center gap-2">
              {onSync && (
                <Button
                  onClick={handleSync}
                  disabled={isSyncing}
                  variant="outline"
                  className="border-white/80 bg-white/85 text-slate-700 backdrop-blur hover:bg-white dark:border-neutral-800 dark:bg-neutral-950/70 dark:text-neutral-200 dark:hover:bg-neutral-900"
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

      <div className="px-6 py-6">
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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={<BookMarked className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                label="Public Repositories"
                value={stats.totalPublicRepos}
              />
              <MetricCard
                icon={<Star className="h-4 w-4 text-amber-500" />}
                label="Total Stars"
                value={stats.totalStars}
              />
              <MetricCard
                icon={<GitFork className="h-4 w-4 text-violet-500" />}
                label="Total Forks"
                value={stats.totalForks}
              />
              <MetricCard
                icon={<Users className="h-4 w-4 text-emerald-500" />}
                label="Followers"
                value={stats.followers}
              />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,0.95fr)]">
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

              <div className="space-y-6">
                <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_22px_65px_-55px_rgba(15,23,42,0.6)] dark:border-neutral-800 dark:bg-neutral-950">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-slate-600 dark:text-neutral-400" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Top Languages
                    </h3>
                  </div>
                  {languageData.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {languageData.map((language) => (
                        <div key={language.name}>
                          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: language.color }}
                              />
                              <span className="truncate font-medium text-slate-800 dark:text-neutral-200">
                                {language.name}
                              </span>
                            </div>
                            <span className="tabular-nums text-slate-500 dark:text-neutral-500">
                              {language.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 dark:bg-neutral-900">
                            <div
                              className="h-2 rounded-full transition-[width] duration-500"
                              style={{
                                backgroundColor: language.color,
                                width: `${Math.min(language.percentage, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-600 dark:text-neutral-400">
                      No language data is available yet.
                    </p>
                  )}
                </section>

                <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_22px_65px_-55px_rgba(15,23,42,0.6)] dark:border-neutral-800 dark:bg-neutral-950">
                  <div className="flex items-center gap-2">
                    <BookMarked className="h-4 w-4 text-slate-600 dark:text-neutral-400" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Featured Repositories
                    </h3>
                  </div>
                  {stats.topRepos && stats.topRepos.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {stats.topRepos.slice(0, 4).map((repo) => (
                        <RepositoryCard key={`${repo.name}-${repo.url}`} repo={repo} />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-600 dark:text-neutral-400">
                      No public repositories to highlight yet.
                    </p>
                  )}
                </section>
              </div>
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
    <div className="rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_18px_55px_-45px_rgba(15,23,42,0.55)] dark:border-neutral-800 dark:bg-gradient-to-br dark:from-neutral-950 dark:to-neutral-900">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-neutral-900">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">{label}</p>
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

function RepositoryCard({ repo }: { repo: TopRepo }) {
  return (
    <a
      href={repo.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-[22px] border border-slate-200/80 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-950"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-700 dark:text-neutral-500 dark:group-hover:text-neutral-300" />
            <p className="truncate font-semibold text-slate-900 dark:text-white">
              {repo.name}
            </p>
          </div>
          {repo.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">
              {repo.description}
            </p>
          )}
        </div>
        <ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400 transition-colors group-hover:text-slate-700 dark:text-neutral-500 dark:group-hover:text-neutral-300" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-neutral-500">
        {repo.language && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor:
                  LANGUAGE_COLORS[repo.language] || LANGUAGE_COLORS.Other,
              }}
            />
            {repo.language}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5" />
          {repo.stars}
        </span>
        <span className="inline-flex items-center gap-1">
          <GitFork className="h-3.5 w-3.5" />
          {repo.forks}
        </span>
        {repo.updatedAt && (
          <span>
            Updated{' '}
            {new Date(repo.updatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        )}
      </div>
    </a>
  );
}
