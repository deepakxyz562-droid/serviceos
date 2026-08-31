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
  ChevronDown,
} from 'lucide-react';
import { ProviderCard } from './provider-card';
import { useMarketplaceSearch, type MarketplaceSortKey } from './use-marketplace-search';
import { useMarketplaceProviders } from './use-marketplace-providers';
import { ReloadButton } from './reload-button';
import type { ProviderListItem } from './types';
import { getIndustry, VERTICALS } from '@/lib/industry-catalog';
import { slugifyCity } from '@/lib/seo/schemas';
import { mapIndustryToPluralSlug } from '@/lib/seo/plural-industry-slugs';
import { rankProviders, haversineKm } from '@/lib/marketplace-ranking';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { useVirtualizer } from '@tanstack/react-virtual';

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
    /** Phase 3A: server-side sort from URL (?sort=reviews). Synced to the
     *  Zustand store on mount so the SSR-fetched items match the store's
     *  sort state. null = no sort in URL → store's default ('recommended')
     *  is preserved (no override). */
    sort?: string | null;
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
    // mapIndustryToPluralSlug/slugifyCity are already imported at the top of
    // this file (static import is fine — they're pure functions, no Dexie).
    // We store the PLURAL slug so offline-rebuilt URLs match the canonical
    // plural route and never trigger a singular→plural 301 redirect.
    import('@/lib/offline-db')
      .then(({ cacheProviders }) => {
        const cached = providers.map((p) => ({
          id: p.id,
          slug: p.slug || p.publicSlug || p.id,
          name: p.name,
          industry: p.industry ?? null,
          industryUrlSlug: mapIndustryToPluralSlug(p.industry),
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
  // `cityFilter` (debounced) lives in the SHARED store so the sidebar can
  // read it for the counts hook. Previously this was local state, which meant
  // the sidebar's `useMarketplaceSearch((s) => s.cityFilter)` always returned
  // undefined → the counts endpoint was called WITHOUT the city filter →
  // sidebar showed country-wide counts (or 0) instead of city-scoped counts.
  const cityFilter = useMarketplaceSearch((s) => s.cityFilter);
  const setCityFilter = useMarketplaceSearch((s) => s.setCityFilter);

  // Debounced filter values (local) — derived from the shared store inputs.
  const [searchQuery, setSearchQuery] = React.useState(initialFilters.search ?? '');
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
  const setSort = useMarketplaceSearch((s) => s.setSort);
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
  const bookOnline = useMarketplaceSearch((s) => s.bookOnline);
  const buyProduct = useMarketplaceSearch((s) => s.buyProduct);
  const requestQuote = useMarketplaceSearch((s) => s.requestQuote);
  const radiusKm = useMarketplaceSearch((s) => s.radiusKm);
  const setRadiusKm = useMarketplaceSearch((s) => s.setRadiusKm);
  const minRating = useMarketplaceSearch((s) => s.minRating);
  const setMinRating = useMarketplaceSearch((s) => s.setMinRating);
  const claimedFilter = useMarketplaceSearch((s) => s.claimedFilter);
  const setClaimedFilter = useMarketplaceSearch((s) => s.setClaimedFilter);

  // ── userExplicitlyClearedCity flag (Issue #2 filter persistence) ─────
  // True when the user has EXPLICITLY cleared the city filter. The mount-once
  // GPS auto-detect effect below reads this to decide whether to auto-set
  // cityFilter from a detected location. Without this guard, navigating
  // browse → detail → back would re-trigger auto-detect and silently re-apply
  // the city the user just cleared (because the component remounts and the
  // auto-detect sees `cityFilter === ''` as "user hasn't picked yet").
  const setUserExplicitlyClearedCity = useMarketplaceSearch((s) => s.setUserExplicitlyClearedCity);

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
  // ── Phase 2: server-side filter params ─────────────────────────────────
  // minRating, claimedFilter and radiusKm now filter at the DB level. The
  // radius filter additionally needs the user's lat/lng — but ONLY when the
  // location is high-accuracy (GPS / manual). IP-derived lowAccuracy
  // locations are too imprecise for a Haversine radius filter (a city-level
  // IP geocode can be off by 50km+), so we pass `null` for lat/lng AND
  // radiusKm in that case — the server then skips the radius filter
  // entirely. The sidebar's radius slider is also disabled when
  // lowAccuracy is true (see marketplace-sidebar.tsx).
  const hasPreciseLocation = !!(userLocation && !userLocation.lowAccuracy);
  const userLat = hasPreciseLocation ? userLocation!.lat : null;
  const userLng = hasPreciseLocation ? userLocation!.lng : null;
  const effectiveRadiusKm = hasPreciseLocation ? radiusKm : null;

  // Only use SSR initial data if the current active filters match the initial filters exactly.
  // This prevents React Query from seeding filtered queries with the wrong SSR initial data.
  // The SSR page fetches WITHOUT minRating / claimedFilter / radius filters, so if any of
  // those are active we must NOT use the SSR seed (it would be stale).
  const matchesInitial = React.useMemo(() => {
    const countryMatches =
      !initialFilters.country ||
      !countryFilter ||
      (countryFilter ?? detectedCountry ?? null) === initialFilters.country;
    return (
      searchQuery === (initialFilters.search ?? '') &&
      cityFilter === (initialFilters.city ?? '') &&
      verticalFilter === initialFilters.vertical &&
      industryFilter === initialFilters.industry &&
      countryMatches &&
      !trustFullyVerified &&
      !trustRatingHigh &&
      !trustEmergency &&
      !bookOnline &&
      !buyProduct &&
      !requestQuote &&
      minRating === 0 &&
      claimedFilter === 'all' &&
      effectiveRadiusKm === null
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
    bookOnline,
    buyProduct,
    requestQuote,
    minRating,
    claimedFilter,
    effectiveRadiusKm,
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
      bookOnline,
      buyProduct,
      requestQuote,
      // Phase 2 server-side filters:
      minRating,
      claimedFilter,
      userLat,
      userLng,
      radiusKm: effectiveRadiusKm,
      // Phase 3A: pass the user's selected sort. The hook normalizes the 4
      // deterministic sorts (rating/reviews/name/response) into the API
      // request, and collapses the 3 client-side sorts (recommended/distance/
      // verified) to 'rating' so they share a queryKey (no refetch on toggle).
      sort,
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
      const cleared = useMarketplaceSearch.getState().userExplicitlyClearedCity;
      if (!cleared) {
        setCityInput(initialFilters.city ?? '');
        setCityFilter(initialFilters.city ?? '');
      }
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
    // Phase 3A: sync the URL sort to the store. Only the 4 deterministic
    // sorts (rating|reviews|name|response) are valid URL sorts — anything
    // else (or null) leaves the store's sort untouched (preserves the
    // user's previous choice from the Zustand persist middleware).
    if (initialFilters.sort && initialFilters.sort !== prev.sort) {
      const validSorts: MarketplaceSortKey[] = ['rating', 'reviews', 'name', 'response'];
      if (validSorts.includes(initialFilters.sort as MarketplaceSortKey)) {
        setSort(initialFilters.sort as MarketplaceSortKey);
      }
    }

    prevFiltersRef.current = initialFilters;
  }, [
    initialFilters,
    setSearchInput,
    setCityInput,
    setCityFilter,
    selectVertical,
    selectIndustry,
    setCountryFilter,
    setSort,
  ]);

  // ── Seed countryFilter from GeoIP on the very first mount ───────────
  // Only seeds when the store has NO countryFilter (e.g. first visit).
  // Once a country is set (from the Zustand persist middleware OR from a
  // manual selection in the LocationChip country dropdown), NEVER override
  // it — the user's choice takes priority over the server's GeoIP guess.
  //
  // The previous version of this effect cleared `cityInput`, `cityFilter`,
  // and `userLocation` whenever `detectedCountry !== countryFilter`. That
  // fired on EVERY mount AND whenever `countryFilter` changed, which wiped
  // persisted city filters on back-navigation: e.g. the store had
  // `countryFilter='AU'` (manually picked + persisted) but `/marketplace`
  // was hit fresh with `detectedCountry='US'` (GeoIP) — the effect then
  // reset `countryFilter` to 'US' AND wiped the persisted `cityFilter`.
  // Those values are persisted by the Zustand persist middleware and
  // should survive back-navigation unchanged. `didSeedCountryRef` ensures
  // this effect runs at most once per component instance.
  const didSeedCountryRef = React.useRef(false);
  React.useEffect(() => {
    if (didSeedCountryRef.current) return;
    didSeedCountryRef.current = true;
    if (!countryFilter && detectedCountry) {
      setCountryFilter(detectedCountry);
    }
    // Do NOT clear cityInput/cityFilter/userLocation here — those are
    // persisted by the Zustand persist middleware and should survive
    // back-navigation.
  }, [detectedCountry, countryFilter, setCountryFilter]);

  // ── Auto-detect user location on mount (localStorage -> IP -> GPS) ──
  // Runs EXACTLY ONCE (didDetectRef guards against StrictMode double-invoke).
  //
  // IMPORTANT — auto-detect sets `userLocation` for distance ranking + the
  // 'recommended' composite sort. GPS (high-accuracy) auto-detect ALSO syncs
  // `cityFilter` so the API does a proper DB-level city-substring filter —
  // without this, the API returns top-24-by-rating for the whole country and
  // the client-side 25km radius filter hides most of them (the "Only 1
  // provider in Santa Clara" bug). IP-derived cities (lowAccuracy) are too
  // unreliable for filtering, so they set `userLocation` only (ranking).
  //
  // Auto-detect never writes into `cityInput` (the search box text) — that
  // was the root cause of the old feedback loop. It writes `cityFilter`
  // directly, which is safe because: (1) didDetectRef prevents re-detection,
  // (2) cityInput is not touched so the debounce effect can't loop, and
  // (3) we only set it if the user hasn't already typed a city (URL param
  // or manual input takes priority).
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
              // GPS (high accuracy) — sync cityFilter so the API does a
              // DB-level city-substring filter. IP cities are too unreliable.
              // GUARD (Issue #2): skip if the user has explicitly cleared the
              // city filter — otherwise navigating back from a detail page
              // would re-trigger this and silently re-apply the cleared city.
              if (parsed.source === 'gps' && parsed.city) {
                const current = useMarketplaceSearch.getState().cityFilter;
                const cleared = useMarketplaceSearch.getState().userExplicitlyClearedCity;
                if (!current && !cleared) setCityFilter(parsed.city);
              }
              return;
            }
          }
        }
      } catch {}
    }

    // 2. Fetch IP location dynamically if not cached
    //
    // BUGFIX (manual-pick guard): If the user picks a city from the
    // LocationChip dropdown BEFORE this async IP lookup resolves, the
    // IP callback would overwrite their `source:'manual'` pick — and
    // because IP-derived cities often aren't in the cities catalogue,
    // the LocationChip's <Select> would fall through to the placeholder,
    // making the picked city "disappear" from the dropdown. We now skip
    // the overwrite whenever the store already holds a manual pick.
    async function detectIpLocation() {
      try {
        const res = await fetch('/api/geocode/ip');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.lat && data.lng && active) {
          // Manual picks always win — never overwrite them with an IP guess.
          if (useMarketplaceSearch.getState().userLocation?.source === 'manual') {
            return;
          }
          setUserLocation({
            lat: data.lat,
            lng: data.lng,
            city: data.city,
            source: 'ip',
            lowAccuracy: true,
          });
          // NOTE: IP-derived locations are lowAccuracy — we set userLocation
          // for ranking only, NOT cityFilter (IP cities are too unreliable).
        }
      } catch (err) {
        console.error('Failed to get IP location on mount:', err);
      }
    }
    detectIpLocation();

    // 3. Ask for high-accuracy GPS permission in parallel
    //
    // BUGFIX (manual-pick guard): Same race-condition fix as the IP
    // callback above. GPS resolution can take several seconds (especially
    // with enableHighAccuracy:false + 5s timeout), during which the user
    // may have already picked a city from the dropdown. A late-resolving
    // GPS callback would otherwise overwrite their explicit pick — even
    // though GPS is "higher accuracy", the user's explicit choice should
    // be authoritative.
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!active) return;
          // Manual picks always win — never overwrite them with a GPS guess.
          if (useMarketplaceSearch.getState().userLocation?.source === 'manual') {
            return;
          }
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
            // Re-check AFTER the await — the user may have picked a city
            // while the reverse-geocode request was in flight.
            if (useMarketplaceSearch.getState().userLocation?.source === 'manual') {
              return;
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
            // GPS is high-accuracy — sync the city filter so the API does
            // a proper DB-level city-substring filter (not just client-side
            // ranking). Only set if user hasn't already typed a city.
            // GUARD (Issue #2): also skip if the user has explicitly cleared
            // the city filter — otherwise a late-resolving GPS callback after
            // browse → detail → back would silently re-apply the cleared city.
            if (city) {
              const current = useMarketplaceSearch.getState().cityFilter;
              const cleared = useMarketplaceSearch.getState().userExplicitlyClearedCity;
              if (!current && !cleared) setCityFilter(city);
            }
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

  // ── Ref to the scrollable <main> ancestor (#main-content in the parent
  // (browse)/page.tsx). The <main> itself is owned by the server component
  // parent, so we attach a callback ref to OUR outermost <div> and walk up
  // via `closest('main')`. This is more robust than `getElementById` — it
  // doesn't depend on the ID being globally unique, and it survives cases
  // where the detail page (which no longer uses that ID) is involved.
  const scrollContainerRef = React.useRef<HTMLElement | null>(null);
  const setScrollContainer = React.useCallback<React.RefCallback<HTMLElement>>((node) => {
    const main = node?.closest('main');
    scrollContainerRef.current = main instanceof HTMLElement ? main : null;
  }, []);

  // ── Scroll position restoration for back navigation ────────────────────
  // The marketplace uses a CUSTOM scroll container (the <main id="main-
  // content"> in the parent (browse)/page.tsx), not the window. Next.js's
  // `experimental.scrollRestoration` only handles window scrolling, so we
  // manually save/restore the scroll position to sessionStorage.
  //
  // This is the single biggest perceived-speed win for back navigation:
  // without it, the user lands at the top of the page after back-nav and
  // has to scroll back down to find their previous position — which feels
  // slow even if the page rendered instantly.
  //
  // SPLIT into TWO effects (was previously a single effect with both
  // restore-on-mount AND save-on-unmount, but they were mutually
  // exclusive — the restore branch early-returned a `cancelAnimationFrame`
  // cleanup, so when restore fired the save-on-unmount cleanup was never
  // registered. Scroll restoration worked ONCE, then never again):
  //   1. Restore-on-mount (deps []): reads sessionStorage and restores.
  //   2. Save-on-unmount (deps []): returns a cleanup that writes the
  //      current scrollTop to sessionStorage when the component unmounts.

  // 1. RESTORE on mount — double-rAF so the list has rendered its full
  // height before we attempt to restore scroll position. A single rAF
  // fires before the browser has laid out the new content; the second
  // rAF fires after layout, so `container.scrollTop = scrollY` sticks.
  //
  // MKT-10b FIX: If the saved scrollY exceeds the current container
  // height (React Query cache expired, only 24 SSR items re-rendered),
  // the initial restore caps at the bottom of the short list. The
  // follow-up effect below (3. RE-APPLY after fetchNextPage) handles
  // re-applying scrollY as more pages load until the container is tall
  // enough.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = sessionStorage.getItem('marketplace-scroll-y');
    if (!saved) return;
    const scrollY = parseInt(saved, 10);
    if (isNaN(scrollY)) return;

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const container = scrollContainerRef.current;
        if (container) {
          container.scrollTop = scrollY;
        }
      });
    });
    return () => cancelAnimationFrame(raf2);
  }, []);

  // 2. SAVE on unmount — capture the container reference at effect-run
  // time (on mount) so the cleanup can read `scrollTop` even after React
  // has detached the ref during the unmount commit.
  //
  // MKT-10a FIX: useLayoutEffect instead of useEffect. In React 18,
  // useEffect cleanups run AFTER DOM detach, so `container.scrollTop`
  // may read 0 on a detached node (Safari is known to reset this).
  // useLayoutEffect cleanups run synchronously BEFORE detach, so the
  // node is still attached and scrollTop returns the correct value.
  React.useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    return () => {
      if (container) {
        try {
          sessionStorage.setItem('marketplace-scroll-y', String(container.scrollTop));
        } catch {}
      }
    };
  }, []);

  // 3. RE-APPLY scroll after fetchNextPage (MKT-10b FIX) ──────────────────
  // When the user returns from the detail page and the React Query cache
  // has expired (>30min), only the initial 24 SSR items re-render. The
  // saved scrollY may exceed the container height, so the initial restore
  // (effect 1) caps at the bottom of the short list. As fetchNextPage
  // loads more pages, the container grows — but the scroll position isn't
  // re-applied. This effect re-applies the saved scrollY after each page
  // loads until the container is tall enough to accommodate it, then
  // clears the sessionStorage entry so it doesn't interfere with future
  // scroll saving.
  const savedScrollYRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    // Read the saved scrollY once on mount.
    if (savedScrollYRef.current === null) {
      const saved = sessionStorage.getItem('marketplace-scroll-y');
      const parsed = saved ? parseInt(saved, 10) : NaN;
      savedScrollYRef.current = isNaN(parsed) ? 0 : parsed;
    }
    const targetY = savedScrollYRef.current;
    if (targetY <= 0) return;

    // Only re-apply when a page fetch has just completed (not while
    // fetching — that would fight the user's scroll).
    if (isFetchingNextPage) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    // If the container is tall enough, apply the scroll and clear the ref
    // so we stop re-applying on future fetches.
    if (container.scrollHeight - container.clientHeight >= targetY) {
      container.scrollTop = targetY;
      savedScrollYRef.current = 0; // done — stop re-applying
    }
    // If not tall enough yet, do nothing — the next fetchNextPage will
    // trigger this effect again and re-check.
  }, [loadedProviders.length, isFetchingNextPage]);

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
  // With server-side cursor pagination, the API already applies ALL filters
  // (search / city / vertical / industry / trust / minRating / claimedFilter
  // / radiusKm) before returning items. The hook's `loadedProviders` is the
  // flattened list of all loaded pages — already filtered.
  //
  // PHASE 3A — Server-side deterministic sorts:
  // For rating / reviews / name / response, the server returns items in the
  // correct global order (sort-specific cursor + orderBy). We DO NOT re-sort
  // here — trusting the server order is the whole point of Phase 3A. The
  // featured-first pinning is also handled by the server (featured items
  // come first on page 1, sorted by rating DESC within the featured group).
  //
  // For recommended / distance / verified, the server fetches by 'rating'
  // (the default sort) and the client re-ranks the loaded items. These 3
  // sorts don't have a single deterministic server-side equivalent yet —
  // Phase 3B/3C/3D will add them. The trade-off: for these 3 sorts, the
  // global order isn't perfectly correct across pages (only within each
  // loaded page). This is acceptable for the browse grid.
  //
  // PHASE 2 NOTE: The three client-side filters that used to live here
  // (minRating, claimedFilter, radiusKm Haversine) have been REMOVED — they
  // are now applied by the server (see useMarketplaceProviders params). This
  // fixes the "filter hides items the server already paginated past" bug
  // (e.g. enabling "claimed only" used to shrink the visible grid because
  // client-side filtering removed items the server had already counted).
  const filtered = React.useMemo(() => {
    let list = loadedProviders;

    // Phase 3A: server-side deterministic sorts — trust the server's order.
    // No re-sorting needed (featured-first is also handled by the server).
    if (
      sort === 'rating' ||
      sort === 'reviews' ||
      sort === 'name' ||
      sort === 'response'
    ) {
      return list;
    }

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
        // distance weight) but never FILTERS providers out. (The radius
        // FILTER is now applied server-side via the `radiusKm` API param —
        // this `filterByRadius=false` flag is about the RANKING lib, not
        // about whether to filter the result set.)
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
      // 'verified' sort — client-side composite verification score.
      // (Phase 3B will move this server-side with a materialized
      // verificationScore column.)
      list = list.slice().sort((a, b) => {
        // Featured cards ALWAYS sort first (OLX-style premium-at-top).
        if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;

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
      });
    }

    return list;
  }, [loadedProviders, sort, userLocation]);

  // All loaded items are visible (no client-side slicing — the hook's
  // fetchNextPage() grows the list as the user scrolls).
  const visible = filtered;
  const hasMore = hasNextPage;

  // ── Virtualization ─────────────────────────────────────────────────────
  // When loaded providers exceed the SSR page size (24), switch from
  // rendering ALL items to virtualizing only the visible + overscan.
  // Below the threshold, render normally to preserve SSR HTML (no
  // hydration mismatch).
  const VIRTUALIZATION_THRESHOLD = 24;
  const shouldVirtualize = visible.length > VIRTUALIZATION_THRESHOLD;

  // The virtualizer uses the #main-content scroll container (same as the
  // IntersectionObserver). Dynamic measurement handles variable card heights.
  const parentRef = React.useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? visible.length : 0,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 200, // Initial estimate — measureElement overrides
    overscan: 6, // Render 6 extra cards above/below the visible area
    gap: 16, // Matches the grid's gap-4 (16px)
  });

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
  // 400px rootMargin: fires the fetch when the user is ~400px from the
  // bottom, so the next page loads BEFORE they actually reach it (smooth UX,
  // no visible spinner in the common case). Increased from 200px to reduce
  // the chance of the user seeing the "Loading more providers…" spinner.
  //
  // STABILITY: The observer is created ONCE per (hasMore, filtering) change
  // — NOT on every loadedProviders.length change. This prevents the observer
  // from being torn down + recreated on every page arrival, which caused a
  // brief window where no observer was active and contributed to flicker.
  // The latest `fetchNextPage` is accessed via a ref so the callback never
  // goes stale without re-creating the observer.
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const fetchNextPageRef = React.useRef(fetchNextPage);
  fetchNextPageRef.current = fetchNextPage;
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
          // Fetch the next page from the API via the ref (always current,
          // no stale-closure risk). The hook handles dedup (no-op if a
          // fetch is already in flight) + race conditions.
          fetchNextPageRef.current();
        }
      },
      { root, rootMargin: '400px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // NOTE: intentionally NOT depending on loadedProviders.length — that
    // would tear down + recreate the observer on every page arrival and
    // cause flicker. The ref pattern keeps the callback fresh without
    // re-creating the observer.
  }, [hasMore, filtering]);

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
        // Mark that the user has explicitly cleared the city — prevents the
        // GPS auto-detect from re-applying it on the next mount (Issue #2).
        setUserExplicitlyClearedCity(true);
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
    // Mark that the user has explicitly cleared the city — prevents the GPS
    // auto-detect from re-applying it on the next mount (Issue #2).
    setUserExplicitlyClearedCity(true);
    // Also clear userLocation so the topbar LocationChip's label resets to
    // "Location" (the chip prioritizes userLocation.city over cityInput).
    // Without this, clearAll clears the city FILTER but the chip still shows
    // the detected/picked city name — confusing because the UI says a city
    // is active when the filter is actually empty.
    setUserLocation(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fieseros_user_location');
    }
    selectVertical(null);
    // Phase 2: reset the server-side filter params to their defaults so the
    // next fetch matches the "no filters" SSR baseline. Without this, the
    // user could clear-all and still see a filtered grid (e.g. minRating=4.5
    // was active, clearAll cleared the chips, but minRating stayed 4.5 →
    // the next fetch still filtered by rating).
    setMinRating(0);
    setClaimedFilter('all');
    setRadiusKm(25); // matches the store's default (see use-marketplace-search.ts)
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
    <div ref={setScrollContainer} className="pl-4 pr-3 sm:pr-3 lg:pr-3 py-4">
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
            <strong className="font-semibold">{locationLabel}</strong>.
            {hasPreciseLocation ? (
              <>
                {' '}Showing results within <strong className="font-semibold">{radiusKm}km</strong>.
              </>
            ) : null}
          </span>
        </div>
      ) : null}

      {/* ── MKT-9 FIX: Filtering loader banner ───────────────────────────────
          When `filtering` is true (category click, search, city, sort, etc.),
          show a non-blocking spinner banner above the grid so the user gets
          immediate visual feedback that their filter is being applied.

          Previously the grid had `opacity-50 + pointer-events-none` dimming
          during filtering, but it was removed due to flicker. The replacement
          (`filteringBanner`) was referenced in a comment but never actually
          built — so the user saw old providers with no feedback until the new
          results arrived. With `keepPreviousData` enabled in the query hook,
          old providers stay visible (no height collapse), and this banner sits
          above them as a clear "updating" signal. */}
      {filtering && (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Updating results…
        </div>
      )}

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
      ) : shouldVirtualize ? (
        <div
          ref={parentRef}
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const p = visible[virtualItem.index];
            if (!p) return null;
            const slug = p.slug || p.publicSlug;
            const canonicalHref = slug
              ? `/${mapIndustryToPluralSlug(p.industry)}/${slugifyCity(p.city)}/${slug}`
              : undefined;
            return (
              <div
                key={p.id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <ProviderCard
                  provider={p}
                  featured={!!p.featured}
                  href={canonicalHref}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className={cn(
            'grid min-h-[420px] gap-4 grid-cols-1',
            // NOTE: previously had `transition-opacity duration-150` + an
            // `opacity-50 pointer-events-none` dim during filtering. That
            // 150ms fade fired on EVERY filter/scroll event and was a major
            // source of perceived flicker. Removed in favor of a subtle
            // non-blocking top-of-grid spinner overlay (see filteringBanner
            // below) which doesn't dim the existing cards.
          )}
        >
          {visible.map((p) => {
            const slug = p.slug || p.publicSlug;
            // PLURAL industry segment → canonical /{pluralIndustry}/{city}/{slug}
            // URL. Linking directly to the plural form avoids a singular→plural
            // 301 permanentRedirect() on the detail route, which during
            // client-side navigation wipes the DOM (blank white page) before
            // loading.tsx can mount.
            const canonicalHref = slug
              ? `/${mapIndustryToPluralSlug(p.industry)}/${slugifyCity(p.city)}/${slug}`
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
          flight.
          
          STABILITY: The sentinel is ALWAYS rendered (not conditionally
          mounted/unmounted based on hasMore/filtering). Previously, the
          sentinel unmounted during filter changes and remounted after,
          causing an ~80px height jump + scroll shift + IntersectionObserver
          teardown/recreate. Now we keep it in the DOM at all times and
          just toggle its visibility/content. When there are no more pages
          OR we're filtering, we render a minimal zero-height placeholder
          that keeps the ref stable. */}
      <div
        ref={sentinelRef}
        className="mt-8 flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground"
        aria-live="polite"
      >
        {hasMore && !filtering ? (
          loadingMore ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              Loading more providers…
            </>
          ) : (
            <span className="sr-only">Scroll to load more providers</span>
          )
        ) : null}
      </div>

      {/* ── "Load more" button fallback (Issue #1 Fix F) ─────────────────── */}
      {/* IntersectionObserver doesn't always fire reliably — some mobile
          browsers, accessibility tools, or short pages (where the sentinel
          never enters the rootMargin) can leave the user stranded with no
          way to load page 2+. This explicit button gives them a manual
          fallback that always works. Hidden when: loading, no more pages,
          or currently filtering (the observer is torn down during filtering
          and a manual click would conflict with the in-flight refetch). */}
      {hasMore && !filtering && !loadingMore ? (
        <div className="mt-2 flex justify-center pb-4">
          <button
            type="button"
            onClick={() => fetchNextPageRef.current()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <ChevronDown className="h-4 w-4" aria-hidden />
            Load more providers
          </button>
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
