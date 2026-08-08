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
 * The hook is location-aware: when the user's country or city filter
 * changes, the counts are refetched for that location so the sidebar
 * counts stay consistent with the providers list.
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

async function fetchCounts(
  country: string | null,
  city: string | null,
): Promise<MarketplaceCounts> {
  const url = new URL('/api/marketplace/counts', window.location.origin);
  if (country) url.searchParams.set('country', country);
  if (city) url.searchParams.set('city', city);

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

/**
 * Fetch real DB-level counts grouped by vertical + industry.
 *
 * @param country  ISO country code (e.g. 'US'), or null for global.
 * @param city     Optional city filter (case-insensitive substring on
 *                 city / state / serviceAreasJson). Pass null or empty
 *                 string to disable. Should already be debounced by the
 *                 caller to avoid refetching on every keystroke.
 */
export function useMarketplaceCounts(
  country: string | null,
  city: string | null = null,
) {
  // Normalize: treat empty string as null so the queryKey is stable
  // and the URL doesn't get an empty `city=` param.
  const normalizedCity = city && city.trim() ? city.trim() : null;

  return useQuery<MarketplaceCounts>({
    queryKey: [
      'marketplace',
      'counts',
      { country: country ?? 'all', city: normalizedCity ?? 'all' },
    ],
    queryFn: () => fetchCounts(country, normalizedCity),
    // staleTime: 0 — counts must ALWAYS reflect the current city/country
    // filter. When the user picks/clears a city, the sidebar count must
    // update immediately, not show a stale 60s-cached value. The counts
    // endpoint is a lightweight indexed COUNT query (~50ms), so refetching
    // on every filter change is cheap.
    staleTime: 0,
    gcTime: 5 * 60_000, // 5 min — keep in memory for back navigation
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
