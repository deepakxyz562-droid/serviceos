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
} from 'lucide-react';
import { ProviderCard } from './provider-card';
import { useMarketplaceSearch, type MarketplaceSortKey } from './use-marketplace-search';
import type { ProviderListItem } from './types';
import { getIndustry } from '@/lib/industry-catalog';
import { mapIndustryToUrlSlug, slugifyCity } from '@/lib/seo/schemas';
import { cn } from '@/lib/utils';

interface MarketplaceBrowserProps {
  /** Full list of opted-in providers (server-fetched, up to 120). */
  providers: ProviderListItem[];
  /** Initial filters from the URL search params (SSR). */
  initialFilters: {
    vertical: string | null;
    industry: string | null;
    city: string | null;
    search: string | null;
  };
}

// SortKey is now shared with the breadcrumb Sort dropdown via the
// useMarketplaceSearch Zustand store. The SORTS label array lives in
// MarketplaceSortControl (the dropdown component) — this file just reads
// the active key from the store.
type SortKey = MarketplaceSortKey;

const PAGE_SIZE = 12;

export function MarketplaceBrowser({
  providers,
  initialFilters,
}: MarketplaceBrowserProps) {
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
  const [verticalFilter, setVerticalFilter] = React.useState(initialFilters.vertical ?? null);
  const [industryFilter, setIndustryFilter] = React.useState(initialFilters.industry ?? null);
  // Sort now lives in the shared Zustand store so the breadcrumb Sort
  // dropdown (rendered by the server page) and this grid stay in sync.
  const sort = useMarketplaceSearch((s) => s.sort);
  // Trust filters (sidebar) — instant client-side filtering
  const trustFullyVerified = useMarketplaceSearch((s) => s.trustFullyVerified);
  const trustRatingHigh = useMarketplaceSearch((s) => s.trustRatingHigh);
  const trustEmergency = useMarketplaceSearch((s) => s.trustEmergency);
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  // Brief skeleton flash when filters change so the user sees the grid react.
  const [filtering, setFiltering] = React.useState(false);

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
  // like /marketplace?search=plumbing pre-fills the hero search box. Runs
  // after hydration to avoid a server/client value mismatch.
  React.useEffect(() => {
    if (initialFilters.search && !searchInput) {
      setSearchInput(initialFilters.search);
    }
    if (initialFilters.city && !cityInput) {
      setCityInput(initialFilters.city);
    }
    // Intentionally run once on mount — we only want to seed from the URL
    // the first time this component mounts, not on every store change.
  }, []);

  // ── Flash skeleton on filter change & reset pagination ─────────────────
  React.useEffect(() => {
    const r = requestAnimationFrame(() => {
      setFiltering(true);
      setVisibleCount(PAGE_SIZE);
    });
    const t = setTimeout(() => setFiltering(false), 180);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(t);
    };
  }, [searchQuery, cityFilter, verticalFilter, industryFilter, sort, trustFullyVerified, trustRatingHigh, trustEmergency]);

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

  // NOTE: sidebar vertical/industry links are NOT intercepted. They're
  // server-rendered <a> tags with real crawlable hrefs (e.g.
  // /marketplace?vertical=home-property). Letting them navigate normally
  // means the server re-renders the sidebar with the active vertical's
  // sub-industries expanded — which is important UX. The search input,
  // city input, sort, and load-more are all client-side instant (no
  // reload), which is what Issue 2 asked for.

  // ── Compute filtered + sorted list ─────────────────────────────────────
  const filtered = React.useMemo(() => {
    const q = searchQuery.toLowerCase();
    const c = cityFilter.toLowerCase();
    let list = providers.filter((p) => {
      // Industry filter
      if (industryFilter) {
        const ind = (p.industry ?? '').toLowerCase().trim();
        if (ind !== industryFilter) return false;
      }
      // Vertical filter
      if (verticalFilter) {
        const meta = p.industry ? getIndustry(p.industry) : undefined;
        if (!meta || meta.vertical !== verticalFilter) return false;
      }
      // City filter
      if (c) {
        const city = (p.city ?? '').toLowerCase();
        const state = (p.state ?? '').toLowerCase();
        const inAreas = p.serviceAreas.some((a) =>
          String(a).toLowerCase().includes(c),
        );
        if (!city.includes(c) && !state.includes(c) && !inAreas) return false;
      }
      // Free-text search
      if (q) {
        const name = (p.name ?? '').toLowerCase();
        const tagline = (p.tagline ?? '').toLowerCase();
        const description = (p.description ?? '').toLowerCase();
        const svcMatch = p.services.some((s) =>
          (s.name ?? '').toLowerCase().includes(q),
        );
        if (
          !name.includes(q) &&
          !tagline.includes(q) &&
          !description.includes(q) &&
          !svcMatch
        ) {
          return false;
        }
      }
      // Trust filters (sidebar)
      if (trustFullyVerified) {
        if (!(p.identityVerified && p.businessVerified && p.insuranceVerified && p.stripeConnected)) {
          return false;
        }
      }
      if (trustRatingHigh) {
        if ((p.rating ?? 0) < 4.8) return false;
      }
      if (trustEmergency) {
        if (!p.emergencyServiceAvailable) return false;
      }
      return true;
    });

    // Sort
    list = list.slice().sort((a, b) => {
      // Featured cards ALWAYS sort first, regardless of the selected sort key.
      // This is the OLX-style "premium listings at the top" behaviour.
      if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;

      switch (sort) {
        case 'reviews':
          return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
        case 'response': {
          // Fastest response first (lower minutes = faster). Nulls sort last.
          const aResp = a.responseTimeMins ?? 9999;
          const bResp = b.responseTimeMins ?? 9999;
          if (aResp !== bResp) return aResp - bResp;
          return (b.rating ?? 0) - (a.rating ?? 0);
        }
        case 'name':
          return (a.name ?? '').localeCompare(b.name ?? '');
        case 'verified': {
          // Fully-verified (all 4 gates) first, then by rating
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
          // Rating, then reviewCount (featured already sorted above)
          if ((b.rating ?? 0) !== (a.rating ?? 0))
            return (b.rating ?? 0) - (a.rating ?? 0);
          return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      }
    });

    return list;
  }, [providers, searchQuery, cityFilter, verticalFilter, industryFilter, sort, trustFullyVerified, trustRatingHigh, trustEmergency]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // ── Infinite scroll via IntersectionObserver ───────────────────────────
  // A sentinel <div> sits at the bottom of the grid. When it scrolls into
  // view (and there are more items, and we're not mid-filter-flash) we bump
  // visibleCount by PAGE_SIZE — so the next batch of 12 cards renders and
  // the grid grows. This continues until all filtered providers are shown.
  //
  // Fix D: The old implementation had a 180ms artificial setTimeout delay
  // and a 400px rootMargin. The delay created a window where the page
  // height was in flux (spinner visible, no new cards yet) which made the
  // sticky sidebar jerk and the footer shift as the grid height oscillated.
  // The 400px rootMargin fired too aggressively, loading the next batch
  // while the user was still 400px away — causing height jumps during
  // normal scrolling. Now we render the next batch IMMEDIATELY when the
  // sentinel intersects (no setTimeout) and use a tighter 200px rootMargin
  // so the load fires closer to when the user actually needs the cards.
  // The spinner still shows via the `loadingMore` state, but it's cleared
  // synchronously in the same tick as setVisibleCount, so there's no
  // height-flux gap.
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);

  React.useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || filtering) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          // Render the next batch immediately — no artificial delay. This
          // eliminates the height-flux window that caused the sidebar/footer
          // to jerk during infinite-scroll loading.
          setLoadingMore(true);
          // Use requestAnimationFrame instead of setTimeout so the spinner
          // paints for exactly one frame (perceptible but not janky), then
          // the new cards render in the next frame.
          requestAnimationFrame(() => {
            setVisibleCount((c) => c + PAGE_SIZE);
            setLoadingMore(false);
          });
        }
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, filtering, filtered.length]);

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
    activeChips.push({
      label: `Vertical: ${v}`,
      onClear: () => setVerticalFilter(null),
    });
  }
  if (industryFilter) {
    const meta = getIndustry(industryFilter);
    activeChips.push({
      label: `Industry: ${meta?.name ?? industryFilter}`,
      onClear: () => setIndustryFilter(null),
    });
  }

  const clearAll = () => {
    setSearchInput('');
    setSearchQuery('');
    setCityInput('');
    setCityFilter('');
    setVerticalFilter(null);
    setIndustryFilter(null);
  };

  return (
    <div className="pl-4 pr-3 sm:pr-3 lg:pr-3 py-4">
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
          enters the viewport we load the next PAGE_SIZE providers. The
          spinner shows while that batch is being added. Once everything is
          loaded (hasMore === false) the sentinel is unmounted entirely. */}
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
