'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // CRM list views (jobs, pipeline, inbox) should feel live. A 10s
            // staleTime means React Query will refetch in the background when
            // the user switches tabs / re-focuses the window, without
            // hammering the server on every render. Combined with the
            // no-store browser cache (src/lib/cache-headers.ts) and the SW v5
            // no-store respect, this gives instant fresh data on tab switch.
            staleTime: 10 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            // Refetch on window focus so switching back to the dashboard tab
            // pulls fresh CRM data. Previously this was `false`, which meant
            // a user who edited a job in another tab and switched back saw
            // stale data until they manually refreshed.
            refetchOnWindowFocus: true,
            // Refetch on reconnect too — if the user was offline, sync up
            // the moment the network comes back.
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
