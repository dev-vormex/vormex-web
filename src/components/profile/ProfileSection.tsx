'use client';

import { motion } from 'framer-motion';
import { Pencil, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────────────────────────────────
   Scroll-reveal primitives — sections and items animate in as they enter
   the viewport (once), giving the profile a smooth scrolling experience.
──────────────────────────────────────────────────────────────────────────── */

const EASE = [0.22, 0.61, 0.36, 1] as const;

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/** Fade + rise reveal for whole sections as they scroll into view. */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-64px 0px' }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface RevealItemProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
  onClick?: () => void;
}

/** Staggered reveal for cards/rows inside a section. */
export function RevealItem({ children, index = 0, className, onClick }: RevealItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px 0px' }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04, ease: EASE }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   ProfileSection — shared card shell so every profile section looks like it
   belongs to one design system: rounded card, tinted icon chip, clean header.
──────────────────────────────────────────────────────────────────────────── */

interface ProfileSectionProps {
  icon: React.ReactNode;
  title: string;
  count?: number;
  subtitle?: string;
  action?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function ProfileSection({
  title,
  count,
  subtitle,
  action,
  headerExtra,
  children,
  className,
  contentClassName,
}: ProfileSectionProps) {
  return (
    <Reveal className="min-w-0 max-w-full">
      <section
        className={cn(
          'w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900',
          className
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-6 sm:pb-3 sm:pt-5">
          <div className="flex min-w-0 items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="break-words text-base font-semibold tracking-tight text-neutral-900 dark:text-white sm:text-lg">
                  {title}
                </h2>
                {typeof count === 'number' && count > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {count}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="mt-0.5 break-words text-xs text-neutral-500 dark:text-neutral-400">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {action && <div className="flex max-w-full items-center gap-2">{action}</div>}
        </div>

        {headerExtra}

        <div className={cn('min-w-0 max-w-full p-4 sm:p-6', contentClassName)}>{children}</div>
      </section>
    </Reveal>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Shared header action + empty state so all sections stay consistent.
──────────────────────────────────────────────────────────────────────────── */

interface SectionAddButtonProps {
  onClick: () => void;
  label?: string;
}

export function SectionAddButton({ onClick, label = 'Add' }: SectionAddButtonProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
      aria-label={label}
      title={label}
    >
      <Plus className="h-5 w-5" />
    </button>
  );
}

interface SectionEditButtonProps {
  onClick: () => void;
  label?: string;
  active?: boolean;
}

export function SectionEditButton({
  onClick,
  label = 'Edit',
  active = false,
}: SectionEditButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center transition-colors ${
        active
          ? 'text-neutral-950 dark:text-white'
          : 'text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white'
      }`}
      aria-label={label}
      title={label}
      aria-pressed={active}
    >
      <Pencil className="h-5 w-5" />
    </button>
  );
}

interface SectionEmptyStateProps {
  icon: React.ReactNode;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionEmptyState({ icon, message, actionLabel, onAction }: SectionEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-10 text-center dark:border-neutral-700">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800">
        {icon}
      </div>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{message}</p>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
