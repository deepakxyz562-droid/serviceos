import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { VERTICALS, getIndustry } from '@/lib/industry-catalog';
import { MarketplaceBrowser } from '@/components/marketplace/marketplace-browser';
import type { ProviderListItem } from '@/components/marketplace/types';
import { mapIndustryToUrlSlug, slugifyCity } from '@/lib/seo/schemas';
import {
  Sparkles,
  Wrench,
  Search,
  ShieldCheck,
  Building2,
  Home as HomeIcon,
  ChevronRight,
  Wallet,
  Star,
  Zap,
} from 'lucide-react';

export const revalidate = 300; // ISR — revalidate every 5 minutes

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

async function fetchProviders() {
  // ── 2-gate eligibility (marketplaceOptIn dropped) ───────────────────────
  // Any tenant with a public Business Hub page (publicProfileEnabled=true)
  // who is not suspended is visible on the marketplace browse grid. This
  // fixes the issue where previously-registered providers with a public page
  // were invisible because the separate `marketplaceOptIn` flag was never set
  // (it defaulted to false and only onboarding step 2 set it to true).
  // Verification status is SELECTed and rendered as badges on each card so
  // users can see at a glance how verified a provider is.
  const tenants = await db.tenant.findMany({
    where: {
      publicProfileEnabled: true,
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
    },
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
    take: 120,
  });

  // Fetch featured listing flags
  const tenantIds = tenants.map((t) => t.id);
  const featuredListings = tenantIds.length
    ? await db.featuredListing.findMany({
        where: {
          tenantId: { in: tenantIds },
          isActive: true,
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
        select: { tenantId: true, type: true },
      })
    : [];
  const featuredMap = new Map<string, string>();
  for (const fl of featuredListings) {
    if (!featuredMap.has(fl.tenantId!)) featuredMap.set(fl.tenantId!, fl.type);
  }

  return tenants.map((t) => {
    let serviceAreas: string[] = [];
    try {
      const arr = JSON.parse(t.serviceAreasJson || '[]');
      if (Array.isArray(arr)) serviceAreas = arr.slice(0, 10);
    } catch {
      // ignore
    }
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
      featured: featuredMap.get(t.id) ?? null,
      identityVerified: t.identityVerified,
      businessVerified: t.businessVerified,
      insuranceVerified: t.insuranceVerified,
      stripeConnected: t.stripeConnected,
      planStatus: t.planStatus,
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
    title = `${facetName} in ${cityFilter} — ServiceOS Marketplace`;
    description = `Browse verified ${facetName.toLowerCase()} providers in ${cityFilter}. Read real reviews, compare quotes, and book instantly. Verified identity, business, insurance, and payments.`;
  } else if (facetName) {
    title = `${facetName} — ServiceOS Marketplace`;
    description = `Browse verified ${facetName.toLowerCase()} providers on the ServiceOS Marketplace. Read real reviews, compare quotes, and book instantly.`;
  } else if (cityFilter) {
    title = `Local Service Providers in ${cityFilter} — ServiceOS Marketplace`;
    description = `Find verified local service professionals in ${cityFilter}. HVAC, plumbing, electrical, cleaning, landscaping, and more. Read reviews and book instantly.`;
  } else if (searchFilter) {
    title = `Search: "${searchFilter}" — ServiceOS Marketplace`;
    description = `Search results for "${searchFilter}" on the ServiceOS Marketplace. Browse verified local service professionals.`;
  } else {
    title = 'ServiceOS Marketplace — Find Trusted Local Service Professionals';
    description =
      'Browse 2,500+ verified local service professionals across 25 industries — HVAC, plumbing, electrical, cleaning, landscaping, pest control, roofing, painting, locksmiths, appliance repair, pool & spa, and automotive. Read real reviews, compare quotes, and book instantly or request emergency dispatch.';
  }

  const url = `https://serviceos.com/marketplace${
    verticalFilter || industryFilter || cityFilter || searchFilter
      ? '?' +
        [
          verticalFilter ? `vertical=${verticalFilter}` : '',
          industryFilter ? `industry=${industryFilter}` : '',
          cityFilter ? `city=${encodeURIComponent(cityFilter)}` : '',
          searchFilter ? `search=${encodeURIComponent(searchFilter)}` : '',
        ]
          .filter(Boolean)
          .join('&')
      : ''
  }`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
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
    providers = await fetchProviders();
  } catch (err) {
    console.error('[marketplace/page] failed to fetch providers:', err);
    dbError = true;
  }

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

  // Compute all distinct cities for the city filter
  const cities = Array.from(
    new Set(providers.map((p) => p.city).filter(Boolean) as string[]),
  ).sort();

  // ── Build JSON-LD ItemList schema for SEO ───────────────────────────────
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'ServiceOS Marketplace Providers',
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
          url: `https://serviceos.com${canonicalHref}`,
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
  const breadcrumbItems: Array<{ name: string; url: string }> = [
    { name: 'Home', url: 'https://serviceos.com' },
    { name: 'Marketplace', url: 'https://serviceos.com/marketplace' },
  ];
  if (verticalFilter) {
    const vName = VERTICALS.find((v) => v.id === verticalFilter)?.name ?? verticalFilter;
    breadcrumbItems.push({
      name: vName,
      url: `https://serviceos.com/marketplace?vertical=${verticalFilter}`,
    });
  }
  if (industryFilter) {
    const iName = getIndustry(industryFilter)?.name ?? industryFilter;
    breadcrumbItems.push({
      name: iName,
      url: `https://serviceos.com/marketplace?industry=${industryFilter}`,
    });
  }
  if (params.city) {
    breadcrumbItems.push({
      name: params.city,
      url: `https://serviceos.com/marketplace?city=${encodeURIComponent(params.city)}`,
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
    <div className="min-h-screen flex flex-col bg-background">
      {/* JSON-LD structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2" aria-label="Back to ServiceOS">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Wrench className="h-4 w-4" />
            </span>
            <span className="text-lg font-bold text-foreground">ServiceOS</span>
          </a>
          <nav className="flex items-center gap-3">
            <a
              href="/"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              ← Back to ServiceOS
            </a>
            <a
              href="/#pricing"
              className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
            >
              For businesses
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-cyan-950/20" />
        <div className="absolute -left-32 -top-32 -z-10 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-700/20" />
        <div className="absolute -right-32 top-20 -z-10 h-96 w-96 rounded-full bg-amber-300/15 blur-3xl dark:bg-amber-700/10" />

        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 text-center">
          <div className="mb-4 flex justify-center">
            <Badge className="gap-1.5 border-emerald-200 bg-white/70 px-3 py-1 text-emerald-700 backdrop-blur hover:bg-white/70 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              The AI Marketplace for Local Services
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Find trusted{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400">
              local service professionals
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {providers.length}+ providers across {VERTICALS.length} verticals. Read real reviews,
            compare quotes, and book instantly — or describe your problem and let our AI route you to
            the right pro.
          </p>
        </div>
      </section>

      {/* Trust bar — thin row of trust signals (TaskRabbit/Urban Company style) */}
      <section className="border-b bg-white/60 dark:bg-card/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-3 text-sm sm:px-6">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-foreground">Verified professionals</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Wallet className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-foreground">Escrow-protected payments</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-medium text-foreground">Real customer reviews</span>
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Zap className="h-4 w-4 text-rose-500" />
            <span className="font-medium text-foreground">24/7 emergency dispatch</span>
          </span>
        </div>
      </section>

      {/* Category tiles — visual entry point (Urban Company / TaskRabbit style) */}
      {!verticalFilter && !industryFilter ? (
        <section className="border-b bg-muted/10">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Browse by category
              </h2>
              <a
                href="#all-providers"
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
              >
                View all providers →
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9">
              {VERTICALS.map((v) => {
                const count = providers.filter((p) => {
                  const meta = p.industry ? getIndustry(p.industry) : undefined;
                  return meta?.vertical === v.id;
                }).length;
                return (
                  <a
                    key={v.id}
                    href={`/marketplace?vertical=${v.id}`}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-all hover:border-emerald-300 hover:shadow-md"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl transition-transform group-hover:scale-110 dark:bg-emerald-950/40" aria-hidden>
                      {v.icon}
                    </span>
                    <span className="line-clamp-2 text-xs font-medium text-foreground leading-tight">
                      {v.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {count} pro{count === 1 ? '' : 's'}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Breadcrumbs (visible) */}
      <nav
        aria-label="Breadcrumb"
        className="border-b bg-muted/20"
      >
        <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-1 px-4 py-2.5 text-xs text-muted-foreground sm:px-6">
          <li className="flex items-center gap-1">
            <a href="/" className="inline-flex items-center gap-1 hover:text-foreground">
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
      </nav>

      {/* Main grid: sidebar + provider cards */}
      <div id="all-providers" className="mx-auto max-w-7xl w-full px-4 sm:px-6 py-8 flex-1 scroll-mt-20">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
          {/* Sidebar — industry filter by vertical (server-rendered links for crawlability) */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Browse by Vertical
                </h2>
                <ul className="space-y-1">
                  <li>
                    <a
                      href="/marketplace"
                      className={
                        'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ' +
                        (!verticalFilter && !industryFilter
                          ? 'bg-emerald-50 text-emerald-700 font-medium dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground')
                      }
                    >
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" /> All providers
                      </span>
                      <span className="text-xs">{providers.length}</span>
                    </a>
                  </li>
                  {verticalGroups.map(({ vertical, industries }) => {
                    const count = providers.filter((p) => {
                      const meta = p.industry ? getIndustry(p.industry) : undefined;
                      return meta?.vertical === vertical.id;
                    }).length;
                    const active = verticalFilter === vertical.id;
                    return (
                      <li key={vertical.id}>
                        <a
                          href={`/marketplace?vertical=${vertical.id}`}
                          className={
                            'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ' +
                            (active
                              ? 'bg-emerald-50 text-emerald-700 font-medium dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground')
                          }
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span aria-hidden className="text-base">{vertical.icon}</span>
                            <span className="truncate">{vertical.name}</span>
                          </span>
                          <span className="text-xs shrink-0">{count}</span>
                        </a>
                        {active && industries.length > 0 ? (
                          <ul className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-3">
                            {industries.map((ind) => (
                              <li key={ind.id}>
                                <a
                                  href={`/marketplace?industry=${ind.id}`}
                                  className={
                                    'block rounded-md px-2 py-1 text-xs transition-colors ' +
                                    (industryFilter === ind.id
                                      ? 'bg-emerald-50 text-emerald-700 font-medium dark:bg-emerald-950/50 dark:text-emerald-300'
                                      : 'text-muted-foreground hover:bg-muted hover:text-foreground')
                                  }
                                >
                                  {ind.emoji} {ind.name}
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Trust badges on every card</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                      Identity, business, insurance, and payments — each gate shows as a badge. Fully-verified providers get a gold &quot;Verified&quot; mark.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main column — client-side interactive browser */}
          <div>
            {/* <noscript> fallback — plain HTML GET form so non-JS users can still search.
                The MarketplaceBrowser client component replaces this on hydration. */}
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
                cities={cities}
              />
            )}

            {/* SEO footer copy */}
            <div className="mt-12 rounded-xl border border-border bg-muted/20 p-5 text-sm text-muted-foreground leading-relaxed">
              <h2 className="text-base font-semibold text-foreground mb-2">
                About the ServiceOS Marketplace
              </h2>
              <p>
                The ServiceOS Marketplace connects homeowners and businesses with local service
                professionals across {VERTICALS.length} verticals — from HVAC and plumbing to
                cleaning, landscaping, pest control, roofing, painting, locksmiths, appliance
                repair, pool services, and automotive. Every provider on ServiceOS who has opted
                into the marketplace appears here with their verification badges (identity,
                business, insurance, and payments) so you can see at a glance how vetted they are.
                Browse by vertical or city, read real customer reviews, and book instantly — or
                describe your problem and let our AI route you to the right professional.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-background py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Wrench className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">ServiceOS Marketplace</p>
              <p className="text-xs text-muted-foreground">AI Marketplace & Operating System for Local Service Businesses</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <a href="/" className="hover:text-foreground">← ServiceOS Home</a>
            <a href="/#pricing" className="hover:text-foreground">For businesses</a>
            <a href="/#ai-receptionist" className="hover:text-foreground">AI Receptionist</a>
            <a href="/contact-us" className="hover:text-foreground">Contact</a>
            <span>© {new Date().getFullYear()} ServiceOS</span>
          </div>
        </div>
      </footer>
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
}: {
  children: React.ReactNode;
  className?: string;
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
