'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ACTIVITY_STALE_TIME,
  CHAT_GC_TIME,
  CHAT_STALE_TIME,
  FEED_STALE_TIME,
  FIND_PEOPLE_STALE_TIME,
  GROUPS_GC_TIME,
  GROUPS_STALE_TIME,
  PROFILE_STALE_TIME,
  STANDARD_GC_TIME,
  STANDARD_STALE_TIME,
} from '@/lib/queryKeys';
import { isApiTimeoutError } from '@/lib/utils/errorHandler';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: STANDARD_STALE_TIME,
            gcTime: STANDARD_GC_TIME,
            refetchOnWindowFocus: false,
            // A timeout should immediately reach the page's visible Retry state.
            retry: (failureCount, error) => !isApiTimeoutError(error) && failureCount < 3,
          },
        },
      });

      client.setQueryDefaults(['feed'], { staleTime: FEED_STALE_TIME });
      client.setQueryDefaults(['profile'], { staleTime: PROFILE_STALE_TIME });
      client.setQueryDefaults(['profile-core'], { staleTime: PROFILE_STALE_TIME });
      client.setQueryDefaults(['profile-activity-years'], { staleTime: ACTIVITY_STALE_TIME });
      client.setQueryDefaults(['profile-activity-heatmap'], { staleTime: ACTIVITY_STALE_TIME });
      client.setQueryDefaults(['find-people-initial'], { staleTime: FIND_PEOPLE_STALE_TIME });
      client.setQueryDefaults(['people-search'], {
        staleTime: 2 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        retry: (failureCount, error) => !isApiTimeoutError(error) && failureCount < 2,
      });
      client.setQueryDefaults(['people-filter-options'], { staleTime: FIND_PEOPLE_STALE_TIME });
      client.setQueryDefaults(['smart-matches'], { staleTime: FIND_PEOPLE_STALE_TIME });
      client.setQueryDefaults(['chat-conversations'], {
        staleTime: CHAT_STALE_TIME,
        gcTime: CHAT_GC_TIME,
        refetchOnMount: false,
      });
      client.setQueryDefaults(['chat-conversation'], {
        staleTime: CHAT_STALE_TIME,
        gcTime: CHAT_GC_TIME,
        refetchOnMount: false,
      });
      client.setQueryDefaults(['chat-messages'], {
        staleTime: CHAT_STALE_TIME,
        gcTime: CHAT_GC_TIME,
        refetchOnMount: false,
      });
      client.setQueryDefaults(['groups'], {
        staleTime: GROUPS_STALE_TIME,
        gcTime: GROUPS_GC_TIME,
      });

      return client;
    }
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
