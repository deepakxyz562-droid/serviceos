'use client';

/**
 * useMarketplaceCounts
 * ---------------------
 * Fetches REAL database-level provider counts (grouped by vertical +
 * industry) from /api/marketplace/counts. Used by the marketplace
 * sidebar so the "(N)" count next to each category reflects the TRUE
 * total — not the count of currently-loaded items (which caps at 24
 * due to cursor pagination).
 *
 * The hook is country-aware: when the user's country changes (e.g. via
 * GeoIP or manual selection), the counts are refetched for that country.
 *
 * Caching: React Query keeps the result fresh for 60s (staleTime) and
 * in memory for 5 min (gcTime) — matches the API's TTL.
 */

import { useQuery } from '@tanstack/react-query';

export interface MarketplaceCounts {
  byVertical: Record<string, number>;
  byIndustry: Record<string, number>;
  total: number;
}

async function fetchCounts(country: string | null): Promise<MarketplaceCounts> {
  const url = new URL('/api/marketplace/counts', window.location.origin);
  if (country) url.searchParams.set('country', country);

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch counts (${res.status})`);
  }
  const data = (await res.json()) as MarketplaceCounts;
  return {
    byVertical: data.byVertical ?? {},
    byIndustry: data.byIndustry ?? {},
    total: data.total ?? 0,
  };
}

export function useMarketplaceCounts(country: string | null) {
  return useQuery<MarketplaceCounts>({
    queryKey: ['marketplace', 'counts', { country: country ?? 'all' }],
    queryFn: () => fetchCounts(country),
    staleTime: 60_000, // 60s — counts change rarely
    gcTime: 5 * 60 * 1000, // 5 min — keep in memory for back navigation
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
