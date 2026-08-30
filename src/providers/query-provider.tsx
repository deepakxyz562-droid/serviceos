'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // ─── Freshness Contract (Phase 1.7) ─────────────────────────────
            // 30s default staleTime — the BASELINE for non-CRM queries
            // (marketplace, settings, static config). CRM queries override
            // this to 10s via per-hook staleTime (see use-crm-data.ts and
            // use-supabase-queries.ts).
            //
            // Why 30s default (not 60s): the old 60s default meant CRM data
            // could be up to 60s stale on passive viewing. Now that mutation
            // invalidation is dependency-aware (Phase 1.3+1.4), the staleTime
            // only affects PASSIVE viewing — after a mutation, the cache is
            // invalidated immediately regardless of staleTime. So 30s is a
            // safe baseline that reduces background refetches without making
            // non-CRM data feel stale.
            //
            // Per-entity staleTimes (Freshness Contract):
            //   CRM lists (jobs/leads/customers/contacts/invoices/expenses): 10s
            //   CRM details: 10s
            //   Payments: 5s
            //   Dispatch/live status: 5s + polling
            //   Notifications: 5s + polling
            //   Conversations/inbox: 5s
            //   Marketplace providers: 60s (acceptable to be slightly stale)
            //   Marketplace counts: 300s
            //   Static config: 30s (default)
            staleTime: 30 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            // Refetch on window focus — kept enabled so switching back to
            // the CRM pulls fresh data. With per-hook staleTimes (10s for
            // CRM), this only triggers a refetch if the data is actually
            // stale (>10s old for CRM, >30s for non-CRM).
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
