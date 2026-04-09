'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ACTIVITY_STALE_TIME,
  CHAT_STALE_TIME,
  FEED_STALE_TIME,
  FIND_PEOPLE_STALE_TIME,
  PROFILE_STALE_TIME,
  STANDARD_GC_TIME,
  STANDARD_STALE_TIME,
} from '@/lib/queryKeys';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: STANDARD_STALE_TIME,
            gcTime: STANDARD_GC_TIME,
            refetchOnWindowFocus: false,
          },
        },
      });

      client.setQueryDefaults(['feed'], { staleTime: FEED_STALE_TIME });
      client.setQueryDefaults(['profile'], { staleTime: PROFILE_STALE_TIME });
      client.setQueryDefaults(['profile-activity-years'], { staleTime: ACTIVITY_STALE_TIME });
      client.setQueryDefaults(['profile-activity-heatmap'], { staleTime: ACTIVITY_STALE_TIME });
      client.setQueryDefaults(['find-people-initial'], { staleTime: FIND_PEOPLE_STALE_TIME });
      client.setQueryDefaults(['people-filter-options'], { staleTime: FIND_PEOPLE_STALE_TIME });
      client.setQueryDefaults(['chat-conversations'], { staleTime: CHAT_STALE_TIME });
      client.setQueryDefaults(['chat-conversation'], { staleTime: CHAT_STALE_TIME });
      client.setQueryDefaults(['chat-messages'], { staleTime: CHAT_STALE_TIME });

      return client;
    }
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
