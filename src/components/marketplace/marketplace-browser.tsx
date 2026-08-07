'use client';

/**
 * MarketplaceBrowser
 * ------------------
 * Client-side interactive layer for the /marketplace browse page.
 *
 * The server component (src/app/marketplace/(browse)/page.tsx) fetches the
 * full list of opted-in providers (up to 120), renders the initial HTML for
 * SEO + no-JS users, then hands the list to THIS component. We take over on
 * hydration and provide:
 *
 *   • Debounced instant search (no page reload, no Enter required)
 *   • City filter (instant)
 *   • Vertical / industry filter (instant, driven by the sidebar which stays
 *     server-rendered links for crawlability)
 *   • Sort dropdown (rating, reviews, name, verified-first)
 *   • Infinite scroll (auto-loads 12 more as the user nears the bottom —
 *     no manual button click)
 *   • Active filter chips (removable)
 *   • Skeleton shimmer during the brief filter-applied window
 *
 * Filter state is mirrored into the URL via history.replaceState so the page
 * is shareable and the back button works, WITHOUT triggering a Next.js
 * navigation/reload.
 *
 * Accessibility: the search input has aria-label, the sort select has a
 * visible label, the infinite-scroll sentinel announces loading state via
 * aria-live, and the "no results" state has role="status".
 */

import * as React from 'react';
import {
  X,
  Star,
  ShieldCheck,
  Loader2,
  Globe,
  AlertCircle,
  MapPin,
  Search,
  ChevronRight,
} from 'lucide-react';
import { ProviderCard } from './provider-card';
import { useMarketplaceSearch, type MarketplaceSortKey } from './use-marketplace-search';
import { useMarketplaceProviders } from './use-marketplace-providers';
import { ReloadButton } from './reload-button';
import type { ProviderListItem } from './types';
import { getIndustry, VERTICALS } from '@/lib/industry-catalog';
import { mapIndustryToUrlSlug, slugifyCity } from '@/lib/seo/schemas';
import { rankProviders, haversineKm } from '@/lib/marketplace-ranking';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

interface MarketplaceBrowserProps {
  /** SSR-fetched first page (24 items) for SEO + instant paint. The client
   *  useMarketplaceProviders hook seeds its React Query cache with this data
   *  so page 1 is never re-fetched. Subsequent pages come from the API. */
  providers: ProviderListItem[];
  /** SSR-computed cursor for page 2. null = no more pages. Passed to the
   *  hook so fetchNextPage() can fetch page 2 without re-fetching page 1. */
  initialNextCursor?: string | null;
  /** SSR-computed total count of matching providers. Used for the sidebar's
   *  "Active providers" stat before any client-side fetch completes. */
  initialTotal?: number;
  /** Initial filters from the URL search params (SSR). */
  initialFilters: {
    vertical: string | null;
    industry: string | null;
    city: string | null;
    search: string | null;
    country: string | null;
  };
  /** ISO country code detected from GeoIP (or ?country= override).
   *  Null = no country filter (show all). Used to show a "Showing
   *  providers in Australia" banner. */
  detectedCountry?: string | null;
}

// SortKey is now shared with the breadcrumb Sort dropdown via the
// useMarketplaceSearch Zustand store. The SORTS label array lives in
// MarketplaceSortControl (the dropdown component) — this file just reads
// the active key from the store.
type SortKey = MarketplaceSortKey;

