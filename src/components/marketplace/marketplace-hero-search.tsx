'use client';

/**
 * MarketplaceHeroSearch
 * ---------------------
 * Slick pill-style search bar rendered in the marketplace header (single row,
 * right side on desktop, full-width on mobile).
 *
 * State is shared with `MarketplaceBrowser` via the `useMarketplaceSearch`
 * Zustand store, so typing here instantly filters the results grid below
 * (the browser component debounces 250ms before applying the filter — no
 * Enter required, no page reload).
 *
 * Also includes a "Use my location" button (Crosshair icon) next to the city
 * input. Clicking it requests browser GPS permission (via the useUserLocation
 * hook), reverse-geocodes the lat/lng to a city name, and writes both the
 * city + the raw lat/lng into the shared store. The MarketplaceBrowser then
 * uses that location to drive the 'recommended' composite ranking + the
 * 'distance' pure-Haversine sort, and the ProviderCard shows an "X.X km
 * away" badge on each card.
 */

import * as React from 'react';
import { Search, MapPin, X, Crosshair, Loader2 } from 'lucide-react';
import { useMarketplaceSearch } from './use-marketplace-search';
import { useUserLocation } from '@/hooks/use-user-location';

export function MarketplaceHeroSearch() {
  const searchInput = useMarketplaceSearch((s) => s.searchInput);
  const setSearchInput = useMarketplaceSearch((s) => s.setSearchInput);
  const cityInput = useMarketplaceSearch((s) => s.cityInput);
  const setCityInput = useMarketplaceSearch((s) => s.setCityInput);
  const setUserLocation = useMarketplaceSearch((s) => s.setUserLocation);

  const { requestLocation, loading, error } = useUserLocation();

  const handleUseLocation = React.useCallback(async () => {
    const loc = await requestLocation();
    if (!loc) return; // hook already set `error` — surfaced below the input
    // Sync the shared store so MarketplaceBrowser's sort + the ProviderCard
    // distance badges pick up the new location. lowAccuracy is true when the
    // location came from an IP lookup (vs. GPS / manual) — the ranking lib
    // uses this to penalize the distance weight.
    setUserLocation({
      lat: loc.lat,
      lng: loc.lng,
      city: loc.city,
      source: loc.source,
      lowAccuracy: loc.source === 'ip',
    });
    // Pre-fill the city input with the reverse-geocoded city (or a fallback
    // message if the geocode failed but we still have lat/lng for distance).
    setCityInput(loc.city ?? '');
  }, [requestLocation, setCityInput, setUserLocation]);

  return (
    <div className="w-full">
      {/* Search container — keyword + city + GPS button side-by-side on sm+, stacked on mobile */}
      <div className="group flex flex-col gap-1.5 rounded-[5px] border border-border/80 bg-card p-1.5 transition-all focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/25 sm:flex-row sm:items-center sm:gap-0 dark:bg-card/80">
        {/* Keyword field */}
        <div className="relative flex-1 min-w-0">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search providers, services, or keywords — e.g. &quot;plumbing&quot;"
            aria-label="Search providers"
            className="h-10 w-full rounded-[5px] bg-transparent pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {/* Divider (sm+ only) */}
        <div
          aria-hidden
          className="hidden sm:block sm:h-6 sm:w-px sm:bg-border"
        />

        {/* City field */}
        <div className="relative sm:max-w-[200px] sm:flex-1 min-w-0">
          <MapPin
            className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder={loading ? 'Detecting location…' : 'City or postcode'}
            aria-label="Filter by city"
            disabled={loading}
            className="h-10 w-full rounded-[5px] bg-transparent pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-progress disabled:opacity-60"
          />
          {cityInput && !loading ? (
            <button
              type="button"
              onClick={() => setCityInput('')}
              aria-label="Clear city filter"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {loading ? (
            <Loader2
              className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-emerald-600"
              aria-hidden
            />
          ) : null}
        </div>

        {/* Divider (sm+ only) */}
        <div
          aria-hidden
          className="hidden sm:block sm:h-6 sm:w-px sm:bg-border"
        />

        {/* Use my location — GPS detect button. Icon-only on mobile, icon +
            "Use my location" text on desktop. Calls requestLocation() from
            the useUserLocation hook (navigator.geolocation + reverse
            geocode). On success, writes the lat/lng + city into the shared
            store so MarketplaceBrowser + ProviderCard pick it up. */}
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={loading}
          aria-label="Use my location"
          title="Detect my location for distance-based sorting"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[5px] bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-progress disabled:opacity-60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70 sm:gap-1.5"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Crosshair className="h-3.5 w-3.5" aria-hidden />
          )}
          <span className="hidden lg:inline">
            {loading ? 'Detecting…' : 'Use my location'}
          </span>
        </button>
      </div>

      {/* Error message — shown below the input when the GPS / reverse-geocode
          call fails (permission denied, timeout, network error). Actionable:
          tells the user to enter their city manually as a fallback. */}
      {error ? (
        <p
          role="alert"
          className="mt-1.5 flex items-start gap-1 text-xs text-rose-600 dark:text-rose-400"
        >
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}

      <p className="sr-only">
        Instant search — no need to press Enter. Results update as you type.
      </p>
    </div>
  );
}
