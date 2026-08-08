import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';
import { INDUSTRY_CATALOG, VERTICALS, getIndustry } from '@/lib/industry-catalog';
import { MarketplaceBrowser } from '@/components/marketplace/marketplace-browser';
import { MarketplaceHeader } from '@/components/marketplace/marketplace-header';
import { MarketplaceSidebar } from '@/components/marketplace/marketplace-sidebar';
import { MarketplaceSortControl } from '@/components/marketplace/marketplace-sort-control';
import { MarketplaceMobileNav } from '@/components/marketplace/marketplace-mobile-nav';
import { MarketplaceMobileFilters } from '@/components/marketplace/marketplace-mobile-filters';
import { ReloadButton } from '@/components/marketplace/reload-button';
import type { ProviderListItem } from '@/components/marketplace/types';
import { mapIndustryToUrlSlug, slugifyCity } from '@/lib/seo/schemas';
import { getAppUrl } from '@/lib/brand';
import { CornerstoneFooter } from '@/components/seo/cornerstone-footer';
import {
  MARKETPLACE_PAGE_SIZE,
  fetchFeaturedTenantIds,
  fetchProviderPage,
  mapTenantToProviderListItem,
  type ProviderFilterOptions,
} from '@/lib/marketplace-pagination';
import { fetchFeaturedListingsMap } from '@/lib/marketplace-featured';
import {
  Search,
  Home as HomeIcon,
  ChevronRight,
} from 'lucide-react';

// A5 (Route/Page Cache): The page itself stays force-dynamic so SuperAdmin
// seed/featured/trial changes appear on the next request without waiting for
// a 60s ISR window. BUT the expensive DB query inside fetchProviders() is
// wrapped in `unstable_cache` (below) with a 30s TTL — this cuts DB load by
// ~97% on a busy marketplace (1 DB query per 30s instead of per request)
// while keeping the SuperAdmin change latency under 30s.
//
// We deliberately did NOT switch to `export const revalidate = 60` because
// that would make the entire page static for 60s, delaying ALL changes
// (including new provider signups) by up to a minute. The current setup
// (dynamic page + cached query) gives the best of both: fresh HTML on every
// request, but the DB query that powers it is cached.
export const dynamic = 'force-dynamic';

/**
 * Marketplace browse page — server-rendered for SEO.
 *
 * Fetches all marketplace-opted-in, non-suspended providers (up to 120) and
 * renders them as a grid of provider cards. The interactive layer (instant
 * search, sort, load-more, filter chips) is handled by the MarketplaceBrowser
 * client component. The sidebar (industry filter by vertical) stays
 * server-rendered <a> links so the facet URLs are crawlable.
 *
 * SEO:
 *   • generateMetadata() builds a per-facet title + description
 *   • JSON-LD ItemList schema with every visible provider
 *   • BreadcrumbList JSON-LD + visible breadcrumb nav
 *   • <noscript> GET search form fallback for non-JS users
 */

// A5: Wrap the expensive DB query in `unstable_cache` with a 30s TTL.
// The cache key includes the country code so each country has its own
// 30s cache entry — when a user in AU visits, the DB query filters to
// country=AU and caches that result; a US visitor gets a separate cache
// entry for country=US.
//
// We use `unstable_cache` (not `export const revalidate`) because the PAGE
// must stay force-dynamic (SuperAdmin changes need to appear immediately in
// the HTML), but the QUERY can be cached. unstable_cache gives us this
// granular control — the page re-renders on every request, but the query
// result is reused for 30s.
/**
 * The SSR fetch result — page 1 items + the cursor for page 2 + total count.
 * Passed to MarketplaceBrowser so the client can seed its React Query cache
 * without re-fetching page 1.
 */
interface SsrProviderPage {
  items: ProviderListItem[];
  nextCursor: string | null;
  total: number;
}

