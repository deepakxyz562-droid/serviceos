'use client';

/**
 * useMarketplaceProviders
 * ------------------------
 * TanStack Query hook that powers the marketplace browse grid's
 * server-side cursor pagination.
 *
 * ARCHITECTURE
 * ------------
 * The old approach fetched up to 1000 providers in a single SSR query and
 * shipped them all to the client as serialized HTML props. The client then
 * filtered + sorted the full 1000-row array in JS on every keystroke. This
 * was slow to first paint, expensive to hydrate, and wasteful on the DB.
 *
 * The new approach is hybrid:
 *
 *   1. SSR fetches only the FIRST PAGE (24 items) for SEO + instant paint.
 *      This is passed to the browser component as `initialProviders`.
 *   2. This hook wraps `useInfiniteQuery` with the first page seeded from
 *      `initialProviders` (via `initialPageParam` + `initialData`).
 *   3. As the user scrolls, the IntersectionObserver in MarketplaceBrowser
 *      calls `fetchNextPage()` → this hook fetches the next page from
 *      `/api/marketplace/providers?cursor=<nextCursor>`.
 *   4. When any filter (search/city/vertical/industry/trust) changes, the
 *      `queryKey` changes → React Query automatically resets to page 1 and
 *      refetches. No manual reset logic needed.
 *
 * SORT HANDLING
 * -------------
 * The server always fetches in (rating DESC, reviewCount DESC, id DESC)
 * order — this is the stable, indexed keyset. The client can re-sort the
 * loaded pages however it wants (recommended/distance/name/etc.) within
 * the loaded set. When the sort changes, the hook does NOT refetch — it
 * just re-sorts the already-loaded items (instant UX). The cursor remains
 * valid because the underlying fetch order is unchanged.
 *
 * DEBOUNCING
 * ----------
 * Free-text search and city filters are debounced 300ms before triggering
 * a refetch. This prevents a request storm on every keystroke. Vertical /
 * industry / trust toggles are instant (no debounce — they're discrete
 * clicks, not continuous typing).
 *
 * LOCATION
 * --------
 * The user's location (GPS/IP/manual) is NOT sent to the server in cursor
 * mode. The server fetches by rating; the client re-ranks with
 * `rankProviders()` using the detected location. This keeps the cursor
 * stable regardless of location changes (which can happen mid-session when
 * GPS resolves). A future enhancement could send lat/lng to the server for
 * true distance-sorted pagination, but the current approach is a good
 * trade-off between correctness and complexity.
 *
 * SSR SEEDING
 * -----------
 * The SSR page fetches page 1 (24 items) + computes the `nextCursor` +
 * `total` count. It passes all three to this hook as `initialProviders`,
 * `initialNextCursor`, and `initialTotal`. The hook seeds React Query's
 * cache with this data so:
 *   • The first paint shows the SSR items instantly (no loading flash).
 *   • `fetchNextPage()` uses the real `initialNextCursor` to fetch page 2
 *     (NO duplicate fetch of page 1).
 *   • The sidebar's "Active providers" stat shows `initialTotal` before
 *     any client-side fetch completes.
 */

import { useInfiniteQuery, keepPreviousData, type InfiniteData } from '@tanstack/react-query';
import * as React from 'react';
import type { ProviderListItem } from './types';

/** A single page of providers from the API. */
interface ProviderPage {
  items: ProviderListItem[];
  nextCursor: string | null;
  total: number | null;
}

/** The shape of data stored in the React Query cache. */
type ProvidersQueryData = InfiniteData<ProviderPage, string | null>;

/** Parameters that control which providers are fetched. */
export interface UseMarketplaceProvidersParams {
  /** ISO country code from GeoIP (or ?country= override). null = no filter. */
  country: string | null;
  /** Debounced free-text search query (name / tagline / description). */
  search: string;
  /** Debounced city filter (substring on city / state / serviceAreas). */
  city: string;
  /** Vertical filter (e.g. 'home-property'). null = no vertical filter. */
  vertical: string | null;
  /** Industry filter (e.g. 'hvac'). null = no industry filter. */
  industry: string | null;
  /** Trust filter: only fully-verified providers (4 gates). */
  trustFullyVerified: boolean;
  /** Trust filter: only rating >= 4.8. */
  trustRatingHigh: boolean;
  /** Trust filter: only 24/7 emergency providers. */
  trustEmergency: boolean;
  /** Page size (default 24). */
  pageSize?: number;
}

