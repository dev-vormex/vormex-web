/**
 * One card language for the whole feed.
 *
 * Before this existed the feed mixed three surfaces: the story/composer band
 * used `rounded-[28px]` with a soft shadow, PostCard used `rounded-xl` with a
 * hard border, and the sponsored card used something in between — so a
 * sponsored card read as a rendering bug rather than as a sponsor. Everything
 * that sits in the feed column now shares FEED_SURFACE, and everything in a
 * side rail shares PANEL_SURFACE.
 *
 * Keep these as the single source of truth. If a card needs to look different,
 * change it here so every surface moves together.
 */

/**
 * Items in the main feed column: posts, sponsored cards, recommendation
 * modules. Full-bleed band on mobile (the column has no horizontal padding
 * there) and a floating card from `sm` up.
 */
export const FEED_SURFACE = [
  'overflow-hidden bg-white dark:bg-neutral-900',
  'border-y border-gray-200/80 dark:border-neutral-800/80',
  'sm:rounded-[20px] sm:border',
  'sm:shadow-[0_18px_45px_-40px_rgba(15,23,42,0.55)]',
].join(' ');

/** Rounded at every breakpoint — sidebar cards, the left nav, the composer. */
export const PANEL_SURFACE = [
  'overflow-hidden rounded-[18px] bg-white dark:bg-neutral-900',
  'border border-gray-200/80 dark:border-neutral-800/80',
  'shadow-[0_18px_45px_-40px_rgba(15,23,42,0.55)]',
].join(' ');

/** The small cards inside a horizontal rail (people, reels, jobs, events). */
export const RAIL_CARD = [
  'flex-shrink-0 overflow-hidden rounded-2xl',
  'border border-gray-200/70 bg-white dark:border-neutral-800 dark:bg-neutral-900/60',
  'transition-all duration-200',
  'hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md',
  'dark:hover:border-neutral-700',
].join(' ');

/** Section label above a rail. */
export const RAIL_HEADING =
  'text-[13px] font-semibold tracking-tight text-gray-900 sm:text-sm dark:text-white';

/** "See all" style affordance. */
export const RAIL_ACTION = [
  'flex items-center gap-0.5 rounded-full px-2 py-1',
  'text-[11px] font-medium text-blue-600 sm:text-xs',
  'transition-colors hover:bg-blue-50',
  'dark:text-blue-400 dark:hover:bg-blue-950/40',
].join(' ');

/**
 * The reason chip on a person card. Deliberately neutral rather than a colored
 * "score" pill — it carries a human reason ("Same campus"), not a number.
 */
export const REASON_CHIP = [
  'inline-block max-w-full truncate rounded-full px-2 py-[3px]',
  'text-[10px] font-medium leading-none',
  'bg-gray-100 text-gray-600',
  'dark:bg-neutral-800 dark:text-neutral-300',
].join(' ');

/** Reason chip for a signal worth emphasising (fast replies, online now). */
export const REASON_CHIP_STRONG = [
  'inline-block max-w-full truncate rounded-full px-2 py-[3px]',
  'text-[10px] font-medium leading-none',
  'bg-emerald-50 text-emerald-700',
  'dark:bg-emerald-950/50 dark:text-emerald-300',
].join(' ');

/** Muted "Sponsored" / "Suggested" eyebrow above card content. */
export const CARD_EYEBROW =
  'text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-neutral-500';
