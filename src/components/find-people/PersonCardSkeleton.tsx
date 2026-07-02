'use client';

export function PersonCardSkeleton() {
  return (
    <div className="flex flex-col bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 overflow-hidden shadow-sm animate-pulse">
      <div className="h-16 bg-gray-100 dark:bg-neutral-800" />
      <div className="flex justify-center">
        <div className="-mt-10 w-20 h-20 rounded-full ring-4 ring-white dark:ring-neutral-900 bg-gray-200 dark:bg-neutral-700" />
      </div>
      <div className="flex flex-col flex-1 items-center px-4 pt-3 pb-4">
        <div className="h-4 w-32 bg-gray-200 dark:bg-neutral-700 rounded" />
        <div className="mt-2 h-3 w-20 bg-gray-200 dark:bg-neutral-700 rounded" />
        <div className="mt-3 h-3.5 w-4/5 bg-gray-200 dark:bg-neutral-700 rounded" />
        <div className="mt-2 h-3 w-3/5 bg-gray-200 dark:bg-neutral-700 rounded" />
        <div className="mt-3 flex justify-center gap-1.5">
          <div className="h-5 w-14 bg-gray-200 dark:bg-neutral-700 rounded-md" />
          <div className="h-5 w-16 bg-gray-200 dark:bg-neutral-700 rounded-md" />
          <div className="h-5 w-12 bg-gray-200 dark:bg-neutral-700 rounded-md" />
        </div>
        <div className="mt-auto w-full pt-4">
          <div className="h-8 w-full bg-gray-200 dark:bg-neutral-700 rounded-full" />
        </div>
      </div>
    </div>
  );
}
