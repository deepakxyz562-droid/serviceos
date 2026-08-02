/**
 * useMarketplaceCache — Offline marketplace catalog cache
 * ========================================================
 *
 * Concern #4 — PWA + offline mode.
 *
 * Caches the marketplace provider list to IndexedDB (via Dexie) so users
 * can browse providers offline. The server-rendered marketplace page
 * passes its provider list to this hook, which:
 *
 *   1. Bulk-upserts every provider into IndexedDB (overwrites existing
 *      rows with the same ID — keeps cache fresh).
 *   2. Returns a function to read cached providers by city for offline
 *      display.
 *
 * The cache is also used by the public business hub detail page: when a
 * user navigates to /{industry}/{city}/{slug} while offline, the page
 * can read the cached provider row from IndexedDB instead of failing.
 *
 * Cache TTL: 24 hours (PROVIDER_CACHE_TTL_MS in offline-db.ts). The SW's
 * network-first strategy refreshes the data when online anyway.
 */

'use client';

import { useEffect, useCallback } from 'react';
import {
  cacheProviders,
  getCachedProvidersByCity,
  getCachedProvider,
  clearProviderCache,
  type CachedProvider,
} from '@/lib/offline-db';
import type { ProviderListItem } from '@/components/marketplace/types';
import { mapIndustryToUrlSlug, slugifyCity } from '@/lib/seo/schemas';

/**
 * Convert a ProviderListItem (the shape returned by the marketplace API)
 * into a CachedProvider (the IndexedDB row shape). We only keep the fields
 * needed for offline card rendering + detail page display.
 */
function toCachedProvider(p: ProviderListItem): CachedProvider {
  return {
    id: p.id,
    slug: p.slug || p.publicSlug || p.id,
    name: p.name,
    industry: p.industry ?? null,
    industryUrlSlug: mapIndustryToUrlSlug(p.industry),
    city: p.city ?? null,
    cityUrlSlug: slugifyCity(p.city),
    state: p.state ?? null,
    tagline: p.tagline ?? null,
    description: p.description ?? null,
    logo: p.logo ?? null,
    coverImage: p.coverImage ?? null,
    rating: p.rating ?? 0,
    reviewCount: p.reviewCount ?? 0,
    phone: p.phone ?? null,
    plan: p.plan ?? null,
    claimed: p.claimed ?? false,
    marketplaceOptIn: p.marketplaceOptIn ?? true,
    cardType: p.cardType ?? 'normal-minimal',
    cachedAt: Date.now(),
  };
}

/**
 * Hook that caches the marketplace provider list to IndexedDB.
 *
 * Call this from the MarketplaceBrowser component (client-side) with the
 * server-fetched provider list. It no-ops on the server and silently
 * fails if IndexedDB is unavailable.
 *
 * Returns utility functions for reading/clearing the cache.
 */
export function useMarketplaceCache(providers: ProviderListItem[]) {
  // Cache the provider list to IndexedDB whenever it changes.
  // This runs in the background — it doesn't block rendering.
  useEffect(() => {
    if (providers.length === 0) return;
    const cached = providers.map(toCachedProvider);
    // Fire-and-forget — caching is best-effort.
    cacheProviders(cached).catch(() => {});
  }, [providers]);

  /**
   * Read cached providers for a given city. Returns an empty array if
   * offline DB is unavailable or no cached providers exist for the city.
   */
  const readCachedByCity = useCallback(async (citySlug: string) => {
    return getCachedProvidersByCity(citySlug);
  }, []);

  /**
   * Read a single cached provider by its URL segments. Used by the
   * detail page for offline viewing.
   */
  const readCachedProvider = useCallback(
    async (industrySlug: string, citySlug: string, slug: string) => {
      return getCachedProvider(industrySlug, citySlug, slug);
    },
    [],
  );

  /**
   * Clear the entire provider cache. Called when the user clicks
   * "Clear offline data" in settings.
   */
  const clearCache = useCallback(async () => {
    await clearProviderCache();
  }, []);

  return { readCachedByCity, readCachedProvider, clearCache };
}

/**
 * Standalone function (non-hook) to read a cached provider by URL segments.
 * Used by the public business hub detail page's client-side offline handler
 * (can't use a hook inside an event handler).
 */
export async function readCachedProviderByUrl(
  industrySlug: string,
  citySlug: string,
  slug: string,
): Promise<CachedProvider | null> {
  return getCachedProvider(industrySlug, citySlug, slug);
}
