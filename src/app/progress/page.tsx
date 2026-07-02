'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Coins, Flame, Loader2, Trophy, Zap } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { progressAPI, type ProgressOverview } from '@/lib/api/progress';

function getErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as { response?: { data?: { error?: unknown } }; message?: unknown };
  if (typeof candidate.response?.data?.error === 'string') return candidate.response.data.error;
  if (typeof candidate.message === 'string') return candidate.message;
  return fallback;
}

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-500 dark:text-neutral-500">{label}</p>
          <p className="text-2xl font-bold text-gray-950 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    setError(null);
    try {
      setProgress(await progressAPI.getMine());
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not load progress.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const percent = Math.round((progress?.xp.progressToNextLevel || 0) * 100);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50 pb-24 text-gray-950 dark:bg-neutral-950 dark:text-white">
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
            <Link href="/more" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-900" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Progress</h1>
              <p className="text-sm text-gray-500 dark:text-neutral-400">XP, Coins, levels, and streak rules</p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : progress && (
            <>
              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={Trophy} label="Level" value={`${progress.xp.level} ${progress.xp.levelName}`} tone="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300" />
                <StatCard icon={Zap} label="Lifetime XP" value={progress.xp.lifetimeXp.toLocaleString()} tone="bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300" />
                <StatCard icon={Coins} label="Coins" value={progress.coins.balance.toLocaleString()} tone="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300" />
                <StatCard icon={Flame} label="Streak" value={progress.streak.current} tone="bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300" />
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Level Progress</h2>
                    <p className="text-sm text-gray-500 dark:text-neutral-400">
                      {progress.xp.xpIntoLevel.toLocaleString()} XP into this level - {progress.xp.xpToNextLevel.toLocaleString()} XP to next level
                    </p>
                  </div>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-300">{percent}%</p>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-neutral-800">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                  <h2 className="text-lg font-semibold">Earn XP</h2>
                  <div className="mt-4 grid gap-2">
                    {progress.xp.rules.map((rule) => (
                      <div key={rule.action} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 text-sm dark:bg-neutral-950">
                        <div>
                          <p className="font-semibold">{rule.action}</p>
                          <p className="text-gray-500 dark:text-neutral-400">{rule.description}</p>
                        </div>
                        <span className="font-bold text-blue-600 dark:text-blue-300">{rule.amount ? `+${rule.amount}` : 'Varies'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                  <h2 className="text-lg font-semibold">Streaks</h2>
                  <div className="mt-4 grid gap-2">
                    {Object.entries(progress.streak.categories).map(([key, value]) => (
                      <div key={key} className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-neutral-950">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold capitalize">{key}</p>
                          <p className="font-bold">{value.current} current</p>
                        </div>
                        <p className="mt-1 text-gray-500 dark:text-neutral-400">Best {value.longest} - Last {value.lastDate || 'none'}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-800 dark:bg-orange-950/30 dark:text-orange-200">
                    {progress.streak.isAtRisk ? 'Your daily activity streak is at risk today.' : progress.streak.qualifiedToday ? 'You qualified for today.' : 'Do one meaningful action to qualify today.'}
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <h2 className="text-lg font-semibold">Recent Coin Activity</h2>
                <div className="mt-4 grid gap-2">
                  {progress.coins.recentTransactions.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-neutral-400">No coin activity yet.</p>
                  ) : (
                    progress.coins.recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 text-sm dark:bg-neutral-950">
                        <div>
                          <p className="font-semibold">{transaction.description || transaction.type}</p>
                          <p className="text-gray-500 dark:text-neutral-400">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={transaction.amount >= 0 ? 'font-bold text-emerald-600 dark:text-emerald-300' : 'font-bold text-red-600 dark:text-red-300'}>
                          {transaction.amount >= 0 ? '+' : ''}{transaction.amount}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