export interface UseMarketplaceProvidersResult {
  /** All providers loaded across all pages (flattened). */
  providers: ProviderListItem[];
  /** Total count of matching providers (from page 1's `total` field). null = unknown. */
  total: number | null;
  /** Whether there are more pages to load. */
  hasNextPage: boolean;
  /** Whether the next page is currently being fetched. */
  isFetchingNextPage: boolean;
  /** Whether the initial query is loading (first page). */
  isLoading: boolean;
  /** Whether any query is currently fetching (including background refetches). */
  isFetching: boolean;
  /** Fetch the next page (called by IntersectionObserver). No-op if no next page. */
  fetchNextPage: () => void;
  /** Error from the last failed fetch, if any. */
  error: Error | null;
  /** Re-run the query for ALL loaded pages. Used by the retry banner in
   *  MarketplaceBrowser when `error` is set — handles both the infinite-
   *  scroll failure case (a `fetchNextPage` retry would only re-fetch the
   *  failed page) AND the filter-change failure case (where the initial
   *  page 1 fetch failed and `fetchNextPage` would be a no-op because
   *  `hasNextPage` is false). */
  refetch: () => void;
}

/**
 * Build the query key for the infinite query. React Query uses this to
 * cache + dedupe requests. When ANY of these values change, the query is
 * considered "new" and page 1 is refetched.
 *
 * We deliberately EXCLUDE the sort key from the query key — sort changes
 * are handled client-side (re-sort the loaded items) and should NOT
 * trigger a refetch. The server always fetches in the same stable order
 * (rating DESC, reviewCount DESC, id DESC), so the cached pages remain
 * valid regardless of which client-side sort is active.
 */
function buildQueryKey(params: UseMarketplaceProvidersParams) {
  return [
    'marketplace',
    'providers',
    {
      country: params.country ?? 'all',
      search: params.search.trim().toLowerCase(),
      city: params.city.trim().toLowerCase(),
      vertical: params.vertical ?? 'all',
      industry: params.industry ?? 'all',
      trustFullyVerified: params.trustFullyVerified,
      trustRatingHigh: params.trustRatingHigh,
      trustEmergency: params.trustEmergency,
      pageSize: params.pageSize ?? 24,
    },
  ] as const;
}

/**
 * Fetch a single page from the API. Returns the parsed JSON.
 * Throws on non-2xx responses so React Query's retry logic kicks in.
 */