const fetchProvidersCached = (filters: ProviderFilterOptions) =>
  unstable_cache(
    async (): Promise<SsrProviderPage> => {
      return fetchProvidersUncached(filters);
    },
    [
      'marketplace-providers-page1',
      filters.country || 'all',
      filters.search || '',
      filters.city || '',
      filters.vertical || '',
      filters.industry || '',
      String(filters.trustFullyVerified || false),
      String(filters.trustRatingHigh || false),
      String(filters.trustEmergency || false),
    ],
    { revalidate: 30 }, // 30 seconds
  )();

async function fetchProvidersUncached(filters: ProviderFilterOptions): Promise<SsrProviderPage> {

  // Fetch the set of featured tenant IDs (for featured-first sorting on page 1).
  const featuredIds = await fetchFeaturedTenantIds();

  // Fetch the featured map (metadata for cardType computation). Only needed
  // on page 1 — subsequent pages fetch non-featured items only.
  const featuredMap = await fetchFeaturedListingsMap(Array.from(featuredIds));

  const page = await fetchProviderPage({
    filters,
    cursor: null, // page 1
    pageSize: MARKETPLACE_PAGE_SIZE,
    featuredTenantIds: featuredIds,
    mapItem: (t) => mapTenantToProviderListItem(t, featuredMap),
  });

  return {
    items: page.items as ProviderListItem[],
    nextCursor: page.nextCursor,
    total: page.total ?? 0,
  };
}

// ── Dynamic per-facet metadata ─────────────────────────────────────────────

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{
    vertical?: string;
    industry?: string;
    city?: string;
    search?: string;
    country?: string;
  }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const verticalFilter = params.vertical ?? null;
  const industryFilter = params.industry ?? null;
  const cityFilter = params.city?.trim() ?? null;
  const searchFilter = params.search?.trim() ?? null;

  const verticalName = verticalFilter
    ? VERTICALS.find((v) => v.id === verticalFilter)?.name
    : null;
  const industryName = industryFilter ? getIndustry(industryFilter)?.name : null;
  const facetName = industryName || verticalName;

  let title: string;
  let description: string;
  if (facetName && cityFilter) {
    title = `${facetName} in ${cityFilter} — Fieseros Marketplace`;
    description = `Browse verified ${facetName.toLowerCase()} providers in ${cityFilter}. Read real reviews, compare quotes, and book instantly. Verified identity, business, insurance, and payments.`;
  } else if (facetName) {
    title = `${facetName} — Fieseros Marketplace`;
    description = `Browse verified ${facetName.toLowerCase()} providers on the Fieseros Marketplace. Read real reviews, compare quotes, and book instantly.`;
  } else if (cityFilter) {
    title = `Local Service Providers in ${cityFilter} — Fieseros Marketplace`;
    description = `Find verified local service professionals in ${cityFilter}. HVAC, plumbing, electrical, cleaning, landscaping, and more. Read reviews and book instantly.`;
  } else if (searchFilter) {
    title = `Search: "${searchFilter}" — Fieseros Marketplace`;
    description = `Search results for "${searchFilter}" on the Fieseros Marketplace. Browse verified local service professionals.`;
  } else {
    title = 'Fieseros Marketplace — Find Trusted Local Service Professionals';
    description =
      'Browse verified local service professionals across 25 industries — HVAC, plumbing, electrical, cleaning, landscaping, pest control, roofing, painting, locksmiths, appliance repair, pool & spa, and automotive. Read real reviews, compare quotes, and book instantly or request emergency dispatch.';
  }

  // P0-5 (SEO): Force canonical to the base /marketplace URL regardless of
  // query params. Faceted nav (vertical/industry/city/search filters) creates
  // thousands of low-value URL variants (?category=plumbing&city=...&feature=...).
  // Without a forced canonical, Google indexes each variant as a separate page
  // (index bloat), diluting the ranking signal of the main /marketplace page.
  //
  // Additionally, when ANY filter is active we set robots.index=false so the
  // filtered URL is never indexed (but follow=true so Google can still crawl
  // the provider links on the page to discover their canonical hub URLs).
  const hasFilters = !!(verticalFilter || industryFilter || cityFilter || searchFilter);
  const canonicalUrl = '/marketplace';

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    robots: hasFilters
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
    },
  };
}

