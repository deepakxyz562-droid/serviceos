/**
 * use-marketplace — TanStack Query hooks for the customer marketplace.
 *
 * Mirrors the PWA customer portal's marketplace data layer:
 *   - useMarketplaceProviders  → useInfiniteQuery (cursor pagination, 24/page)
 *   - useMarketplaceCities     → useQuery        (city picker)
 *   - useMarketplaceCategories → useQuery        (categories from API, not hardcoded)
 *   - useProvider              → useQuery        (full provider profile with reviews)
 *   - useBookInstant           → useMutation     (POST /api/marketplace/book/instant)
 *   - useRequestQuote          → useMutation     (POST /api/marketplace/quote-request)
 *
 * API CONTRACTS (from BUILD REFERENCE):
 *   GET /api/marketplace/providers?cursor=&limit=24&city=&category=&sort=&q=
 *     → { items: Provider[], nextCursor, hasMore, total }
 *   GET /api/marketplace/cities  → MarketplaceCity[] | { cities: MarketplaceCity[] }
 *   GET /api/marketplace/counts  → { categories: [{ slug, name, count }], total }
 *   GET /api/marketplace/providers/[slug] → Provider (full)
 *   POST /api/marketplace/book/instant { providerId, serviceId, scheduledAt, address, notes } → Booking
 *   POST /api/marketplace/quote-request { providerId, serviceId, scheduledAt, address, notes } → { id }
 */
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Provider, MarketplaceCity, MarketplaceCategory } from '@/types';

// ── Types ────────────────────────────────────────────────────────────

export interface MarketplaceProvidersParams {
  city?: string;
  category?: string;
  sort?: string;
  q?: string;
  limit?: number;
}

interface ProvidersResponse {
  items: Provider[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

interface CitiesResponse {
  cities: MarketplaceCity[];
}

interface CountsResponse {
  categories: MarketplaceCategory[];
  total: number;
}

export interface BookInstantParams {
  providerId: string;
  serviceId?: string;
  scheduledAt: string;
  address?: string;
  notes?: string;
}

export interface QuoteRequestParams {
  providerId: string;
  serviceId?: string;
  scheduledAt?: string;
  address?: string;
  notes?: string;
}

// ── Hooks ────────────────────────────────────────────────────────────

/**
 * Paginated list of marketplace providers. Cursor-based, 24/page default.
 * Pass { city, category, sort, q } as filters; the queryKey changes trigger
 * an automatic refetch and TanStack Query handles the loader state.
 */
export function useMarketplaceProviders(params: MarketplaceProvidersParams = {}) {
  const limit = params.limit ?? 24;

  return useInfiniteQuery({
    queryKey: ['marketplace', 'providers', params],
    queryFn: async ({ pageParam }: { pageParam?: string }): Promise<ProvidersResponse> => {
      const query: Record<string, string | number | undefined> = {
        limit,
        sort: params.sort ?? 'recommended',
      };
      if (params.city) query.city = params.city;
      if (params.category) query.category = params.category;
      if (params.q) query.q = params.q;
      if (pageParam) query.cursor = pageParam;

      const res = await api.get<ProvidersResponse | Provider[]>(
        '/api/marketplace/providers',
        query
      );

      // Be defensive — backend may return either shape.
      if (Array.isArray(res)) {
        return { items: res, nextCursor: null, hasMore: false, total: res.length };
      }
      return {
        items: res.items ?? [],
        nextCursor: res.nextCursor ?? null,
        hasMore: res.hasMore ?? !!res.nextCursor,
        total: res.total,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined),
  });
}

/**
 * All marketplace cities. Cached for 10 minutes (slow-changing data).
 * Backend may return either a raw array or `{ cities: [...] }`.
 */
export function useMarketplaceCities() {
  return useQuery({
    queryKey: ['marketplace', 'cities'],
    queryFn: async (): Promise<MarketplaceCity[]> => {
      const res = await api.get<MarketplaceCity[] | CitiesResponse>('/api/marketplace/cities');
      if (Array.isArray(res)) return res;
      return res.cities ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Marketplace categories with counts — replaces the previous hardcoded list.
 * Cached for 60 seconds.
 */
export function useMarketplaceCategories() {
  return useQuery({
    queryKey: ['marketplace', 'counts'],
    queryFn: async (): Promise<CountsResponse> => {
      const res = await api.get<CountsResponse | { categories: Record<string, number>; total: number }>(
        '/api/marketplace/counts'
      );
      // Be defensive: some backends return { byVertical: {...} } or { byIndustry: {...} }.
      if (Array.isArray((res as CountsResponse).categories)) {
        return res as CountsResponse;
      }
      // Convert a potential record shape to the array shape.
      const record = (res as { categories?: Record<string, number> }).categories;
      if (record && typeof record === 'object') {
        return {
          total: (res as { total?: number }).total ?? 0,
          categories: Object.entries(record).map(([slug, count]) => ({
            slug,
            name: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, ' '),
            count,
          })),
        };
      }
      return { categories: [], total: 0 };
    },
    staleTime: 1000 * 60,
  });
}

/**
 * Full provider profile — services, certifications, portfolio, REAL reviews.
 */
export function useProvider(slug: string | undefined) {
  return useQuery({
    queryKey: ['marketplace', 'provider', slug],
    queryFn: () => api.get<Provider>(`/api/marketplace/providers/${slug}`),
    enabled: !!slug,
  });
}

/**
 * Instant booking mutation. On success invalidates bookings list so the
 * Bookings tab shows the new entry when the user lands there.
 */
export function useBookInstant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: BookInstantParams) =>
      api.post<Provider>('/api/marketplace/book/instant', params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

/**
 * Quote request mutation. Invalidates quotes + bookings so subsequent screens
 * reflect the new request.
 */
export function useRequestQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: QuoteRequestParams) =>
      api.post<{ id: string }>('/api/marketplace/quote-request', params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
