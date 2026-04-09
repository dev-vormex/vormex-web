'use client';

import { useRef } from 'react';

export function useThrottledCallback<T extends (...args: any[]) => void>(
  callback: T,
  waitMs: number
): T {
  const lastRunRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = waitMs - (now - lastRunRef.current);

    if (remaining <= 0) {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      lastRunRef.current = now;
      callback(...args);
      return;
    }

    if (!timeoutRef.current) {
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        lastRunRef.current = Date.now();
        callback(...args);
      }, remaining);
    }
  }) as T;
}
