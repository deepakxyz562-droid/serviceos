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
} from 'lucide-react';
import { ProviderCard } from './provider-card';
import { useMarketplaceSearch, type MarketplaceSortKey } from './use-marketplace-search';
import { useMarketplaceProviders } from './use-marketplace-providers';
import type { ProviderListItem } from './types';
import { getIndustry, VERTICALS } from '@/lib/industry-catalog';
import { mapIndustryToUrlSlug, slugifyCity } from '@/lib/seo/schemas';
import { rankProviders, haversineKm } from '@/lib/marketplace-ranking';
import { cn } from '@/lib/utils';

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
  // searchInput / cityInput live in a shared Zustand store so the hero
  // search bar (MarketplaceHeroSearch) and this component stay in sync
  // across the server/client boundary. Typing in the hero instantly
  // filters the grid below.
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
  // Trust filters (sidebar) — sent to the API as query params so the server
  // filters before pagination (otherwise the user would see fewer items per
  // page after enabling a trust filter).
  const trustFullyVerified = useMarketplaceSearch((s) => s.trustFullyVerified);
  const trustRatingHigh = useMarketplaceSearch((s) => s.trustRatingHigh);
  const trustEmergency = useMarketplaceSearch((s) => s.trustEmergency);

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
  const ssrFiltersMatchUrl =
    !initialFilters.search && !initialFilters.city && !initialFilters.vertical && !initialFilters.industry;
  const {
    providers: loadedProviders,
    total: loadedTotal,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    fetchNextPage,
  } = useMarketplaceProviders(
    {
      country: detectedCountry ?? null,
      search: searchQuery,
      city: cityFilter,
      vertical: verticalFilter,
      industry: industryFilter,
      trustFullyVerified,
      trustRatingHigh,
      trustEmergency,
    },
    ssrFiltersMatchUrl ? providers : undefined,
    ssrFiltersMatchUrl ? initialNextCursor : null,
    ssrFiltersMatchUrl ? initialTotal : undefined,
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

  // Seed the shared store from URL params on first mount so a deep-link
  // like /marketplace?search=plumbing pre-fills the hero search box. Also
  // seeds vertical/industry filters from the URL so deep-links like
  // /marketplace?vertical=home-property&industry=hvac work. Runs after
  // hydration to avoid a server/client value mismatch.
  React.useEffect(() => {
    if (initialFilters.search && !searchInput) {
      setSearchInput(initialFilters.search);
    }
    if (initialFilters.city && !cityInput) {
      setCityInput(initialFilters.city);
    }
    // Seed vertical/industry from URL only if the store doesn't already
    // have a value (avoids overwriting a user's in-progress filter on a
    // React re-mount).
    if (initialFilters.vertical && !verticalFilter) {
      selectVertical(initialFilters.vertical);
    }
    if (initialFilters.industry && !industryFilter) {
      // We need the parent vertical for the industry. If the URL has both,
      // use the vertical from the URL. Otherwise, derive it from the
      // industry catalog.
      const parentVertical = initialFilters.vertical
        ? initialFilters.vertical
        : (() => {
            const meta = getIndustry(initialFilters.industry);
            return meta?.vertical ?? null;
          })();
      if (parentVertical) {
        selectIndustry(initialFilters.industry, parentVertical);
      }
    }
    // Intentionally run once on mount — we only want to seed from the URL
    // the first time this component mounts, not on every store change.
  }, []);

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
          const age = Date.now() - parsed.timestamp;
          if (age < 7 * 24 * 60 * 60 * 1000) {
            setUserLocation({
              lat: parsed.lat,
              lng: parsed.lng,
              city: parsed.city,
              source: parsed.source,
              lowAccuracy: parsed.source === 'ip',
            });
            // NOTE: intentionally NOT calling setCityInput() here — see the
            // effect header comment. userLocation (ranking) is restored; the
            // city filter stays empty until the user types or clicks
            // "Use my location".
            return;
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
            if (res.ok) {
              const data = await res.json();
              city = data.city || null;
            }
            const loc = {
              city,
              state: null,
              country: null,
              lat: latitude,
              lng: longitude,
              source: 'gps' as const,
              accuracy: 'gps' as const,
              timestamp: Date.now(),
            };
            localStorage.setItem('fieseros_user_location', JSON.stringify(loc));
            setUserLocation({
              lat: latitude,
              lng: longitude,
              city,
              source: 'gps',
              lowAccuracy: false,
            });
            // NOTE: intentionally NOT calling setCityInput() — the city
            // filter is user-driven only. See the effect header comment.
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

  // NOTE: The old "flash skeleton on filter change" effect (which set
  // `filtering` for 180ms + reset `visibleCount`) has been removed. With
  // server-side cursor pagination, `filtering` is derived from the hook's
  // `isFetching` state (true while the API request is in flight), and
  // pagination is handled by `fetchNextPage()` (no `visibleCount` to reset).

  // ── Mirror filter state into the URL (replaceState, no reload) ─────────
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
    window.history.replaceState({}, '', url.toString());
  }, [searchQuery, cityFilter, verticalFilter, industryFilter]);

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

  // ── Infinite scroll via IntersectionObserver ───────────────────────────
  // A sentinel <div> sits at the bottom of the grid. When it scrolls into
  // view (and there are more pages, and we're not already fetching) we call
  // fetchNextPage() to load the next 24 providers from the API. This is TRUE
  // server-side pagination — the old approach just sliced an already-loaded
  // 1000-item array (no actual network request on scroll).
  //
  // 200px rootMargin: fires the fetch when the user is ~200px from the
  // bottom, so the next page loads before they actually reach it (smooth UX,
  // no visible spinner in the common case).
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const loadingMore = isFetchingNextPage;

  React.useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || filtering) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          // Fetch the next page from the API. The hook handles dedup (no-op
          // if a fetch is already in flight) + race conditions.
          fetchNextPage();
        }
      },
      { rootMargin: '200px 0px' },
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

  return (
    <div className="pl-4 pr-3 sm:pr-3 lg:pr-3 py-4">
      {/* ── Country banner ──────────────────────────────────────────────── */}
      {/* When GeoIP detects the visitor's country (or ?country= is set),
          show a banner so the user knows the results are country-filtered.
          Includes a "Browse all countries" link to clear the filter. */}
      {detectedCountry ? (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Showing providers in <strong className="font-semibold">{detectedCountry}</strong>
          </span>
          <a
            href="/marketplace?country="
            className="underline hover:no-underline"
          >
            Browse all countries
          </a>
        </div>
      ) : null}

      {/* The search bar now lives in the hero (MarketplaceHeroSearch) and
          shares its input state via the useMarketplaceSearch Zustand store.
          Typing in the hero instantly filters the grid below — no reload,
          no Enter required. A <noscript> GET form in the server page still
          serves non-JS users. */}

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
          className="rounded-xl border border-border bg-card p-8 text-center"
        >
          <p className="text-sm text-muted-foreground">
            No providers match {activeChips.length > 0 ? 'these filters' : 'this filter'}
            {searchQuery ? (
              <>
                {' '}for <span className="font-medium text-foreground">&ldquo;{searchQuery}&rdquo;</span>
              </>
            ) : null}.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different search term or clear all filters.
          </p>
          {activeChips.length > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="mt-4 inline-flex items-center gap-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Clear all filters
            </button>
          ) : null}
        </div>
      ) : visible.length === 0 ? (
        /* Only show skeletons when there are genuinely zero visible cards
           (e.g. the very first paint before providers hydrate). This reserves
           a stable ~3-row height so the footer doesn't jump on initial load. */
        <div
          className="grid min-h-[420px] gap-5 sm:grid-cols-2 xl:grid-cols-3"
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
            'grid min-h-[420px] gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 transition-opacity duration-150',
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
