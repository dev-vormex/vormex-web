'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, Loader2, RotateCcw, X } from 'lucide-react';
import { usePostingStatus, type PostingPhase } from '@/lib/feed/postingStatus';

const PHASE_LABEL: Record<PostingPhase, string> = {
  uploading: 'Posting',
  finishing: 'Almost there',
  done: 'Posted',
  failed: "Couldn't post",
};

/**
 * Compact upload indicator for the feed header.
 *
 * The composer closes the moment a post is submitted, so this is the only place
 * the upload remains visible — and the only route back to a draft whose upload
 * failed. It renders nothing when no post is in flight.
 */
export function PostingStatusChip() {
  const { job, retry, dismiss } = usePostingStatus();

  const failed = job?.phase === 'failed';
  const done = job?.phase === 'done';
  const lineColor = failed ? 'bg-red-500' : done ? 'bg-green-500' : 'bg-blue-600';

  return (
    <AnimatePresence>
      {job && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          role="status"
          aria-live="polite"
          className={`relative flex items-center gap-2 overflow-hidden rounded-xl border bg-white/90 py-1.5 pl-1.5 pr-2 shadow-sm backdrop-blur dark:bg-neutral-900/90 ${
            failed
              ? 'border-red-300 dark:border-red-500/40'
              : 'border-gray-200 dark:border-neutral-800'
          }`}
        >
          {job.thumbnailUrl ? (
            // Local object URL of the user's own file, so next/image would add a
            // remote-loader round trip for no benefit.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={job.thumbnailUrl}
              alt=""
              className="h-7 w-7 flex-shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
                failed
                  ? 'bg-red-50 dark:bg-red-500/10'
                  : done
                    ? 'bg-green-50 dark:bg-green-500/10'
                    : 'bg-blue-50 dark:bg-blue-500/10'
              }`}
            >
              {failed ? (
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              ) : done ? (
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
              )}
            </span>
          )}

          <span className="max-w-[7.5rem] truncate text-xs font-medium text-gray-700 dark:text-neutral-200 sm:max-w-none">
            {PHASE_LABEL[job.phase]}
            {job.phase === 'uploading' && !job.indeterminate && (
              <span className="ml-1 font-normal text-gray-400 dark:text-neutral-500">
                {Math.round(job.progress * 100)}%
              </span>
            )}
          </span>

          {failed && (
            <>
              <button
                type="button"
                onClick={retry}
                className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
              >
                <RotateCcw className="h-3 w-3" />
                Retry
              </button>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Discard this post"
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {/* The line that fills across the chip as the upload lands. */}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[3px] bg-gray-100 dark:bg-neutral-800"
          >
            <span
              className={`block h-full ${lineColor} ${
                job.indeterminate
                  ? 'animate-posting-indeterminate w-1/3'
                  : 'transition-[width] duration-300 ease-out'
              }`}
              style={job.indeterminate ? undefined : { width: `${Math.round(job.progress * 100)}%` }}
            />
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
