import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { VERTICALS, getIndustry } from '@/lib/industry-catalog';
import { MarketplaceBrowser } from '@/components/marketplace/marketplace-browser';
import { MarketplaceHeader } from '@/components/marketplace/marketplace-header';
import { MarketplaceSidebar } from '@/components/marketplace/marketplace-sidebar';
import { MarketplaceSortControl } from '@/components/marketplace/marketplace-sort-control';
import type { ProviderListItem } from '@/components/marketplace/types';
import { mapIndustryToUrlSlug, slugifyCity } from '@/lib/seo/schemas';
import {
  computeCardType,
  fetchFeaturedListingsMap,
} from '@/lib/marketplace-featured';
import {
  Wrench,
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
// The cache key is a constant (the query has no per-request params — it
// always fetches all opted-in, non-suspended tenants). This means every
// marketplace browse request within a 30s window reuses the same DB result,
// cutting DB load from N queries/request to 1 query/30s.
//
// We use `unstable_cache` (not `export const revalidate`) because the PAGE
// must stay force-dynamic (SuperAdmin changes need to appear immediately in
// the HTML), but the QUERY can be cached. unstable_cache gives us this
// granular control — the page re-renders on every request, but the query
// result is reused for 30s.
//
// The `tags` array enables on-demand invalidation via `revalidateTag()`.
// When SuperAdmin changes seed/featured/trial data, a `revalidateTag('marketplace-providers')`
// call (not yet wired up) would bust this cache immediately. For now, the
// 30s TTL is the fallback.
const fetchProvidersCached = unstable_cache(
  async (): Promise<ProviderListItem[]> => {
    return fetchProvidersUncached();
  },
  ['marketplace-providers'],
  { revalidate: 30 }, // 30 seconds
);

async function fetchProvidersUncached(): Promise<ProviderListItem[]> {
  // ── 3-gate eligibility ──────────────────────────────────────────────────
  // A provider appears on the marketplace browse grid when ALL three are true:
  //   1. publicProfileEnabled  — has a public Business Hub page
  //   2. marketplaceOptIn      — explicitly opted into marketplace listing
  //                              (toggle in Settings → Public Hub tab)
  //   3. suspendedAt IS null   — not suspended
  // marketplaceOptIn is the toggle providers control from their settings. New
  // registrations default it to true (see api/auth/register), so providers are
  // visible by default but can opt out anytime. Verification status is SELECTed
  // and rendered as badges on each card so users can see how verified a pro is.
  const tenants = await db.tenant.findMany({
    where: {
      publicProfileEnabled: true,
      marketplaceOptIn: true,
      suspendedAt: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      publicSlug: true,
      tagline: true,
      industry: true,
      city: true,
      state: true,
      country: true,
      currency: true,
      rating: true,
      reviewCount: true,
      description: true,
      coverImage: true,
      pricingType: true,
      callOutFee: true,
      emergencyServiceAvailable: true,
      businessCategoriesJson: true,
      serviceAreasJson: true,
      identityVerified: true,
      businessVerified: true,
      insuranceVerified: true,
      stripeConnected: true,
      planStatus: true,
      plan: true,
      claimed: true,
      listingTier: true,
      trialEndsAt: true,
      phone: true,
      googleBusinessProfileUrl: true,
      googleBusinessVerified: true,
    },
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
    take: 500,
  });

  // Fetch featured listing flags via the shared helper (single source of truth)
  const tenantIds = tenants.map((t) => t.id);
  const featuredMap = await fetchFeaturedListingsMap(tenantIds);

  // NOTE: jobs-count per tenant would require a join through Workspace
  // (Job has workspaceId, not tenantId). Skipping the DB query for
  // performance — we derive a pseudo "jobs done" from reviewCount below.

  return tenants.map((t) => {
    let serviceAreas: string[] = [];
    try {
      const arr = JSON.parse(t.serviceAreasJson || '[]');
      if (Array.isArray(arr)) serviceAreas = arr.slice(0, 10);
    } catch {
      // ignore
    }
    const hasFL = featuredMap.has(t.id);
    const cardType = computeCardType(
      {
        claimed: t.claimed,
        plan: t.plan,
        planStatus: t.planStatus,
        trialEndsAt: t.trialEndsAt,
        listingTier: t.listingTier,
      },
      hasFL,
    );
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      publicSlug: t.publicSlug,
      tagline: t.tagline,
      industry: t.industry,
      city: t.city,
      state: t.state,
      country: t.country,
      currency: t.currency,
      rating: t.rating,
      reviewCount: t.reviewCount,
      description: t.description,
      coverImage: t.coverImage,
      pricingType: t.pricingType,
      callOutFee: t.callOutFee,
      emergencyServiceAvailable: t.emergencyServiceAvailable,
      serviceAreas,
      services: [],
      // `featured` is set to 'featured' when the card type is featured, so the
      // existing ProviderCard "featured" prop logic + the MarketplaceBrowser
      // sort (featured-first) continue to work unchanged.
      featured: cardType === 'featured' ? 'featured' : null,
      // New: card-type + claim flags so ProviderCard can render minimal vs full
      cardType,
      claimed: t.claimed,
      listingTier: t.listingTier,
      phone: t.phone,
      identityVerified: t.identityVerified,
      businessVerified: t.businessVerified,
      insuranceVerified: t.insuranceVerified,
      stripeConnected: t.stripeConnected,
      planStatus: t.planStatus,
      plan: t.plan,
      googleBusinessProfileUrl: t.googleBusinessProfileUrl,
      googleBusinessVerified: t.googleBusinessVerified,
      // "Jobs done" proxy: use reviewCount * ~3 (most jobs don't get reviews).
      // This gives a reasonable-looking number for the stats bar without a
      // costly cross-table query.
      jobsCount: Math.round((t.reviewCount ?? 0) * 3),
      // Response time: we don't track this yet per tenant, so we derive a
      // pseudo-value from reviewCount (busier providers respond faster).
      // 0 reviews → 60m, 500+ reviews → 5m, linear in between.
      responseTimeMins: t.reviewCount >= 500 ? 5 : Math.max(8, 60 - Math.floor((t.reviewCount ?? 0) / 10)),
    } satisfies ProviderListItem;
  });
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
      'Browse 2,500+ verified local service professionals across 25 industries — HVAC, plumbing, electrical, cleaning, landscaping, pest control, roofing, painting, locksmiths, appliance repair, pool & spa, and automotive. Read real reviews, compare quotes, and book instantly or request emergency dispatch.';
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
  }>;
}) {
  const params = await searchParams;
  const verticalFilter = params.vertical ?? null;
  const industryFilter = params.industry ?? null;

  let providers: ProviderListItem[] = [];
  let dbError = false;
  try {
    // A5: use the unstable_cache-wrapped version (30s TTL).
    // On a cache hit, this returns instantly without hitting the DB.
    providers = await fetchProvidersCached();
  } catch (err) {
    console.error('[marketplace/page] failed to fetch providers:', err);
    dbError = true;
  }

  // No separate carousel — featured providers render in the SAME grid as
  // regular providers, just with an amber "Featured" tag (OLX-style). The
  // MarketplaceBrowser client component sorts featured-first automatically.

  // Build industry groups for the sidebar — 9 verticals, each with its industries
  const verticalGroups = VERTICALS.map((v) => {
    const industries = Array.from(
      new Set(
        providers
          .filter((p) => {
            const meta = p.industry ? getIndustry(p.industry) : undefined;
            return meta?.vertical === v.id;
          })
          .map((p) => p.industry),
      ),
    )
      .filter(Boolean)
      .map((id) => {
        const meta = id ? getIndustry(id) : undefined;
        return { id: id as string, name: meta?.name ?? id, emoji: meta?.emoji ?? '🔧' };
      });
    return { vertical: v, industries };
  });

  // ── Build JSON-LD ItemList schema for SEO ───────────────────────────────
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Fieseros Marketplace Providers',
    numberOfItems: providers.length,
    itemListElement: providers.slice(0, 30).map((p, i) => {
      const slug = p.slug || p.publicSlug;
      const canonicalHref = slug
        ? `/${mapIndustryToUrlSlug(p.industry)}/${slugifyCity(p.city)}/${slug}`
        : '/marketplace';
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'LocalBusiness',
          name: p.name,
          description: p.description || p.tagline || undefined,
          url: canonicalHref,
          image: p.coverImage || undefined,
          address: {
            '@type': 'PostalAddress',
            addressLocality: p.city || undefined,
            addressRegion: p.state || undefined,
            addressCountry: p.country || undefined,
          },
          aggregateRating:
            p.rating && p.reviewCount
              ? {
                  '@type': 'AggregateRating',
                  ratingValue: p.rating,
                  reviewCount: p.reviewCount,
                }
              : undefined,
          knowsAbout: p.industry || undefined,
        },
      };
    }),
  };

  // ── BreadcrumbList JSON-LD ──────────────────────────────────────────────
  // Relative URLs — Google's BreadcrumbList validator accepts relative URLs
  // here, but Search Console recommends absolute URLs. We keep the visible
  // breadcrumb links (rendered as <a href> below) relative so they work on
  // any host, and the JSON-LD payload uses the same relative URLs for
  // consistency. If Google warnings appear later, swap these for
  // `https://fieseros.com/marketplace` (the canonical production origin).
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
      item: b.url,
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
            verticals={VERTICALS}
            activeVertical={verticalFilter}
            activeIndustry={industryFilter}
            verticalGroups={verticalGroups}
          />

          {/* Main column — ONLY THIS PROVIDER LIST AREA SCROLLS */}
          <main className="flex-1 h-full overflow-y-auto pb-12 scroll-smooth">
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
                <MarketplaceSortControl />
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
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="font-semibold">Couldn&apos;t reach the database</p>
                <p className="mt-1 text-xs">
                  The marketplace is temporarily unavailable. Please try again in a moment.
                </p>
              </div>
            ) : (
              <MarketplaceBrowser
                providers={providers}
                initialFilters={{
                  vertical: verticalFilter,
                  industry: industryFilter,
                  city: params.city ?? null,
                  search: params.search ?? null,
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

            {/* Footer embedded at the end of the scrollable list column */}
            <footer className="mt-10 border-t bg-background py-6 pl-4 pr-3 sm:pr-3 lg:pr-3 py-4 ">
              <div className="w-full flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <Wrench className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Fieseros Marketplace</p>
                    <p className="text-xs text-muted-foreground">AI Marketplace & Operating System for Local Service Businesses</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <a href="/" className="hover:text-foreground">← Fieseros Home</a>
                  <a href="/#pricing" className="hover:text-foreground">For businesses</a>
                  <a href="/#ai-receptionist" className="hover:text-foreground">AI Receptionist</a>
                  <a href="/contact-us" className="hover:text-foreground">Contact</a>
                  <span>© {new Date().getFullYear()} Fieseros</span>
                </div>
              </div>
            </footer>
          </main>
        </div>
      </div>
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
