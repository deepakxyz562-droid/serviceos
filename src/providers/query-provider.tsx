'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 60s staleTime — previously 10s, which meant data went stale
            // almost immediately and every window focus / tab switch
            // triggered a background refetch of ALL active queries. On the
            // superadmin panel (7+ top-level useQuery hooks), this caused
            // constant network activity. 60s keeps CRM data feeling live
            // (users see fresh data within a minute) while reducing
            // background refetches by 6x. Individual queries that need
            // fresher data can override with a shorter staleTime.
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            // Refetch on window focus — kept enabled so switching back to
            // the dashboard pulls fresh CRM data. With the 60s staleTime
            // above, this only triggers a refetch if the data is actually
            // stale (>60s old), not on every alt-tab. Previously with 10s
            // staleTime, every focus event refetched all queries.
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
