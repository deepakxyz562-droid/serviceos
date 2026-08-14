'use client';

/**
 * useMarketplaceCities
 * ----------------------
 * Fetches the list of active cities (cities with at least one
 * marketplace-enabled provider) for a given country code.
 *
 * Replaces the raw `fetch()` that was previously inlined in
 * LocationChip's useEffect. React Query deduplicates concurrent
 * requests with the same query key — if two LocationChip components
 * mount simultaneously (or the country changes rapidly US→CA→US),
 * only ONE network request fires per (country) key.
 *
 * Caching:
 *   - staleTime: 5 min — cities change rarely (providers onboard
 *     over days/weeks, not seconds). Matches the server-side
 *     sharedCacheWrap TTL so the client never re-requests a still-fresh
 *     server cache entry.
 *   - gcTime: 10 min — keep in memory for back navigation.
 */

import { useQuery } from '@tanstack/react-query';
import type { MarketplaceCity } from '@/lib/marketplace-cities';

async function fetchCities(country: string): Promise<MarketplaceCity[]> {
  const url = new URL('/api/marketplace/cities', window.location.origin);
  url.searchParams.set('country', country);

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch cities (${res.status})`);
  }
  const data = (await res.json()) as MarketplaceCity[];
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch active cities for a country.
 *
 * @param country  ISO country code (e.g. 'US'). Pass null to skip the
 *                 query (returns empty array, no request fires).
 */
export function useMarketplaceCities(country: string | null) {
  return useQuery<MarketplaceCity[]>({
    queryKey: ['marketplace', 'cities', { country: country ?? 'none' }],
    queryFn: () => fetchCities(country!),
    enabled: !!country,
    staleTime: 5 * 60_000, // 5 min — matches server sharedCacheWrap fresh TTL
    gcTime: 10 * 60_000, // 10 min — keep for back navigation
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