export default async function MarketplaceBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{
    vertical?: string;
    industry?: string;
    city?: string;
    search?: string;
    country?: string;
  }>;
}) {
  const params = await searchParams;
  const verticalFilter = params.vertical ?? null;
  const industryFilter = params.industry ?? null;

  // ── Country detection ──────────────────────────────────────────────────
  // Priority: ?country= URL param (manual override) > x-vercel-ip-country
  // header (Vercel GeoIP, auto-set by edge network) > cf-ipcountry (Cloudflare
  // proxy) > null (show all countries — localhost/dev fallback).
  //
  // When the user changes country "through a proxy", the proxy routes their
  // traffic through a server in the target country. Vercel's edge network
  // sees the proxy's IP and sets x-vercel-ip-country to that country's ISO
  // code (e.g. "AU"). We use that to filter the marketplace.
  //
  // No Vercel configuration is needed — the GeoIP headers are automatically
  // injected on ALL Vercel deployments (including Hobby tier). On localhost,
  // no GeoIP headers are present, so we fall back to showing all countries.
  const headerList = await headers();
  const geoCountry =
    params.country?.toUpperCase() ||
    headerList.get('x-vercel-ip-country') ||
    headerList.get('cf-ipcountry') ||
    null;
  // Normalize: strip whitespace, validate it's a 2-letter code
  const detectedCountry = geoCountry
    ? geoCountry.trim().toUpperCase().substring(0, 2)
    : null;

  const filters: ProviderFilterOptions = {
    country: detectedCountry,
    search: params.search?.trim() || null,
    city: params.city?.trim() || null,
    vertical: verticalFilter,
    industry: industryFilter,
  };

  let providers: ProviderListItem[] = [];
  let nextCursor: string | null = null;
  let totalProviders = 0;
  let dbError = false;
  try {
    // A5: use the unstable_cache-wrapped version (30s TTL).
    // On a cache hit, this returns instantly without hitting the DB.
    // The cache key includes the filters so each search gets its
    // own 30s cache entry.
    //
    // PAGINATION: fetchProvidersCached returns only the FIRST PAGE (24 items)
    // + nextCursor (for the client to fetch page 2) + totalProviders (for the
    // sidebar's "Active providers" stat). The client's useMarketplaceProviders
    // hook seeds its React Query cache with this data — NO duplicate fetch
    // of page 1.
    const ssrPage = await fetchProvidersCached(filters);
    providers = ssrPage.items;
    nextCursor = ssrPage.nextCursor;
    totalProviders = ssrPage.total;
  } catch (err) {
    console.error('[marketplace/page] failed to fetch providers:', err);
    dbError = true;
  }

  // No separate carousel — featured providers render in the SAME grid as
  // regular providers, just with an amber "Featured" tag (OLX-style). The
  // MarketplaceBrowser client component sorts featured-first automatically.

  // Build industry groups for the sidebar — from the INDUSTRY_CATALOG (not
  // from the loaded providers). With server-side pagination, only 24 providers
  // are loaded on the first paint — building the sidebar from those would hide
  // most industries. Building from the catalog ensures ALL industries are
  // always visible in the sidebar (with count 0 if none loaded yet). The
  // per-industry counts are computed client-side from the loaded pages.
  const verticalGroups = VERTICALS.map((v) => {
    const industries = INDUSTRY_CATALOG.filter((i) => i.vertical === v.id).map((i) => ({
      id: i.id,
      name: i.name,
      emoji: i.emoji ?? '🔧',
    }));
    return { vertical: v, industries };
  });

  // ── Build JSON-LD ItemList schema for SEO ───────────────────────────────
  // Only the first 24 providers are in the SSR HTML (the rest load via API as
  // the user scrolls). We render all 24 in the JSON-LD so search engines see
  // a substantial sample. `numberOfItems` uses the TOTAL count (not the
  // loaded count) so Google knows the full catalog size.
  //
  // SEO FIX: URLs are now ABSOLUTE (https://fieseros.com/...) — Google's
  // BreadcrumbList/ItemList validators strongly recommend absolute URLs for
  // rich-result eligibility. aggregateRating was REMOVED per Google Maps
  // Platform ToS §3.2.4 (the rating/reviewCount values originated from
  // Google Places API and cannot be surfaced in structured data).
  const appUrl = getAppUrl();
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Fieseros Marketplace Providers',
    numberOfItems: totalProviders,
    itemListElement: providers.slice(0, 30).map((p, i) => {
      const slug = p.slug || p.publicSlug;
      const profilePath = slug
        ? `/${mapIndustryToUrlSlug(p.industry)}/${slugifyCity(p.city)}/${slug}`
        : '/marketplace';
      const absoluteUrl = `${appUrl}${profilePath}`;
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'LocalBusiness',
          name: p.name,
          description: p.description || p.tagline || undefined,
          url: absoluteUrl,
          image: p.coverImage || undefined,
          address: {
            '@type': 'PostalAddress',
            addressLocality: p.city || undefined,
            addressRegion: p.state || undefined,
            addressCountry: p.country || undefined,
          },
          // aggregateRating removed — Google Maps ToS §3.2.4 prohibits
          // surfacing Places API rating/reviewCount in structured data.
          knowsAbout: p.industry || undefined,
        },
      };
    }),
  };

  // ── BreadcrumbList JSON-LD ──────────────────────────────────────────────
  // SEO FIX: JSON-LD now uses ABSOLUTE URLs (https://fieseros.com/...) for
  // Google rich-result eligibility. Visible breadcrumb links (<a href>
  // below) stay relative so they work on any host (localhost / prod / custom
  // domains).
  const breadcrumbItems: Array<{ name: string; url: string }> = [
    { name: 'Home', url: '/marketplace' },
    { name: 'Marketplace', url: '/marketplace' },
  ];
  if (verticalFilter) {
    const vName = VERTICALS.find((v) => v.id === verticalFilter)?.name ?? verticalFilter;
    breadcrumbItems.push({
      name: vName,
      url: `/marketplace?vertical=${verticalFilter}`,
    });
  }
  if (industryFilter) {
    const iName = getIndustry(industryFilter)?.name ?? industryFilter;
    breadcrumbItems.push({
      name: iName,
      url: `/marketplace?industry=${industryFilter}`,
    });
  }
  if (params.city) {
    breadcrumbItems.push({
      name: params.city,
      url: `/marketplace?city=${encodeURIComponent(params.city)}`,
    });
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.name,
      item: `${appUrl}${b.url}`,
    })),
  };

  // Visible breadcrumb labels
  const bcVerticalName = verticalFilter
    ? VERTICALS.find((v) => v.id === verticalFilter)?.name
    : null;
  const bcIndustryName = industryFilter ? getIndustry(industryFilter)?.name : null;

  return (
    <div className="fixed inset-0 h-full w-full flex flex-col overflow-hidden bg-background">
      {/* JSON-LD structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* FIXED TOP HEADER */}
      <div className="shrink-0 z-30 border-b border-border bg-background">
        <MarketplaceHeader
          initialSearch={params.search ?? ''}
          initialCity={params.city ?? ''}
        />

        <h1 className="sr-only">
          Fieseros Marketplace — Find Trusted Local Service Professionals
        </h1>
      </div>

      {/* MAIN BODY AREA — Left sidebar fixed, right provider cards list ONLY scrolls */}
      <div id="all-providers" className="flex-1 min-h-0 w-full overflow-hidden">
        <div className="h-full w-full flex overflow-hidden">
          {/* Sidebar — categories + trust filters + stats card (Fixed left sidebar) */}
          <MarketplaceSidebar
            providers={providers}
            total={totalProviders}
            country={detectedCountry}
            verticals={VERTICALS}
            activeVertical={verticalFilter}
            activeIndustry={industryFilter}
            verticalGroups={verticalGroups}
          />

          {/* Main column — ONLY THIS PROVIDER LIST AREA SCROLLS */}
          <main id="main-content" className="flex-1 h-full overflow-y-auto pb-[calc(3.5rem+env(safe-area-inset-bottom,0px)+0.25rem)] lg:pb-12 scroll-smooth">
            {/* FIXED/STICKY BREADCRUMB & SORT FILTER BAR — INSIDE LISTING AREA */}
            <nav
              aria-label="Breadcrumb"
              className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border pb-2.5 pt-1 mb-4 pl-4 pr-3 sm:pr-3 lg:pr-3 py-4 "
            >
              <div className="flex w-full flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <ol className="flex flex-wrap items-center gap-1 min-w-0">
                  <li className="flex items-center gap-1">
                    <a href="/marketplace" className="inline-flex items-center gap-1 hover:text-foreground">
                      <HomeIcon className="h-3.5 w-3.5" /> Home
                    </a>
                    <ChevronRight className="h-3 w-3" />
                  </li>
                  <li className="flex items-center gap-1">
                    <a href="/marketplace" className="hover:text-foreground">Marketplace</a>
                    {bcVerticalName || bcIndustryName || params.city ? (
                      <ChevronRight className="h-3 w-3" />
                    ) : null}
                  </li>
                  {bcVerticalName ? (
                    <li className="flex items-center gap-1">
                      <a
                        href={`/marketplace?vertical=${verticalFilter}`}
                        className="hover:text-foreground"
                      >
                        {bcVerticalName}
                      </a>
                      {bcIndustryName || params.city ? <ChevronRight className="h-3 w-3" /> : null}
                    </li>
                  ) : null}
                  {bcIndustryName ? (
                    <li className="flex items-center gap-1">
                      <a
                        href={`/marketplace?industry=${industryFilter}`}
                        className="hover:text-foreground"
                      >
                        {bcIndustryName}
                      </a>
                      {params.city ? <ChevronRight className="h-3 w-3" /> : null}
                    </li>
                  ) : null}
                  {params.city ? (
                    <li className="flex items-center gap-1">
                      <span className="font-medium text-foreground">{params.city}</span>
                    </li>
                  ) : null}
                </ol>
                {/* Right-side controls — Filters (mobile only) + Sort (sm+).
                    The Filters button opens MarketplaceMobileFilters' Sheet
                    which reuses the existing MarketplaceSidebar content
                    (categories + trust filters + stats). Sort is hidden on
                    <640px (separate issue). Both are right-aligned in the
                    sticky breadcrumb bar so they stay reachable as the user
                    scrolls. */}
                <div className="flex items-center gap-2 shrink-0">
                  <MarketplaceMobileFilters
                    providers={providers}
                    total={totalProviders}
                    country={detectedCountry}
                    verticals={VERTICALS}
                    activeVertical={verticalFilter}
                    activeIndustry={industryFilter}
                    verticalGroups={verticalGroups}
                  />
                  <MarketplaceSortControl />
                </div>
              </div>
            </nav>

            <noscript>
              <div className="mx-auto mb-8 max-w-2xl">
                <form
                  method="get"
                  action="/marketplace"
                  className="flex flex-col gap-2 rounded-2xl border bg-card p-2 shadow-xl sm:flex-row sm:items-center"
                >
                  {verticalFilter ? (
                    <input type="hidden" name="vertical" value={verticalFilter} />
                  ) : null}
                  {industryFilter ? (
                    <input type="hidden" name="industry" value={industryFilter} />
                  ) : null}
                  {params.city ? (
                    <input type="hidden" name="city" value={params.city} />
                  ) : null}
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      name="search"
                      defaultValue={params.search ?? ''}
                      placeholder="Search providers by name, service, or keyword"
                      aria-label="Search providers"
                      className="h-12 w-full pl-11 pr-3 rounded-lg bg-transparent text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 text-base font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <Search className="h-5 w-5" /> Search
                  </button>
                </form>
                <p className="mt-2 text-xs text-muted-foreground">
                  Or use the city + industry filters to browse manually.
                </p>
              </div>
            </noscript>

            {dbError ? (
              <div
                role="alert"
                className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <p className="font-semibold">Couldn&apos;t reach the database</p>
                <p className="mt-1 text-xs">
                  The marketplace is temporarily unavailable. Please try again in a moment.
                </p>
                {/* P1 issue #37 — retry button. Reloads the page so the SSR
                    DB fetch re-runs (wrapped in unstable_cache, 30s TTL).
                    If the DB blip was transient, the retry succeeds; if
                    still down, the same error renders again (no infinite
                    loop). Uses the client-side ReloadButton component since
                    this page is a server component and can't attach
                    onClick directly. */}
                <div className="mt-4 flex justify-center">
                  <ReloadButton label="Try again" />
                </div>
              </div>
            ) : (
              <MarketplaceBrowser
                providers={providers}
                initialNextCursor={nextCursor}
                initialTotal={totalProviders}
                detectedCountry={detectedCountry}
                initialFilters={{
                  vertical: verticalFilter,
                  industry: industryFilter,
                  city: params.city ?? null,
                  search: params.search ?? null,
                  country: params.country ?? null,
                }}
              />
            )}

            {/* SEO footer copy */}
            <div className="mt-12 rounded-xl border border-border bg-muted/20 p-5 text-sm text-muted-foreground leading-relaxed mr-3 ml-3 sm:mr-3 sm:ml-3 lg:mr-3 lg:ml-3">
              <h2 className="text-base font-semibold text-foreground mb-2">
                About the Fieseros Marketplace
              </h2>
              <p>
                The Fieseros Marketplace connects homeowners and businesses with local service
                professionals across {VERTICALS.length} verticals — from HVAC and plumbing to
                cleaning, landscaping, pest control, roofing, painting, locksmiths, appliance
                repair, pool services, and automotive. Every provider on Fieseros who has opted
                into the marketplace appears here with their verification badges (identity,
                business, insurance, and payments) so you can see at a glance how vetted they are.
                Browse by vertical or city, read real customer reviews, and book instantly — or
                describe your problem and let our AI route you to the right professional.
              </p>
            </div>

            {/* ── CornerstoneFooter — connects the marketplace to the CRM
                product cluster (18 industry pages + 4 comparison + 5 feature
                pages). Previously the marketplace had its own minimal footer
                that only linked to /, /#pricing, /contact-us — leaving the
                marketplace as an SEO island disconnected from the 29 CRM
                landing pages. The CornerstoneFooter provides the full
                internal-linking mesh for PageRank flow. */}
            <CornerstoneFooter />
          </main>
        </div>
      </div>

      {/* Mobile bottom tab bar — Home / Browse / Search / Saved / Bookings */}
      <MarketplaceMobileNav />
    </div>
  );
}

// Minimal Badge helper to avoid importing the client-side ui/badge (which is
// fine to import in server components but keeping this local avoids pulling
// in any client-only side effects). Matches the shadcn Badge API for the
// subset of variants/props we actually use here.
function Badge({
  children,
  className,
  variant: _variant,
}: {
  children: React.ReactNode;
  className?: string;
  // Accept variant for shadcn API compatibility; visually we always render
  // the outline style here (a single, consistent look is enough for the
  // few places this server-side Badge is used).
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
}) {
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ' +
        (className ?? '')
      }
    >
      {children}
    </span>
  );
}
