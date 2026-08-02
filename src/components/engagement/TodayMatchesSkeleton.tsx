'use client';

export function TodayMatchesSkeleton() {
  return (
    <div className="relative mb-3">
      <div className="mb-2 flex items-center justify-between px-3 sm:px-4">
        <div>
          <div className="h-4 w-28 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </div>
      <div className="flex gap-2.5 overflow-hidden px-3 sm:gap-3 sm:px-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-[164px] flex-shrink-0 animate-pulse overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex justify-center pb-1.5 pt-3">
              <div className="h-14 w-14 rounded-full bg-gray-200 dark:bg-neutral-700" />
            </div>
            <div className="space-y-1.5 px-2.5 pb-2.5">
              <div className="mx-auto h-3.5 w-20 rounded bg-gray-200 dark:bg-neutral-700" />
              <div className="mx-auto h-2.5 w-14 rounded bg-gray-200 dark:bg-neutral-700" />
              <div className="mt-1.5 h-7 w-full rounded-full bg-gray-200 dark:bg-neutral-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