async function fetchPage(
  params: UseMarketplaceProvidersParams,
  cursor: string | null,
): Promise<ProviderPage> {
  const url = new URL('/api/marketplace/providers', window.location.origin);
  // cursor=null means "first page" (cursor param present but empty).
  // cursor='<base64>' means "next page after this cursor".
  url.searchParams.set('cursor', cursor ?? '');
  url.searchParams.set('pageSize', String(params.pageSize ?? 24));
  if (params.country) url.searchParams.set('country', params.country);
  if (params.search.trim()) url.searchParams.set('search', params.search.trim());
  if (params.city.trim()) url.searchParams.set('city', params.city.trim());
  if (params.vertical) url.searchParams.set('vertical', params.vertical);
  if (params.industry) url.searchParams.set('industry', params.industry);
  if (params.trustFullyVerified) url.searchParams.set('trustFullyVerified', 'true');
  if (params.trustRatingHigh) url.searchParams.set('trustRatingHigh', 'true');
  if (params.trustEmergency) url.searchParams.set('trustEmergency', 'true');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch providers (${res.status})`);
  }
  const data = (await res.json()) as ProviderPage;
  // Defensive: ensure items is always an array (a misbehaving cache or proxy
  // could return a non-array).
  if (!Array.isArray(data.items)) {
    return { items: [], nextCursor: null, total: data.total ?? null };
  }
  return data;
}

/**
 * Hook for server-side cursor pagination of marketplace providers.
 *
 * @param params             Filter + pagination params (see interface above).
 * @param initialProviders   The SSR-fetched first page (24 items). Used to
 *                           seed the cache so the first paint is instant.
 * @param initialNextCursor  The SSR-computed cursor for page 2. null = no
 *                           more pages. This is the KEY param — without it,
 *                           the hook would have to re-fetch page 1 to learn
 *                           the cursor.
 * @param initialTotal       The SSR-fetched total count. Used for the sidebar
 *                           "Active providers" stat.
 *
 * @returns See UseMarketplaceProvidersResult.
 */
export function useMarketplaceProviders(
  params: UseMarketplaceProvidersParams,
  initialProviders?: ProviderListItem[],
  initialNextCursor?: string | null,
  initialTotal?: number,
): UseMarketplaceProvidersResult {
  const queryKey = buildQueryKey(params);
  const hasInitialData = !!initialProviders && initialProviders.length > 0;

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(params, pageParam),
    initialPageParam: null as string | null,
    ...(hasInitialData
      ? {
          initialData: (): ProvidersQueryData => ({
            pages: [
              {
                items: initialProviders!,
                nextCursor: initialNextCursor ?? null,
                total: initialTotal ?? null,
              },
            ],
            pageParams: [null],
          }),
        }
      : {}),
    getNextPageParam: (lastPage: ProviderPage): string | null => lastPage.nextCursor,
    // Don't refetch on window focus — marketplace data doesn't change often,
    // and refetching would reset the user's scroll position by replacing the
    // loaded pages.
    refetchOnWindowFocus: false,
    staleTime: 30_000, // 30s — matches the API's TTL cache
    gcTime: 5 * 60 * 1000, // 5 min — keep pages in memory for back navigation
    // Retry once on 5xx (network blips), but don't retry 4xx (client error —
    // retrying wastes time and blocks further pagination).
    retry: (failureCount, error: Error & { status?: number }) => {
      const status = (error as Error & { status?: number }).status ?? 0;
      if (status >= 400 && status < 500) return false;
      return failureCount < 2;
    },
    // Keep previous data visible while a new filter fetch is in flight —
    // prevents the grid from blanking out on every filter change.
    placeholderData: keepPreviousData,
  });

  // Flatten all pages into a single provider array.
  const providers = React.useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap((p) => p.items);
  }, [query.data]);

  // Extract the total from the first page (only page 1 returns a total).
  const total = React.useMemo(() => {
    if (!query.data || query.data.pages.length === 0) return initialTotal ?? null;
    return query.data.pages[0].total ?? initialTotal ?? null;
  }, [query.data, initialTotal]);

  // hasNextPage: true if the last page has a nextCursor.
  const hasNextPage = React.useMemo(() => {
    if (!query.data || query.data.pages.length === 0) return false;
    const lastPage = query.data.pages[query.data.pages.length - 1];
    return lastPage.nextCursor !== null;
  }, [query.data]);

  // fetchNextPage: no-op if there's no next page or a fetch is in progress.
  // We don't memoize this with useCallback — React Query's fetchNextPage is
  // already stable, and the guard check is cheap. The IntersectionObserver
  // effect that calls this re-creates when `loadedProviders.length` changes
  // (a more meaningful dependency than the function identity).
  const fetchNextPage = () => {
    if (!hasNextPage || query.isFetchingNextPage) return;
    void query.fetchNextPage();
  };

  // refetch: re-runs the query for ALL loaded pages. Used by the retry
  // banner in MarketplaceBrowser. Wrapped in `void` so callers can fire-
  // and-forget without an unhandled promise rejection warning.
  const refetch = () => {
    void query.refetch();
  };

  return {
    providers,
    total,
    hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    fetchNextPage,
    error: query.error,
    refetch,
  };
}
