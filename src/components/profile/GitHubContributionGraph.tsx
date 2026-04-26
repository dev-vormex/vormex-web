'use client';

import { useState } from 'react';
import { CalendarDays, Flame, Sparkles } from 'lucide-react';
import type {
  GitHubContributionCalendar,
  GitHubContributionDay,
} from '@/types/profile';

interface GitHubContributionGraphProps {
  contributionCalendar: GitHubContributionCalendar;
  username?: string | null;
}

const DAY_LABELS = [
  { label: 'Mon', row: 3 },
  { label: 'Wed', row: 5 },
  { label: 'Fri', row: 7 },
];

function formatContributionDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function GitHubContributionGraph({
  contributionCalendar,
  username,
}: GitHubContributionGraphProps) {
  const [hoveredDay, setHoveredDay] = useState<GitHubContributionDay | null>(null);

  const allDays = contributionCalendar.weeks.flatMap((week) => week.contributionDays);
  const activeDays = allDays.filter((day) => day.contributionCount > 0).length;
  const peakDay =
    allDays.reduce<GitHubContributionDay | null>((currentPeak, day) => {
      if (!currentPeak || day.contributionCount > currentPeak.contributionCount) {
        return day;
      }
      return currentPeak;
    }, null) ?? null;
  const summaryDay = hoveredDay ?? peakDay ?? allDays.at(-1) ?? null;

  const legendColors =
    contributionCalendar.colors.length > 0
      ? contributionCalendar.colors
      : ['#9be9a8', '#40c463', '#30a14e', '#216e39'];

  const monthLabels: Array<{ label: string; columnStart: number }> = [];
  let runningColumn = 2;
  for (const month of contributionCalendar.months) {
    monthLabels.push({
      label: month.name.slice(0, 3),
      columnStart: runningColumn,
    });
    runningColumn += month.totalWeeks;
  }

  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-emerald-50/60 p-5 shadow-[0_20px_70px_-55px_rgba(15,23,42,0.55)] dark:border-neutral-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_rgba(10,10,10,1)_46%)]">
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-4 dark:border-neutral-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CalendarDays className="h-3.5 w-3.5" />
              Contribution Graph
            </div>
            <h3 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">
              Real GitHub activity, visible on the profile
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
              Past 12 months of public GitHub contributions
              {username ? ` for @${username}` : ''}.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/70">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-neutral-500">
              Last Year
            </p>
            <p className="mt-1 text-3xl font-semibold text-slate-950 dark:text-white">
              {contributionCalendar.totalContributions.toLocaleString()}
            </p>
            <p className="text-sm text-slate-600 dark:text-neutral-400">
              total contributions
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/60">
            <p className="text-xs font-medium text-slate-500 dark:text-neutral-500">
              Active Days
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {activeDays.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/60">
            <p className="text-xs font-medium text-slate-500 dark:text-neutral-500">
              Peak Day
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {peakDay?.contributionCount?.toLocaleString() ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950/60">
            <p className="text-xs font-medium text-slate-500 dark:text-neutral-500">
              Contribution Years
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {contributionCalendar.contributionYears.length > 0
                ? `${Math.min(...contributionCalendar.contributionYears)} - ${Math.max(...contributionCalendar.contributionYears)}`
                : 'This year'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto pb-2">
        <div className="min-w-max rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/80">
          <div
            className="inline-grid gap-x-1 gap-y-1"
            style={{
              gridTemplateColumns: `28px repeat(${contributionCalendar.weeks.length}, minmax(0, 13px))`,
              gridTemplateRows: '18px repeat(7, 13px)',
            }}
          >
            <div />

            {monthLabels.map((month) => (
              <div
                key={`${month.label}-${month.columnStart}`}
                className="text-[10px] font-medium text-slate-500 dark:text-neutral-500"
                style={{
                  gridColumnStart: month.columnStart,
                  gridRowStart: 1,
                }}
              >
                {month.label}
              </div>
            ))}

            {DAY_LABELS.map((day) => (
              <div
                key={day.label}
                className="pr-1 text-[10px] font-medium text-slate-500 dark:text-neutral-500"
                style={{
                  gridColumnStart: 1,
                  gridRowStart: day.row,
                }}
              >
                {day.label}
              </div>
            ))}

            {contributionCalendar.weeks.map((week, weekIndex) =>
              week.contributionDays.map((day) => {
                const isInactive = day.contributionCount === 0;

                return (
                  <button
                    key={`${week.firstDay}-${day.date}`}
                    type="button"
                    onMouseEnter={() => setHoveredDay(day)}
                    onFocus={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`h-[13px] w-[13px] rounded-[4px] border transition-transform duration-150 hover:scale-110 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                      isInactive
                        ? 'border-slate-300/70 bg-slate-200/90 dark:border-neutral-800 dark:bg-neutral-900'
                        : 'border-black/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] dark:border-white/10'
                    }`}
                    style={{
                      backgroundColor: isInactive ? undefined : day.color,
                      gridColumnStart: weekIndex + 2,
                      gridRowStart: day.weekday + 2,
                    }}
                    title={`${day.contributionCount} contributions on ${formatContributionDate(day.date)}`}
                    aria-label={`${day.contributionCount} contributions on ${formatContributionDate(day.date)}`}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t border-slate-200/80 pt-4 dark:border-neutral-800">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-neutral-400">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <span>
              {summaryDay
                ? `${summaryDay.contributionCount.toLocaleString()} contributions on ${formatContributionDate(summaryDay.date)}`
                : 'No contribution activity available yet.'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-500">
            <span>Less</span>
            <span className="h-3 w-3 rounded-[4px] border border-slate-300/70 bg-slate-200/90 dark:border-neutral-800 dark:bg-neutral-900" />
            {legendColors.map((color) => (
              <span
                key={color}
                className="h-3 w-3 rounded-[4px] border border-black/5 dark:border-white/10"
                style={{ backgroundColor: color }}
              />
            ))}
            <span>More</span>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-500">
          <Flame className="h-3.5 w-3.5 text-orange-500" />
          GitHub counts contributions based on repository activity visible on the profile graph.
        </div>
      </div>
    </section>
  );
}
