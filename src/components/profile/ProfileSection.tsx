'use client';

import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
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
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-64px 0px' }}
      transition={{ duration: 0.6, delay, ease: EASE }}
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
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px 0px' }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.06, ease: EASE }}
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
  icon,
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
    <Reveal>
      <section
        className={cn(
          'rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900',
          'shadow-sm hover:shadow-lg hover:shadow-neutral-900/5 dark:hover:shadow-black/30',
          'transition-shadow duration-300 overflow-hidden',
          className
        )}
      >
        <div className="px-5 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              {icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-neutral-900 dark:text-white truncate">
                  {title}
                </h2>
                {typeof count === 'number' && count > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    {count}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>

        {headerExtra}

        <div className={cn('p-5 sm:p-6', contentClassName)}>{children}</div>
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
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-500/20 active:scale-95 transition-all"
    >
      <Plus className="w-3.5 h-3.5" />
      {label}
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
    <div className="text-center py-12 px-6 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/30">
      <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-sm flex items-center justify-center text-neutral-400">
        {icon}
      </div>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{message}</p>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
