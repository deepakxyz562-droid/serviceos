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
 *   • Load-more pagination (12 → 24 → 36 …) instead of a hard 24-item cap
 *   • Active filter chips (removable)
 *   • Skeleton shimmer during the brief filter-applied window
 *
 * Filter state is mirrored into the URL via history.replaceState so the page
 * is shareable and the back button works, WITHOUT triggering a Next.js
 * navigation/reload.
 *
 * Accessibility: the search input has aria-label, the sort select has a
 * visible label, the load-more button announces remaining count, and the
 * "no results" state has role="status".
 */

import * as React from 'react';
import {
  Search,
  MapPin,
  X,
  SlidersHorizontal,
  Loader2,
  ArrowDown,
  Star,
  ShieldCheck,
} from 'lucide-react';
import { ProviderCard } from './provider-card';
import type { ProviderListItem } from './types';
import { getIndustry } from '@/lib/industry-catalog';
import { mapIndustryToUrlSlug, slugifyCity } from '@/lib/seo/schemas';

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
  /** All distinct cities (for the city chip row). */
  cities: string[];
}

type SortKey = 'rating' | 'reviews' | 'name' | 'verified';

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'rating', label: 'Top rated' },
  { key: 'reviews', label: 'Most reviewed' },
  { key: 'verified', label: 'Most verified' },
  { key: 'name', label: 'Name (A–Z)' },
];

const PAGE_SIZE = 12;

export function MarketplaceBrowser({
  providers,
  initialFilters,
  cities,
}: MarketplaceBrowserProps) {
  // ── Filter state (hydrated from URL on first render) ───────────────────
  const [searchInput, setSearchInput] = React.useState(initialFilters.search ?? '');
  const [searchQuery, setSearchQuery] = React.useState(initialFilters.search ?? '');
  const [cityInput, setCityInput] = React.useState(initialFilters.city ?? '');
  const [cityFilter, setCityFilter] = React.useState(initialFilters.city ?? '');
  const [verticalFilter, setVerticalFilter] = React.useState(initialFilters.vertical ?? null);
  const [industryFilter, setIndustryFilter] = React.useState(initialFilters.industry ?? null);
  const [sort, setSort] = React.useState<SortKey>('rating');
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

  // ── Flash skeleton on filter change ────────────────────────────────────
  React.useEffect(() => {
    setFiltering(true);
    const t = setTimeout(() => setFiltering(false), 180);
    return () => clearTimeout(t);
  }, [searchQuery, cityFilter, verticalFilter, industryFilter, sort]);

  // Reset visible count whenever the filtered set changes
  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, cityFilter, verticalFilter, industryFilter, sort]);

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
      return true;
    });

    // Sort
    list = list.slice().sort((a, b) => {
      switch (sort) {
        case 'reviews':
          return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
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
          // Featured first, then rating, then reviewCount
          if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;
          if ((b.rating ?? 0) !== (a.rating ?? 0))
            return (b.rating ?? 0) - (a.rating ?? 0);
          return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      }
    });

    return list;
  }, [providers, searchQuery, cityFilter, verticalFilter, industryFilter, sort]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

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
    <div>
      {/* ── Search bar (client-side, debounced) ────────────────────────────
          A <noscript> sibling in the server page still renders the plain
          GET form so non-JS users can search. */}
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col gap-2 rounded-2xl border bg-card p-2 shadow-xl sm:flex-row sm:items-center hover:border-emerald-300 focus-within:border-emerald-300 transition-colors">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search providers by name, service, or keyword — e.g. &quot;plumbing&quot;"
              aria-label="Search providers"
              className="h-12 w-full pl-11 pr-9 rounded-lg bg-transparent text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="relative flex-1 sm:max-w-[220px]">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="City or postal code"
              aria-label="Filter by city"
              className="h-12 w-full pl-9 pr-9 rounded-lg bg-transparent text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
            {cityInput ? (
              <button
                type="button"
                onClick={() => {
                  setCityInput('');
                  setCityFilter('');
                }}
                aria-label="Clear city filter"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Instant search — no need to press Enter. Or use the industry + city filters in the sidebar.
        </p>
      </div>

      {/* ── Results header: count + sort ─────────────────────────────────── */}
      <div className="mb-5 mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            {verticalFilter || industryFilter
              ? (verticalFilter
                  ? verticalFilter
                      .split('-')
                      .map((w) => w[0].toUpperCase() + w.slice(1))
                      .join(' ')
                  : getIndustry(industryFilter ?? '')?.name ?? 'Providers')
              : 'All Providers'}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>
              Showing{' '}
              <span className="font-medium text-foreground">{visible.length}</span>{' '}
              of{' '}
              <span className="font-medium text-foreground">{filtered.length}</span>{' '}
              provider{filtered.length === 1 ? '' : 's'}
              {searchQuery ? (
                <>
                  {' '}matching <span className="font-medium text-foreground">&ldquo;{searchQuery}&rdquo;</span>
                </>
              ) : null}
            </span>
            {activeChips.length > 0 ? (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-0.5 font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
                aria-label="Clear all filters"
              >
                Clear all <span aria-hidden>&times;</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="marketplace-sort" className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Sort
          </label>
          <select
            id="marketplace-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Active filter chips ──────────────────────────────────────────── */}
      {activeChips.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center gap-2">
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
        </div>
      ) : null}

      {/* ── City quick-chips (only when no city filter is active) ────────── */}
      {!cityFilter && cities.length > 0 ? (
        <div className="mb-5 hidden lg:block">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Popular cities
          </p>
          <div className="flex flex-wrap gap-1.5">
            {cities.slice(0, 12).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCityInput(c);
                  setCityFilter(c);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:border-emerald-300 hover:text-emerald-700"
              >
                <MapPin className="h-3 w-3" /> {c}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Grid (with skeleton shimmer during filter changes) ──────────── */}
      {filtering ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
          {Array.from({ length: Math.min(visibleCount, 6) }).map((_, i) => (
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
      ) : filtered.length === 0 ? (
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
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
                compact
                href={canonicalHref}
              />
            );
          })}
        </div>
      )}

      {/* ── Load more ────────────────────────────────────────────────────── */}
      {hasMore && !filtering ? (
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50/60 px-6 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
          >
            <ArrowDown className="h-4 w-4" />
            Show {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
            <span className="text-xs font-normal text-emerald-600/70 dark:text-emerald-400/70">
              ({filtered.length - visibleCount} remaining)
            </span>
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