export function MarketplaceBrowser({
  providers,
  initialNextCursor,
  initialTotal,
  initialFilters,
  detectedCountry,
}: MarketplaceBrowserProps) {
  const searchParams = useSearchParams();

  // Concern #4: Cache the provider list to IndexedDB for offline browsing.
  // We use a dynamic import inside useEffect so Dexie (IndexedDB) is only
  // loaded in the browser — a static import would bundle Dexie into the
  // marketplace page's initial JS chunk and cause Turbopack SSR issues.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (providers.length === 0) return;
    // Fire-and-forget — caching is best-effort and doesn't block rendering.
    // mapIndustryToUrlSlug/slugifyCity are already imported at the top of
    // this file (static import is fine — they're pure functions, no Dexie).
    import('@/lib/offline-db')
      .then(({ cacheProviders }) => {
        const cached = providers.map((p) => ({
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
          // ProviderListItem doesn't carry a logo field (only coverImage) —
          // pass null so the offline cache shape stays compatible.
          logo: null,
          coverImage: p.coverImage ?? null,
          rating: p.rating ?? 0,
          reviewCount: p.reviewCount ?? 0,
          phone: p.phone ?? null,
          plan: p.plan ?? null,
          claimed: p.claimed ?? false,
          // All providers on the marketplace browse page have opted in
          // (it's a WHERE clause in the fetch), so this is always true.
          marketplaceOptIn: true,
          cardType: p.cardType ?? 'normal-minimal',
          cachedAt: Date.now(),
        }));
        return cacheProviders(cached);
      })
      .catch(() => {
        // silent — offline caching is best-effort
      });
  }, [providers]);

  // ── Filter state (hydrated from URL on first render) ───────────────────
  // searchInput / cityInput live in a shared Zustand store so the marketplace
  // header (MarketplaceHeader + LocationChip) and this component stay in sync
  // across the server/client boundary. Typing in the header search input
  // instantly filters the grid below; picking a city in the LocationChip
  // dropdown writes cityInput + userLocation here.
  const searchInput = useMarketplaceSearch((s) => s.searchInput);
  const setSearchInput = useMarketplaceSearch((s) => s.setSearchInput);
  const cityInput = useMarketplaceSearch((s) => s.cityInput);
  const setCityInput = useMarketplaceSearch((s) => s.setCityInput);

  // Debounced filter values (local) — derived from the shared store inputs.
  const [searchQuery, setSearchQuery] = React.useState(initialFilters.search ?? '');
  const [cityFilter, setCityFilter] = React.useState(initialFilters.city ?? '');
  // verticalFilter / industryFilter now live in the shared Zustand store so
  // the sidebar can update them instantly (client-side, no page reload).
  // We seed them from URL params on first mount below.
  const verticalFilter = useMarketplaceSearch((s) => s.verticalFilter);
  const industryFilter = useMarketplaceSearch((s) => s.industryFilter);
  const selectVertical = useMarketplaceSearch((s) => s.selectVertical);
  const selectIndustry = useMarketplaceSearch((s) => s.selectIndustry);
  // Sort now lives in the shared Zustand store so the breadcrumb Sort
  // dropdown (rendered by the server page) and this grid stay in sync.
  const sort = useMarketplaceSearch((s) => s.sort);
  // User location (GPS / IP / manual) drives the 'recommended' composite
  // ranking (40/30/20/10 distance/rating/verified/featured) and the 'distance'
  // pure-Haversine sort. null = no location → 'recommended' falls back to the
  // 50/33/17 (rating/verified/featured) split; 'distance' is disabled in the
  // dropdown.
  const userLocation = useMarketplaceSearch((s) => s.userLocation);
  const setUserLocation = useMarketplaceSearch((s) => s.setUserLocation);
  const setFilteredProviders = useMarketplaceSearch((s) => s.setFilteredProviders);
  const setTotalProvidersCount = useMarketplaceSearch((s) => s.setTotalProvidersCount);
  // Progressive empty-state fallback ladder (OLX-style). When the filtered
  // list is empty AND the user has a location set, the empty state cycles
  // through 'city' → '50km' → '100km' → 'nationwide', giving the user a
  // guided path to escape the empty result set. Reset to 'city' on every
  // filter / location change (see the effect below).
  const expansionLevel = useMarketplaceSearch((s) => s.expansionLevel);
  const setExpansionLevel = useMarketplaceSearch((s) => s.setExpansionLevel);
  // Trust filters (sidebar) — sent to the API as query params so the server
  // filters before pagination (otherwise the user would see fewer items per
  // page after enabling a trust filter).
  const trustFullyVerified = useMarketplaceSearch((s) => s.trustFullyVerified);
  const trustRatingHigh = useMarketplaceSearch((s) => s.trustRatingHigh);
  const trustEmergency = useMarketplaceSearch((s) => s.trustEmergency);

  // ── Country filter (store-driven, not a frozen server prop) ──────────
  // The server's GeoIP-detected country is passed as `detectedCountry` and
  // used to SEED the store on mount. From then on, the store is the single
  // source of truth — the LocationChip's country dropdown writes here, so
  // picking "Australia" actually re-queries the API with country=AU instead
  // of being stuck on the GeoIP value. Cleared by "Clear location".
  const countryFilter = useMarketplaceSearch((s) => s.countryFilter);
  const setCountryFilter = useMarketplaceSearch((s) => s.setCountryFilter);


  // ── Server-side cursor pagination via useInfiniteQuery ─────────────────
  // The SSR page fetched page 1 (24 items) + computed nextCursor + total.
  // We seed the hook's React Query cache with that data so page 1 is never
  // re-fetched. When the user scrolls, fetchNextPage() hits the API for
  // page 2, 3, etc. When any filter changes, the queryKey changes and React
  // Query refetches from page 1.
  //
  // IMPORTANT: We only seed initialData when the URL has NO filters
  // (search/city/vertical/industry). If the URL has filters, the SSR data
  // (fetched without filters) wouldn't match the hook's queryKey, so we
  // let the hook fetch fresh. This gives a brief loading state on deep-
  // linked filter URLs, but the data is correct.
  // Only use SSR initial data if the current active filters match the initial filters exactly.
  // This prevents React Query from seeding filtered queries with the wrong SSR initial data.
  const matchesInitial = React.useMemo(() => {
    return (
      searchQuery === (initialFilters.search ?? '') &&
      cityFilter === (initialFilters.city ?? '') &&
      verticalFilter === initialFilters.vertical &&
      industryFilter === initialFilters.industry &&
      (countryFilter ?? detectedCountry ?? null) === initialFilters.country &&
      !trustFullyVerified &&
      !trustRatingHigh &&
      !trustEmergency
    );
  }, [
    searchQuery,
    cityFilter,
    verticalFilter,
    industryFilter,
    countryFilter,
    detectedCountry,
    initialFilters,
    trustFullyVerified,
    trustRatingHigh,
    trustEmergency,
  ]);

  const {
    providers: loadedProviders,
    total: loadedTotal,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    fetchNextPage,
    error: providersError,
    refetch: refetchProviders,
  } = useMarketplaceProviders(
    {
      country: countryFilter ?? detectedCountry ?? null,
      search: searchQuery,
      city: cityFilter,
      vertical: verticalFilter,
      industry: industryFilter,
      trustFullyVerified,
      trustRatingHigh,
      trustEmergency,
    },
    matchesInitial ? providers : undefined,
    matchesInitial ? initialNextCursor : undefined,
    matchesInitial ? initialTotal : undefined,
  );

  // `filtering` = true while the API is fetching (filter change or initial
  // load). Used to dim the grid briefly so the user sees a visual cue that
  // new data is loading. Replaces the old 180ms artificial skeleton flash.
  const filtering = isFetching && !isFetchingNextPage;

  // ── Ref for latest userLocation ────────────────────────────────────────
  // Lets the geocode-city effect's async callback read the latest
  // userLocation WITHOUT listing `userLocation` in its deps (which would
  // re-create a feedback loop: detect → setUserLocation → geocode effect
  // re-fires → setUserLocation …).
  const userLocationRef = React.useRef(userLocation);
  React.useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  // ── Debounce the free-text search (250ms) ──────────────────────────────
  React.useEffect(() => {
    const handle = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 250);
    return () => clearTimeout(handle);
  }, [searchInput]);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      setCityFilter(cityInput.trim());
    }, 250);
    return () => clearTimeout(handle);
  }, [cityInput]);

  // ── Sync store with server-passed initialFilters & detected country ──
  // Next.js Server Components re-run and pass new props on history back/forward
  // navigation or external link clicks. We sync these props to the store
  // using strict inequality checks and ref tracking to prevent loop feedback.
  const prevFiltersRef = React.useRef(initialFilters);
  React.useEffect(() => {
    const prev = prevFiltersRef.current;

    if (initialFilters.search !== prev.search) {
      setSearchInput(initialFilters.search ?? '');
    }
    if (initialFilters.city !== prev.city) {
      setCityInput(initialFilters.city ?? '');
    }
    if (initialFilters.vertical !== prev.vertical || initialFilters.industry !== prev.industry) {
      if (initialFilters.industry) {
        const parentVertical = initialFilters.vertical || getIndustry(initialFilters.industry)?.vertical || null;
        if (parentVertical) {
          selectIndustry(initialFilters.industry, parentVertical);
        }
      } else {
        selectVertical(initialFilters.vertical);
      }
    }
    if (initialFilters.country !== prev.country) {
      setCountryFilter(initialFilters.country);
    }

    prevFiltersRef.current = initialFilters;
  }, [
    initialFilters,
    setSearchInput,
    setCityInput,
    selectVertical,
    selectIndustry,
    setCountryFilter,
  ]);

  // Sync countryFilter when the server detected (proxy or URL) country changes.
  // If the new country is different, we align the store and clear any active
  // city/userLocation filters to prevent mismatch (e.g. Phoenix city filter with country CA/UK).
  React.useEffect(() => {
    if (detectedCountry && detectedCountry !== countryFilter) {
      setCountryFilter(detectedCountry);
      setCityInput('');
      setUserLocation(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fieseros_user_location');
      }
    }
  }, [detectedCountry, countryFilter, setCountryFilter, setCityInput, setUserLocation]);

  // ── Auto-detect user location on mount (localStorage -> IP -> GPS) ──
  // Runs EXACTLY ONCE (didDetectRef guards against StrictMode double-invoke).
  //
  // IMPORTANT — auto-detect sets `userLocation` ONLY (for distance ranking +
  // the 'recommended' composite sort). It does NOT write into `cityInput`.
  // This is a deliberate design decision: coupling auto-detect to the city
  // filter meant that a detected city with zero providers would empty the
  // grid ("blank page"), and re-filling cityInput from async callbacks was
  // the root cause of the feedback loop that hung the marketplace. The city
  // input is now purely user-driven (type it, or click "Use my location").
  // Auto-detect silently re-ranks the grid so nearby providers float up.
  const didDetectRef = React.useRef(false);
  React.useEffect(() => {
    if (didDetectRef.current) return;
    didDetectRef.current = true;

    let active = true;

    // 1. Try to load from localStorage first
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('fieseros_user_location');
        if (raw) {
          const parsed = JSON.parse(raw);
          // If the cached location does not have a country OR it mismatches the server-detected country,
          // invalidate it immediately so we respect proxy changes instantly.
          if (detectedCountry && (!parsed.country || parsed.country !== detectedCountry)) {
            localStorage.removeItem('fieseros_user_location');
          } else {
            const age = Date.now() - parsed.timestamp;
            if (age < 7 * 24 * 60 * 60 * 1000) {
              setUserLocation({
                lat: parsed.lat,
                lng: parsed.lng,
                city: parsed.city,
                region: parsed.state ?? null,
                source: parsed.source,
                lowAccuracy: parsed.source === 'ip',
              });
              return;
            }
          }
        }
      } catch {}
    }

    // 2. Fetch IP location dynamically if not cached
    async function detectIpLocation() {
      try {
        const res = await fetch('/api/geocode/ip');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.lat && data.lng && active) {
          setUserLocation({
            lat: data.lat,
            lng: data.lng,
            city: data.city,
            source: 'ip',
            lowAccuracy: true,
          });
          // NOTE: intentionally NOT calling setCityInput() — auto-detect
          // only powers ranking, never the hard city filter.
        }
      } catch (err) {
        console.error('Failed to get IP location on mount:', err);
      }
    }
    detectIpLocation();

    // 3. Ask for high-accuracy GPS permission in parallel
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!active) return;
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
            let city: string | null = null;
            let state: string | null = null;
            let country: string | null = null;
            if (res.ok) {
              const data = await res.json();
              city = data.city || null;
              state = data.state || null;
              country = data.countryCode || null;
            }
            if (country) {
              setCountryFilter(country);
            }
            setUserLocation({
              lat: latitude,
              lng: longitude,
              city,
              region: state,
              source: 'gps',
              lowAccuracy: false,
            });
          } catch {}
        },
        () => {}, // ignore errors since we have IP fallback
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }

    return () => {
      active = false;
    };
  }, []);

  // Geocode the city filter text automatically to get its lat/lng coordinates
  React.useEffect(() => {
    if (!cityFilter) {
      // If city filter is cleared, restore GPS/IP location from localStorage if available, else null
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('fieseros_user_location');
          if (raw) {
            const parsed = JSON.parse(raw);
            const age = Date.now() - parsed.timestamp;
            if (age < 7 * 24 * 60 * 60 * 1000) {
              setUserLocation({
                lat: parsed.lat,
                lng: parsed.lng,
                city: parsed.city,
                region: parsed.state ?? null,
                source: parsed.source,
                lowAccuracy: parsed.source === 'ip',
              });
              return;
            }
          }
        } catch {}
      }
      setUserLocation(null);
      return;
    }

    // Skip geocoding if the active location already matches the typed city.
    // Reads via userLocationRef so this effect does NOT depend on
    // `userLocation` — otherwise every GPS/IP detection (from the mount-once
    // effect above) would re-trigger this geocode effect, creating a second
    // feedback path: detect → setUserLocation → geocode effect → setUserLocation…
    const ul = userLocationRef.current;
    if (ul && (ul.source === 'gps' || ul.source === 'ip' || ul.source === 'manual') && ul.city?.toLowerCase() === cityFilter.toLowerCase()) {
      return;
    }

    let active = true;
    async function geocodeCity() {
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(cityFilter)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && active) {
          const first = data[0];
          const lat = parseFloat(first.lat);
          const lng = parseFloat(first.lon);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            setUserLocation({
              lat,
              lng,
              city: cityFilter,
              source: 'manual',
              lowAccuracy: false,
            });
          }
        }
      } catch (err) {
        console.error('Failed to geocode city filter:', err);
      }
    }
    geocodeCity();
    return () => {
      active = false;
    };
  }, [cityFilter, setUserLocation]);

  // Synchronize userLocation changes to localStorage so they persist across reloads
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (userLocation) {
      const loc = {
        city: userLocation.city,
        state: userLocation.region || null,
        country: countryFilter || null,
        lat: userLocation.lat,
        lng: userLocation.lng,
        source: userLocation.source,
        accuracy: userLocation.source,
        timestamp: Date.now(),
      };
      localStorage.setItem('fieseros_user_location', JSON.stringify(loc));
    } else {
      localStorage.removeItem('fieseros_user_location');
    }
  }, [userLocation, countryFilter]);

  // NOTE: The old "flash skeleton on filter change" effect (which set
  // `filtering` for 180ms + reset `visibleCount`) has been removed. With
  // server-side cursor pagination, `filtering` is derived from the hook's
  // `isFetching` state (true while the API request is in flight), and
  // pagination is handled by `fetchNextPage()` (no `visibleCount` to reset).

  // ── Mirror filter state into the URL (replaceState, no reload) ─────────
  // Includes `country` so a country change in the LocationChip is reflected
  // in the shareable URL (and survives back/forward navigation). The server
  // page reads ?country= on initial load (it takes precedence over GeoIP),
  // so shared links to e.g. ?country=AU&city=Sydney land on the right view.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const set = (key: string, val: string | null) => {
      if (val) url.searchParams.set(key, val);
      else url.searchParams.delete(key);
    };
    set('search', searchQuery || null);
    set('city', cityFilter || null);
    set('vertical', verticalFilter);
    set('industry', industryFilter);
    set('country', countryFilter);
    window.history.replaceState({}, '', url.toString());
  }, [searchQuery, cityFilter, verticalFilter, industryFilter, countryFilter]);

  // NOTE: sidebar vertical/industry links are NOW intercepted client-side.
  // The sidebar uses onClick handlers that call selectVertical() /
  // selectIndustry() in the Zustand store — the grid re-filters instantly
  // with NO page reload. The <a> tags remain as crawlable hrefs for SEO
  // (progressive enhancement: without JS, the link navigates normally;
  // with JS, preventDefault + store update = instant filter).

  // ── Compute the sorted list (filters are server-side now) ──────────────
  // With server-side cursor pagination, the API already applies all filters
  // (search / city / vertical / industry / trust) before returning items.
  // The hook's `loadedProviders` is the flattened list of all loaded pages —
  // already filtered. We only need to SORT it here (the server fetches in a
  // stable (rating DESC, reviewCount DESC, id DESC) order, but the user can
  // pick a different client-side sort).
  //
  // Sort changes do NOT trigger a refetch — we just re-sort the already-
  // loaded items. This is instant and avoids resetting the user's scroll.
  // The trade-off: for 'distance' sort, the global order isn't perfectly by
  // distance across pages (the server fetches by rating). This is acceptable
  // for the browse grid — a future enhancement could send lat/lng to the
  // server for true distance-sorted pagination.
  const filtered = React.useMemo(() => {
    let list = loadedProviders;

    if ((sort === 'recommended' || sort === 'distance') && userLocation) {
      if (sort === 'distance') {
        // Pure Haversine ascending — FEATURED cards still dominate the top
        // group, then non-featured, each sorted by distance asc.
        const featured = list.filter((p) => p.featured);
        const nonFeatured = list.filter((p) => !p.featured);
        const sortByDistance = (arr: typeof list) =>
          arr.slice().sort((a, b) => {
            const da =
              haversineKm(userLocation.lat, userLocation.lng, a.latitude, a.longitude) ?? 99999;
            const db =
              haversineKm(userLocation.lat, userLocation.lng, b.latitude, b.longitude) ?? 99999;
            return da - db;
          });
        list = [...sortByDistance(featured), ...sortByDistance(nonFeatured)];
      } else {
        // 'recommended' with a user location → composite 40/30/20/10 ranking.
        // filterByRadius=false: the BROWSE page must show ALL opted-in
        // providers, regardless of the user's geographic distance. Distance
        // affects RANK ORDER only (closer providers float up via the 40%
        // distance weight) but never FILTERS providers out. This is critical
        // because a user in India viewing /marketplace?country=US would
        // otherwise see 1 card (13,000km > serviceRadiusKm of 15-39km).
        list = rankProviders(
          list.map((p) => ({ ...p, featured: !!p.featured })),
          {
            userLat: userLocation.lat,
            userLng: userLocation.lng,
            lowAccuracy: userLocation.lowAccuracy,
          },
          false  // filterByRadius — browse page: sort by distance, never filter
        ) as unknown as ProviderListItem[];
      }
    } else if (sort === 'recommended' || sort === 'distance') {
      // No userLocation — 'recommended' (and 'distance' as a defensive
      // fallback) use the rankProviders no-location path (50/33/17 split).
      list = rankProviders(
        list.map((p) => ({ ...p, featured: !!p.featured })),
        { userLat: null, userLng: null },
      ) as unknown as ProviderListItem[];
    } else {
      list = list.slice().sort((a, b) => {
        // Featured cards ALWAYS sort first (OLX-style premium-at-top).
        if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;

        switch (sort) {
          case 'reviews':
            return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
          case 'response': {
            const aResp = a.responseTimeMins ?? 9999;
            const bResp = b.responseTimeMins ?? 9999;
            if (aResp !== bResp) return aResp - bResp;
            return (b.rating ?? 0) - (a.rating ?? 0);
          }
          case 'name':
            return (a.name ?? '').localeCompare(b.name ?? '');
          case 'verified': {
            const aScore =
              (a.identityVerified ? 1 : 0) +
              (a.businessVerified ? 1 : 0) +
              (a.insuranceVerified ? 1 : 0) +
              (a.stripeConnected ? 1 : 0);
            const bScore =
              (b.identityVerified ? 1 : 0) +
              (b.businessVerified ? 1 : 0) +
              (b.insuranceVerified ? 1 : 0) +
              (b.stripeConnected ? 1 : 0);
            if (bScore !== aScore) return bScore - aScore;
            return (b.rating ?? 0) - (a.rating ?? 0);
          }
          case 'rating':
          default:
            if ((b.rating ?? 0) !== (a.rating ?? 0))
              return (b.rating ?? 0) - (a.rating ?? 0);
            return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
        }
      });
    }

    return list;
  }, [loadedProviders, sort, userLocation]);

  // All loaded items are visible (no client-side slicing — the hook's
  // fetchNextPage() grows the list as the user scrolls).
  const visible = filtered;
  const hasMore = hasNextPage;

  // ── Publish the filtered list + total to the shared store ─────────────
  // The sidebar (rendered as a sibling, not a child) reads `filteredProviders`
  // from the Zustand store to compute per-vertical counts + avg rating that
  // match the visible grid. We also publish `totalProvidersCount` so the
  // sidebar's "Active providers" stat can use the accurate total (from the
  // API's COUNT query) rather than the loaded-items count (which starts at
  // 24 and grows as the user scrolls).
  React.useEffect(() => {
    setFilteredProviders(filtered);
  }, [filtered, setFilteredProviders]);

  // Publish the total count (from the API's COUNT query) so the sidebar's
  // "Active providers" stat shows the real total, not the loaded-items count.
  React.useEffect(() => {
    if (loadedTotal != null) {
      setTotalProvidersCount(loadedTotal);
    }
  }, [loadedTotal, setTotalProvidersCount]);

  // ── Progressive empty-state fallback ladder reset ──────────────────────
  // Whenever ANY filter or the user location changes, reset the expansion
  // ladder back to 'city' (the narrowest step). This ensures the user always
  // starts at the narrowest search context for the NEW filter set, rather
  // than inheriting a stale '100km' / 'nationwide' state from a previous
  // search.
  //
  // Uses the DEBOUNCED filter values (searchQuery / cityFilter) rather than
  // the raw inputs (searchInput / cityInput) so the user typing in the search
  // box doesn't reset the ladder on every keystroke — only when the debounced
  // value actually changes.
  React.useEffect(() => {
    setExpansionLevel('city');
  }, [
    searchQuery,
    cityFilter,
    verticalFilter,
    industryFilter,
    trustFullyVerified,
    trustRatingHigh,
    trustEmergency,
    userLocation,
    setExpansionLevel,
  ]);

  // ── Auto-advance '50km' → '100km' after 1.5s ───────────────────────────
  // When the user clicks "Expand search to 50km" and there are STILL no
  // results, we automatically advance to '100km' after a 1.5s beat (OLX does
  // this — it makes the ladder feel like a guided progressive search rather
  // than a wall of buttons the user has to keep clicking). The timer is
  // cleared if the user manually advances or if a filter changes (which
  // resets expansionLevel back to 'city' via the effect above, which then
  // unmounts this one because the dep changes).
  React.useEffect(() => {
    if (expansionLevel !== '50km') return;
    if (filtered.length > 0) return; // results arrived — no need to advance
    if (filtering) return; // wait for the in-flight fetch to settle
    const handle = setTimeout(() => {
      setExpansionLevel('100km');
    }, 1500);
    return () => clearTimeout(handle);
  }, [expansionLevel, filtered.length, filtering, setExpansionLevel]);

  // ── Infinite scroll via IntersectionObserver ───────────────────────────
  // A sentinel <div> sits at the bottom of the grid. When it scrolls into
  // view (and there are more pages, and we're not already fetching) we call
  // fetchNextPage() to load the next 24 providers from the API. This is TRUE
  // server-side pagination — the old approach just sliced an already-loaded
  // 1000-item array (no actual network request on scroll).
  //
  // ROOT = #main-content (the scrollable <main> on the browse page).
  // The browse page's outer layout is `fixed inset-0 ... overflow-hidden`,
  // so the browser viewport itself NEVER scrolls — only #main-content does.
  // If we left `root: null` (default = viewport), the sentinel would never
  // be considered "intersecting" (it's clipped by #main-content's overflow
  // bounds, so it's never in the viewport's intersection rect), and infinite
  // scroll would silently never fire. Pointing root at #main-content makes
  // the observer measure intersection against the actual scroll container.
  //
  // 200px rootMargin: fires the fetch when the user is ~200px from the
  // bottom, so the next page loads before they actually reach it (smooth UX,
  // no visible spinner in the common case).
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const loadingMore = isFetchingNextPage;

  React.useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || filtering) return;

    // Resolve the scroll container FROM THE SENTINEL ITSELF, not via a global
    // getElementById lookup. The browse page's outer layout is
    // `fixed inset-0 overflow-hidden`, so the browser viewport NEVER scrolls
    // — only <main id="main-content"> does. If we left root=null (viewport),
    // the sentinel would never be considered "intersecting" (it's clipped by
    // #main-content's overflow bounds) and infinite scroll would never fire.
    //
    // `node.closest('#main-content')` walks up the DOM tree starting from the
    // sentinel (which we just verified exists), so it ALWAYS finds the correct
    // ancestor — even if this effect fires before <main> is fully committed
    // during hydration. This eliminates the race condition where
    // document.getElementById('main-content') could return null and silently
    // fall back to the viewport root. Falls back to <main> then to null
    // (= viewport) for non-marketplace contexts where there's no #main-content.
    const root = node.closest('#main-content') || node.closest('main');

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          // Fetch the next page from the API. The hook handles dedup (no-op
          // if a fetch is already in flight) + race conditions.
          fetchNextPage();
        }
      },
      { root, rootMargin: '200px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, filtering, fetchNextPage, loadedProviders.length]);

  // ── Active filter chips ────────────────────────────────────────────────
  const activeChips: Array<{ label: string; onClear: () => void }> = [];
  if (searchQuery)
    activeChips.push({
      label: `Search: "${searchQuery}"`,
      onClear: () => {
        setSearchInput('');
        setSearchQuery('');
      },
    });
  if (cityFilter)
    activeChips.push({
      label: `City: ${cityFilter}`,
      onClear: () => {
        setCityInput('');
        setCityFilter('');
      },
    });
  if (verticalFilter) {
    const v = verticalFilter;
    const vName = VERTICALS.find((vv) => vv.id === v)?.name ?? v;
    activeChips.push({
      label: `Category: ${vName}`,
      onClear: () => selectVertical(null),
    });
  }
  if (industryFilter) {
    const meta = getIndustry(industryFilter);
    activeChips.push({
      label: `Subcategory: ${meta?.name ?? industryFilter}`,
      onClear: () => {
        // Clearing the industry filter keeps the vertical filter active
        // (the user is still browsing within that vertical).
        selectVertical(verticalFilter);
      },
    });
  }

  const clearAll = () => {
    setSearchInput('');
    setSearchQuery('');
    setCityInput('');
    setCityFilter('');
    selectVertical(null);
  };

  // ── Progressive empty-state fallback ladder derived values ────────────
  // The ladder message + button set depends on (a) whether the user has a
  // location set (GPS / IP / manual / city-dropdown pick) AND (b) the current
  // `expansionLevel` in the Zustand store. We compute the derived values here
  // so the JSX below stays readable.
  //
  // `locationLabel` is "City" or "City, Region" (OLX-style) — falls back to
  // the raw `cityFilter` text if the user typed a city name that hasn't been
  // geocoded yet. null when there's no location context at all (nationwide
  // empty state path).
  const locationLabel = React.useMemo(() => {
    if (userLocation?.city) {
      return userLocation.region
        ? `${userLocation.city}, ${userLocation.region}`
        : userLocation.city;
    }
    // Fall back to the typed city filter (e.g. deep-link ?city=Berlin that
    // hasn't been geocoded yet — userLocation is still null but the text is
    // in cityFilter).
    if (cityFilter) return cityFilter;
    return null;
  }, [userLocation, cityFilter]);

  // True when we should show the OLX-style progressive ladder (location set
  // AND not yet at the 'nationwide' step). When false, the empty state falls
  // back to the generic "No providers match your filters" path.
  const showLadder = !!locationLabel && expansionLevel !== 'nationwide';

  // Scarce-results banner: when the user has a location AND there are 1-3
  // results AND we're still on the 'city' step (no expansion yet), show a
  // subtle amber banner above the grid so the user knows there are only a
  // few matches in their city and we're already including nearby ones.
  // (Purely informational — no action needed, no expansion triggered.)
  const showScarceBanner =
    !!locationLabel &&
    expansionLevel === 'city' &&
    filtered.length >= 1 &&
    filtered.length <= 3 &&
    !filtering;

  return (
    <div className="pl-4 pr-3 sm:pr-3 lg:pr-3 py-4">
      {/* Country banner removed per user request */}

      {/* The search bar + LocationChip live in the marketplace header
          (MarketplaceHeader) and share their input state via the
          useMarketplaceSearch Zustand store. Typing in the header search
          input instantly filters the grid below — no reload, no Enter
          required. Picking a city in the LocationChip dropdown writes
          cityInput + userLocation here for distance ranking. A <noscript>
          GET form in the server page still serves non-JS users. */}

      {/* ── Active filter chips ──────────────────────────────────────────── */}
      {/* The "All Providers" / vertical-name <h2> heading used to live above
          this row; it was removed per design request — the breadcrumb bar
          and the sidebar highlight already show the active vertical, so the
          heading was redundant. The "Clear all" affordance is preserved here
          inline at the end of the chip row so the filter-clear action stays
          reachable when one or more chips are active. */}
      {activeChips.length > 0 ? (
        <div className="mb-5 mt-8 flex flex-wrap items-center gap-2">
          {activeChips.map((chip, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/60 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onClear}
                aria-label={`Remove filter: ${chip.label}`}
                className="rounded-full p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-0.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
            aria-label="Clear all filters"
          >
            Clear all <span aria-hidden>&times;</span>
          </button>
        </div>
      ) : null}

      {/* ── Scarce-results banner (1-3 results + location set) ─────────────── */}
      {/* OLX-style subtle banner above the grid: when the user has a location
          set AND there are only 1-3 providers in their city, let them know
          we're already including nearby results (within 50km). Purely
          informational — no buttons, no expansion triggered. Uses amber
          theme so it's visually distinct from the emerald empty state below
          (which is an action-required state) and from the emerald country
          banner above (which is a passive info state). */}
      {showScarceBanner ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Only <strong className="font-semibold">{filtered.length}</strong>{' '}
            {filtered.length === 1 ? 'provider' : 'providers'} in{' '}
            <strong className="font-semibold">{locationLabel}</strong>.{' '}
            Showing results within <strong className="font-semibold">50km</strong>.
          </span>
        </div>
      ) : null}

      {/* ── Grid ────────────────────────────────────────────────────────────
          IMPORTANT (Fix A): We NO LONGER unmount the real card grid to show a
          6-card skeleton during the 180ms `filtering` window. The old skeleton
          flash collapsed the page height (6 short skeletons vs 12+ real cards),
          which made the sticky sidebar jerk and the footer jump up-then-down
          on every filter / sort / search keystroke. Instead we keep the real
          grid mounted and apply a brief `opacity-50 + pointer-events-none` dim
          so the user still sees a visual "applying filters" cue WITHOUT any
          height change. A `min-h` safety net is added so the grid never
          collapses below ~3 rows even when temporarily empty. Skeletons are
          only shown when there are genuinely zero visible cards (initial load
          or a filter set that yields nothing yet). */}
      {filtered.length === 0 && !filtering ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-border bg-card p-6 text-center sm:p-8"
        >
          {showLadder && expansionLevel === 'city' ? (
            /* ── Step 1: 0 results in the user's city ── */
            /* "No providers found in {City}" + Expand to 50km + Search nationwide */
            <>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
                <MapPin
                  className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                />
              </div>
              <p className="text-sm font-medium text-foreground sm:text-base">
                No providers found in{' '}
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {locationLabel}
                </span>
                {searchQuery ? (
                  <>
                    {' '}for{' '}
                    <span className="font-semibold">&ldquo;{searchQuery}&rdquo;</span>
                  </>
                ) : null}
                .
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try expanding your search radius to find nearby providers.
              </p>
              <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setExpansionLevel('50km')}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  <Search className="h-4 w-4" aria-hidden />
                  Expand search to 50km
                </button>
                <button
                  type="button"
                  onClick={() => setExpansionLevel('nationwide')}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                >
                  Search nationwide
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </>
          ) : showLadder && expansionLevel === '50km' ? (
            /* ── Step 2: expanded to 50km, still no results ── */
            /* "No providers within 50km of {City}. Expanding to 100km…" */
            /* Auto-advances to '100km' after 1.5s (see the timer effect above). */
            /* User can also click "Expand to 100km now" to skip the wait, or */
            /* "Search nationwide" to bail out.                                */
            <>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
                <Loader2
                  className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                />
              </div>
              <p className="text-sm font-medium text-foreground sm:text-base">
                No providers within{' '}
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  50km
                </span>{' '}
                of{' '}
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {locationLabel}
                </span>
                .{' '}
                <span className="text-muted-foreground">Expanding to 100km…</span>
              </p>
              <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setExpansionLevel('100km')}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                >
                  Expand to 100km now
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setExpansionLevel('nationwide')}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  Search nationwide
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </>
          ) : showLadder && expansionLevel === '100km' ? (
            /* ── Step 3: expanded to 100km, still no results ── */
            /* "No providers within 100km of {City}." + Search nationwide */
            <>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
                <MapPin
                  className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                />
              </div>
              <p className="text-sm font-medium text-foreground sm:text-base">
                No providers within{' '}
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  100km
                </span>{' '}
                of{' '}
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {locationLabel}
                </span>
                .
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                We&apos;ve expanded the search as far as we can. Try searching nationwide.
              </p>
              <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setExpansionLevel('nationwide')}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  Search nationwide
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </>
          ) : (
            /* ── Step 4: nationwide (no location, or user clicked Search nationwide) ── */
            /* "No providers match your filters" + Clear all + Browse all providers */
            <>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <AlertCircle
                  className="h-6 w-6 text-muted-foreground"
                  aria-hidden
                />
              </div>
              <p className="text-sm font-medium text-foreground sm:text-base">
                No providers match {activeChips.length > 0 ? 'these filters' : 'this filter'}
                {searchQuery ? (
                  <>
                    {' '}for <span className="font-semibold">&ldquo;{searchQuery}&rdquo;</span>
                  </>
                ) : null}
                .
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a different search term, clear your filters, or browse all providers.
              </p>
              <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
                {activeChips.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                  >
                    Clear all filters
                  </button>
                ) : null}
                <a
                  href="/marketplace"
                  className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  Browse all providers
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </a>
              </div>
            </>
          )}
        </div>
      ) : visible.length === 0 ? (
        /* Only show skeletons when there are genuinely zero visible cards
           (e.g. the very first paint before providers hydrate). This reserves
           a stable ~3-row height so the footer doesn't jump on initial load. */
        <div
          className="grid min-h-[420px] gap-4 grid-cols-1"
          aria-hidden="true"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border bg-card animate-pulse"
            >
              <div className="h-28 w-full bg-muted" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <div className="flex gap-1.5">
                  <div className="h-5 w-16 rounded-full bg-muted" />
                  <div className="h-5 w-16 rounded-full bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={cn(
            'grid min-h-[420px] gap-4 grid-cols-1 transition-opacity duration-150',
            filtering && 'opacity-50 pointer-events-none',
          )}
        >
          {visible.map((p) => {
            const slug = p.slug || p.publicSlug;
            const canonicalHref = slug
              ? `/${mapIndustryToUrlSlug(p.industry)}/${slugifyCity(p.city)}/${slug}`
              : undefined;
            return (
              <ProviderCard
                key={p.id}
                provider={p}
                featured={!!p.featured}
                href={canonicalHref}
              />
            );
          })}
        </div>
      )}

      {/* ── Infinite scroll error retry banner (P1 issue #36 / #38) ────── */}
      {/* When fetchNextPage (or a filter-change refetch) fails, the hook
          exposes the error via `providersError`. Without this banner the
          user just sees the loading spinner stop with no feedback — no way
          to know something went wrong, no way to retry. The banner sits
          ABOVE the infinite-scroll sentinel so it appears at the bottom of
          the loaded grid (where the user is looking when the failure
          happens). The "Try again" button calls `refetchProviders` which
          re-runs the query for ALL loaded pages — handles both the
          infinite-scroll failure case (retry the failed page) AND the
          filter-change failure case (where the initial page 1 fetch
          failed and `fetchNextPage` would be a no-op because hasMore is
          false). */}
      {providersError && !filtering ? (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-center sm:flex-row sm:justify-between sm:text-left dark:border-amber-900 dark:bg-amber-950/40"
        >
          <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
            <span>
              Couldn&apos;t load more providers.{' '}
              <span className="text-xs text-amber-700 dark:text-amber-300">
                Network blip or server error.
              </span>
            </span>
          </div>
          <ReloadButton
            label="Try again"
            onClick={refetchProviders}
            busy={isFetching}
            disabled={isFetching}
          />
        </div>
      ) : null}

      {/* ── Infinite scroll sentinel ─────────────────────────────────────── */}
      {/* A zero-height sentinel observed by IntersectionObserver. When it
          enters the viewport we call fetchNextPage() to load the next 24
          providers from the API. The spinner shows while the request is in
          flight. Once all pages are loaded (hasMore === false) the sentinel
          is unmounted entirely. */}
      {hasMore && !filtering ? (
        <div
          ref={sentinelRef}
          className="mt-8 flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground"
          aria-live="polite"
        >
          {loadingMore ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              Loading more providers…
            </>
          ) : (
            <span className="sr-only">Scroll to load more providers</span>
          )}
        </div>
      ) : null}

      {/* ── Helpful hint when there are results but no city filter ──────── */}
      {filtered.length > 0 && !cityFilter ? (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />
          Look for the <Star className="mx-0.5 inline h-3 w-3 fill-amber-400 text-amber-400" /> rating and verification badges on each card.
        </p>
      ) : null}
    </div>
  );
}
