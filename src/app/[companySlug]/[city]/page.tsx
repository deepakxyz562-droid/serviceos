import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Wrench,
  Search,
  Home as HomeIcon,
  ChevronRight,
  Store,
  Compass,
  TrendingUp,
  CalendarClock,
  FileText,
  Users,
  Navigation,
  MapPin,
} from 'lucide-react';

import { db } from '@/lib/db';
import { getAppUrl } from '@/lib/brand';
import { VERTICALS, getIndustry } from '@/lib/industry-catalog';
import {
  mapIndustryToPluralSlug,
  pluralSlugToIndustry,
} from '@/lib/seo/plural-industry-slugs';
import {
  slugifyCity,
  getItemListSchema,
  getBreadcrumbSchema,
} from '@/lib/seo/schemas';
import {
  getIndustrySoftwareUrl,
  getIndustrySoftwareLabel,
  getIndustryDisplayName,
} from '@/lib/seo/industry-software-pages';
import {
  computeCardType,
  fetchFeaturedListingsMap,
} from '@/lib/marketplace-featured';
import { computeCityPageTierFromProviders } from '@/lib/marketplace/city-page-tier';
import {
  fetchNearbyCitiesWithProviders,
  fetchServiceAreaProviders,
  type NearbyCityEntry,
  type ServiceAreaProvider,
} from '@/lib/marketplace/city-page-fallbacks';
import { MarketplaceBrowser } from '@/components/marketplace/marketplace-browser';
import { MarketplaceHeader } from '@/components/marketplace/marketplace-header';
import { MarketplaceMobileNav } from '@/components/marketplace/marketplace-mobile-nav';
import { ProviderCard } from '@/components/marketplace/provider-card';
import { CornerstoneFooter } from '@/components/seo/cornerstone-footer';
import type { ProviderListItem } from '@/components/marketplace/types';

// ── Route config ────────────────────────────────────────────────────────────
// The page itself stays force-dynamic so newly-onboarded providers appear on
// the next request (matches the existing /marketplace browse page policy).
// The expensive provider-query is NOT wrapped in unstable_cache here because
// the (industry, city) pair makes the cache key 2-dimensional (50 cities ×
// 30 industries = 1500 keys) — a 30s TTL per key would add cache-management
// overhead without meaningful hit-rate on a low-traffic route. We rely on
// Prisma's connection pool + the existing @@index([city]) +
// @@index([latitude, longitude]) on Tenant for query speed.
export const dynamic = 'force-dynamic';

// ── Plural display-name map ─────────────────────────────────────────────────
// The Industry catalog stores the SINGULAR display name (e.g. 'Plumbing',
// 'HVAC', 'Pest Control'). For SEO H1/title we want the PLURAL form
// ('Plumbers in London', 'HVAC in Manchester'). This map covers the
// industries in INDUSTRY_TO_PLURAL_SLUG; industries not in the map fall back
// to the capitalized plural slug.
const INDUSTRY_PLURAL_DISPLAY: Record<string, string> = {
  plumbing: 'Plumbers',
  electrical: 'Electricians',
  cleaning: 'Cleaners',
  hvac: 'HVAC',
  landscaping: 'Landscapers',
  roofing: 'Roofers',
  painting: 'Painters',
  'pest-control': 'Pest Control',
  movers: 'Movers',
  'auto-repair': 'Auto Repair',
  salon: 'Salons',
  'pet-care': 'Pet Care',
  catering: 'Caterers',
  photography: 'Photographers',
  tutoring: 'Tutors',
  handyman: 'Handymen',
  'general-contractor': 'Contractors',
  construction: 'Contractors',
  locksmith: 'Locksmiths',
};

/**
 * Get the human-readable plural display name for an industry ID
 * (e.g. 'plumbing' → 'Plumbers'). Falls back to the industry's catalog name
 * (for industries not in INDUSTRY_PLURAL_DISPLAY) or the capitalized plural
 * slug.
 */
function getIndustryPluralDisplayName(industryId: string): string {
  if (INDUSTRY_PLURAL_DISPLAY[industryId]) return INDUSTRY_PLURAL_DISPLAY[industryId];
  const meta = getIndustry(industryId);
  if (meta) return meta.name;
  const plural = mapIndustryToPluralSlug(industryId);
  return plural.charAt(0).toUpperCase() + plural.slice(1).replace(/-/g, ' ');
}

/**
 * De-slugify a city slug into a human-readable name (best-effort).
 * 'london' → 'London', 'manchester' → 'Manchester',
 * 'rio-de-janeiro' → 'Rio De Janeiro'.
 */
function deslugifyCity(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── generateStaticParams ────────────────────────────────────────────────────
// Pre-render the top 50 cities × 10 most popular industries at build time =
// up to 500 static pages. Wrapped in try/catch so a DB failure during build
// doesn't crash the build (the route still works at runtime via
// force-dynamic, just without ISR pre-rendering).
export async function generateStaticParams() {
  try {
    const cities = await db.directoryLocation.findMany({
      where: { isActive: true },
      orderBy: { population: 'desc' },
      take: 50,
      select: { citySlug: true },
    });
    const industries = [
      'plumbing',
      'electrical',
      'cleaning',
      'hvac',
      'landscaping',
      'roofing',
      'painting',
      'pest-control',
      'auto-repair',
      'handyman',
    ];
    const params: Array<{ companySlug: string; city: string }> = [];
    for (const city of cities) {
      for (const industry of industries) {
        const plural = mapIndustryToPluralSlug(industry);
        params.push({ companySlug: plural, city: city.citySlug });
      }
    }
    return params;
  } catch (err) {
    console.error('[plural-browse] generateStaticParams failed:', err);
    return [];
  }
}

// ── generateMetadata ────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ companySlug: string; city: string }>;
}): Promise<Metadata> {
  const { companySlug, city } = await params;

  // Validate the plural industry slug. If unknown, return empty metadata —
  // the page body will call notFound().
  const industryId = pluralSlugToIndustry(companySlug);
  if (!industryId) return {};

  // Resolve the human-readable city name (best-effort — DB lookup is in the
  // page body; here we de-slugify for the title).
  const cityName = deslugifyCity(city);
  const industryPluralName = getIndustryPluralDisplayName(industryId);

  const title = `${industryPluralName} in ${cityName} — Fieseros Marketplace`;
  const description = `Find verified ${industryPluralName.toLowerCase()} in ${cityName}. Compare ratings, reviews, and book instantly. Local ${industryPluralName.toLowerCase()} ready to help — identity-, business-, and insurance-verified.`;
  const appUrl = getAppUrl();
  const canonicalPath = `/${companySlug}/${city}`;
  const canonicalUrl = `${appUrl}${canonicalPath}`;

  // ── SEO gate: count providers for this industry + city ──────────────────
  // Tier-aware indexing (Phase 3b): a page is indexable only if it has enough
  // providers to be useful to searchers. The city-page-tier model has 4 tiers
  // (EMPTY / SPARSE / READY / STRONG); only READY+STRONG should be indexed.
  //
  // This metadata path uses a cheap `db.tenant.count()` (not the full findMany
  // the page body runs) so we approximate the tier using only the count:
  //   - 0 providers        → EMPTY  → noindex, follow
  //   - 1–4 providers      → SPARSE → noindex, follow (too thin to index)
  //   - 5+ providers       → READY or STRONG → index (the page body computes
  //                          the exact tier for rendering, but for the robots
  //                          meta the count threshold is sufficient)
  //
  // `follow: true` is always preserved so link equity still flows to
  // nearby-city links + "list your business" CTAs rendered on EMPTY/SPARSE
  // pages — discoverable, not indexed (the consultant's recommendation).
  //
  // This MUST mirror the Page body's WHERE clause (industry OR + city OR)
  // so the count reflects exactly what would render. Wrapped in try/catch —
  // default to 0 on error so a DB failure fails safe to noindex rather than
  // risk indexing a page that renders empty.
  let providerCount = 0;
  try {
    providerCount = await db.tenant.count({
      where: {
        publicProfileEnabled: true,
        marketplaceOptIn: true,
        suspendedAt: null,
        AND: [
          {
            OR: [
              { industry: { equals: industryId } },
              { businessCategoriesJson: { contains: `"${industryId}"` } },
            ],
          },
          {
            OR: [
              { city: { contains: cityName } },
              { city: { contains: city } },
              { state: { contains: cityName } },
              { state: { contains: city } },
              { serviceAreasJson: { contains: cityName } },
              { serviceAreasJson: { contains: city } },
            ],
          },
        ],
      },
    });
  } catch (err) {
    console.error('[plural-browse] generateMetadata tenant.count failed:', err);
    providerCount = 0;
  }

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: providerCount >= 5
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Fieseros',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function PluralBrowsePage({
  params,
}: {
  params: Promise<{ companySlug: string; city: string }>;
}) {
  const { companySlug, city } = await params;

  // ── 1. Validate the plural industry slug. 404 if unknown. ──────────────
  // The folder is named [companySlug] (a legacy name from the 3-segment
  // profile route), but on THIS 2-segment route the segment is always a
  // plural industry slug like 'plumbers' or 'electricians'. Unknown slugs
  // (e.g. '/random-word/london') 404 here so we don't render an empty
  // marketplace page for every 2-segment URL on the site.
  const industryId = pluralSlugToIndustry(companySlug);
  if (!industryId) {
    notFound();
  }

  const industryPluralName = getIndustryPluralDisplayName(industryId);
  const industryMeta = getIndustry(industryId);
  const parentVerticalId = industryMeta?.vertical ?? null;
  const parentVerticalName = parentVerticalId
    ? VERTICALS.find((v) => v.id === parentVerticalId)?.name ?? null
    : null;

  // ── 2. Resolve the city name from DirectoryLocation ────────────────────
  // Try the directory table first (gives us the proper-cased city name,
  // e.g. 'London' not 'london'). If the slug isn't in the directory (e.g. a
  // small town we haven't seeded), fall back to de-slugifying the param.
  // We DO NOT 404 on unknown cities — the page stays SEO-indexable so
  // long-tail city searches can still land here.
  //
  // `isKnownCity` tracks whether we found a DirectoryLocation row — this
  // feeds the tier classifier (unknown cities with 0 providers get a
  // slightly different EMPTY reason string, but no behavior change).
  let cityName = deslugifyCity(city);
  let cityLat: number | null = null;
  let cityLng: number | null = null;
  let isKnownCity = false;
  try {
    const dirLoc = await db.directoryLocation.findFirst({
      where: { citySlug: city, isActive: true },
      select: { city: true, latitude: true, longitude: true },
    });
    if (dirLoc) {
      isKnownCity = true;
      cityName = dirLoc.city;
      cityLat = dirLoc.latitude ?? null;
      cityLng = dirLoc.longitude ?? null;
    }
  } catch (err) {
    console.error('[plural-browse] DirectoryLocation lookup failed:', err);
  }

  // ── 3. Fetch providers matching industry + city ────────────────────────
  // Industry filter: match either Tenant.industry (case-insensitive equals)
  // OR a substring match on businessCategoriesJson (which is a JSON array
  // of industry IDs stored as a string, e.g. '["plumbing","electrical"]').
  // The substring match is a best-effort filter for SQLite — it doesn't
  // distinguish "plumbing" from "plumbing-supplies" but in practice the
  // catalog IDs are unique enough that false positives are rare.
  //
  // City filter: case-insensitive substring on city OR state OR a substring
  // match on serviceAreasJson (a JSON array of area names).
  let tenants: Array<{
    id: string;
    name: string;
    slug: string;
    publicSlug: string | null;
    tagline: string | null;
    industry: string | null;
    city: string | null;
    state: string | null;
    country: string;
    currency: string;
    rating: number;
    reviewCount: number;
    description: string | null;
    coverImage: string | null;
    pricingType: string | null;
    callOutFee: number;
    emergencyServiceAvailable: boolean;
    businessCategoriesJson: string;
    serviceAreasJson: string;
    identityVerified: boolean;
    businessVerified: boolean;
    insuranceVerified: boolean;
    stripeConnected: boolean;
    planStatus: string | null;
    plan: string | null;
    claimed: boolean;
    listingTier: string | null;
    trialEndsAt: Date | null;
    phone: string | null;
    googleBusinessProfileUrl: string | null;
    googleBusinessVerified: boolean;
    latitude: number | null;
    longitude: number | null;
    serviceRadiusKm: number;
  }> = [];
  try {
    // NOTE on `mode`: this codebase supports BOTH SQLite (local dev / sandbox)
    // and PostgreSQL (Supabase prod). SQLite does NOT support
    // `mode: 'insensitive'` (it's a no-op there because SQLite's LIKE is
    // already case-insensitive for ASCII), but Prisma throws a validation
    // error if you pass it on SQLite. So we omit it here. PostgreSQL users
    // get case-insensitive matching from the default `contains` anyway when
    // the column type is `text` + the collation is case-insensitive (which
    // is the default on Supabase).
    tenants = await db.tenant.findMany({
      where: {
        publicProfileEnabled: true,
        marketplaceOptIn: true,
        suspendedAt: null,
        // Industry filter (OR-group): primary industry OR businessCategoriesJson contains
        OR: [
          { industry: { equals: industryId } },
          { businessCategoriesJson: { contains: `"${industryId}"` } },
        ],
        // City filter (OR-group): city / state / serviceAreasJson contains the city name.
        // We test against BOTH the human-readable cityName (e.g. 'London') AND the slug
        // (e.g. 'london') so we match tenants whose address was set via the address
        // autocomplete (uses real city name) OR via the directory seeding (uses slug).
        OR: [
          { city: { contains: cityName } },
          { city: { contains: city } },
          { state: { contains: cityName } },
          { state: { contains: city } },
          { serviceAreasJson: { contains: cityName } },
          { serviceAreasJson: { contains: city } },
        ],
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: 100,
    });
  } catch (err) {
    console.error('[plural-browse] tenant.findMany failed:', err);
  }

  // ── 4. Fetch featured-listing map (single source of truth) ─────────────
  const tenantIds = tenants.map((t) => t.id);
  let featuredMap: Map<string, { tenantId: string; type: string; priority: number; isActive: boolean; endDate: Date | string | null }> = new Map();
  try {
    featuredMap = await fetchFeaturedListingsMap(tenantIds);
  } catch (err) {
    console.error('[plural-browse] fetchFeaturedListingsMap failed:', err);
  }

  // ── 5. Build ProviderListItem[] for MarketplaceBrowser ─────────────────
  const providers: ProviderListItem[] = tenants.map((t) => {
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
      featured: cardType === 'featured' ? 'featured' : null,
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
      jobsCount: Math.round((t.reviewCount ?? 0) * 3),
      responseTimeMins:
        t.reviewCount >= 500 ? 5 : Math.max(8, 60 - Math.floor((t.reviewCount ?? 0) / 10)),
      latitude: t.latitude,
      longitude: t.longitude,
      serviceRadiusKm: t.serviceRadiusKm,
    } satisfies ProviderListItem;
  });

  // ── 5b. Compute the city-page tier (EMPTY / SPARSE / READY / STRONG) ────
  // The page body uses the FULL tier (with quality-provider + phone signals)
  // to decide whether to render the fallback sections (service-area providers
  // + nearby cities). The metadata path uses a simpler count-based check
  // (see generateMetadata above); here we compute the precise tier.
  const tierResult = computeCityPageTierFromProviders(providers, isKnownCity);

  // ── 5c. Fallbacks: nearby cities + service-area providers ──────────────
  // Only fetch when the page is EMPTY or SPARSE — READY/STRONG pages render
  // the full MarketplaceBrowser grid and don't need the supplementary
  // fallback content (which would just add noise to a page that's already
  // rich enough to index).
  //
  // Both helpers run in parallel via Promise.all to keep latency down. Each
  // helper independently fails-safe (returns [] on DB error), so a failure
  // in one doesn't block the other.
  let nearbyCities: NearbyCityEntry[] = [];
  let serviceAreaProviders: ServiceAreaProvider[] = [];
  if (tierResult.tier === 'EMPTY' || tierResult.tier === 'SPARSE') {
    // Exclude the origin city + any city already represented in the
    // providers list (so service-area providers don't duplicate what's
    // already shown above).
    const excludeCityNames = [
      cityName,
      ...providers.map((p) => p.city).filter(Boolean) as string[],
    ];
    try {
      [nearbyCities, serviceAreaProviders] = await Promise.all([
        fetchNearbyCitiesWithProviders(industryId, city, { usePluralPath: true }),
        fetchServiceAreaProviders(industryId, city, excludeCityNames),
      ]);
    } catch (err) {
      console.error('[plural-browse] fallback fetch failed:', err);
    }
  }

  // ── 6. Build JSON-LD: ItemList + BreadcrumbList ────────────────────────
  const appUrl = getAppUrl();
  const canonicalPath = `/${companySlug}/${city}`;
  const canonicalUrl = `${appUrl}${canonicalPath}`;

  const itemListLd = getItemListSchema({
    name: `${industryPluralName} in ${cityName}`,
    description: `Top ${industryPluralName.toLowerCase()} in ${cityName}. Compare ratings, reviews, and book instantly on Fieseros.`,
    url: canonicalUrl,
    items: providers.slice(0, 30).map((p, i) => {
      const slug = p.slug || p.publicSlug;
      const profileUrl = slug
        ? `${appUrl}/${mapIndustryToPluralSlug(p.industry)}/${slugifyCity(p.city)}/${slug}`
        : canonicalUrl;
      return {
        position: i + 1,
        name: p.name,
        url: profileUrl,
        description: p.description || p.tagline || undefined,
      };
    }),
  });

  const breadcrumbLd = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Marketplace', url: '/marketplace' },
    { name: industryPluralName, url: `/${companySlug}` },
    { name: cityName, url: canonicalPath },
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <MarketplaceHeader />

      <main id="main-content" className="flex-1">
        {/* Breadcrumb bar */}
        <nav
          aria-label="Breadcrumb"
          className="border-b bg-muted/20"
        >
          <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <li className="flex items-center gap-1">
                <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground">
                  <HomeIcon className="h-3.5 w-3.5" /> Home
                </Link>
                <ChevronRight className="h-3 w-3" />
              </li>
              <li className="flex items-center gap-1">
                <Link href="/marketplace" className="hover:text-foreground">
                  Marketplace
                </Link>
                <ChevronRight className="h-3 w-3" />
              </li>
              <li className="flex items-center gap-1">
                {parentVerticalName ? (
                  <Link
                    href={`/marketplace?vertical=${parentVerticalId}`}
                    className="hover:text-foreground"
                  >
                    {parentVerticalName}
                  </Link>
                ) : (
                  <Link href="/marketplace" className="hover:text-foreground">
                    {industryPluralName}
                  </Link>
                )}
                <ChevronRight className="h-3 w-3" />
              </li>
              <li className="flex items-center gap-1">
                <Link href={`/${companySlug}`} className="hover:text-foreground">
                  {industryPluralName}
                </Link>
                <ChevronRight className="h-3 w-3" />
              </li>
              <li className="flex items-center gap-1">
                <span className="font-medium text-foreground">{cityName}</span>
              </li>
            </ol>
          </div>
        </nav>

        {/* Page header — H1 + provider count + geo context */}
        <section className="border-b bg-gradient-to-b from-emerald-50/40 to-background dark:from-emerald-950/20">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wide mb-2">
              <Wrench className="h-4 w-4" />
              <span>Fieseros Marketplace</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
              {industryPluralName} in {cityName}
            </h1>
            <p className="mt-3 text-base text-muted-foreground max-w-2xl leading-relaxed">
              {providers.length > 0
                ? `Compare ${providers.length} verified ${industryPluralName.toLowerCase()} in ${cityName}. Read real customer reviews, see verification badges, and book instantly — or request a quote.`
                : `Looking for ${industryPluralName.toLowerCase()} in ${cityName}? Be the first to list your business here and start receiving booking requests from local customers.`}
            </p>

            {/* Provider-count chip + "list your business" CTA */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <Store className="h-3.5 w-3.5" />
                {providers.length} provider{providers.length !== 1 ? 's' : ''} available
              </span>
              <Link
                href="/#pricing"
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <Store className="h-4 w-4" />
                List your business
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
              >
                <Compass className="h-4 w-4" />
                Browse all providers
              </Link>
            </div>
          </div>
        </section>

        {/* ── Provider grid (depends on tier) ─────────────────────────────
            EMPTY  → skip the grid; render the CTA + fallback sections below.
            SPARSE → render the grid AS USUAL (1-4 providers), then render the
                     supplementary CTA + fallback sections below.
            READY/STRONG → render the grid only (rich enough to stand alone). */}
        {tierResult.tier === 'EMPTY' ? (
          /* ── Section A (EMPTY) — honest messaging + CTA ─────────────── */
          <section className="w-full px-4 sm:px-6 lg:px-8 py-12">
            <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
                <Search className="h-7 w-7 text-emerald-700 dark:text-emerald-300" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                No {industryPluralName.toLowerCase()} found in {cityName} yet
              </h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                We don&apos;t currently have verified {industryPluralName.toLowerCase()} listed in {cityName}.
                {serviceAreaProviders.length > 0 || nearbyCities.length > 0
                  ? ' Browse nearby options below, or list your business to be the first.'
                  : ' Try browsing all ' + industryPluralName.toLowerCase() + ' on the Fieseros marketplace, or list your own business to be the first.'}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={`/marketplace?industry=${encodeURIComponent(industryId)}`}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <Search className="h-4 w-4" />
                  Browse all {industryPluralName.toLowerCase()}
                </Link>
                <Link
                  href="/#pricing"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
                >
                  <Store className="h-4 w-4" />
                  List your business
                </Link>
              </div>
            </div>
          </section>
        ) : (
          /* ── Provider grid (SPARSE / READY / STRONG) ─────────────────── */
          <section className="w-full px-4 sm:px-6 lg:px-8 py-6">
            <MarketplaceBrowser
              providers={providers}
              initialFilters={{
                vertical: parentVerticalId,
                industry: industryId,
                city: cityName,
                search: null,
              }}
            />
          </section>
        )}

        {/* ── Section A (SPARSE) — supplementary CTA below the grid ──────
            Only rendered for SPARSE pages (1-4 providers). The grid above
            already shows the providers; this section adds the "browse nearby"
            hint + list-your-business CTA so visitors aren't stuck on a
            thin page. */}
        {tierResult.tier === 'SPARSE' && (
          <section className="w-full px-4 sm:px-6 lg:px-8 py-8 border-t bg-muted/10">
            <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 dark:border-amber-900/70 bg-amber-50/60 dark:bg-amber-950/20 p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60">
                  <Compass className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-foreground mb-1">
                    We have {providers.length} {industryPluralName.toLowerCase()} in {cityName}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    See them above, or browse nearby areas with more options. Know a great {industryPluralName.toLowerCase().replace(/s$/, '')} in {cityName}? Ask them to list on Fieseros.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/#pricing"
                      className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                    >
                      <Store className="h-4 w-4" />
                      List your business
                    </Link>
                    <Link
                      href={`/marketplace?industry=${encodeURIComponent(industryId)}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
                    >
                      <Compass className="h-4 w-4" />
                      Browse all {industryPluralName.toLowerCase()}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Section B — providers serving {city} (service-area fallback) ─
            Rendered for EMPTY + SPARSE pages when nearby tenants exist whose
            service radius covers this city. Reuses the existing ProviderCard
            component for visual consistency. Each card's href points to the
            provider's full profile page (same URL pattern as the grid above). */}
        {(tierResult.tier === 'EMPTY' || tierResult.tier === 'SPARSE') && serviceAreaProviders.length > 0 && (
          <section className="w-full px-4 sm:px-6 lg:px-8 py-8 border-t">
            <div className="mx-auto max-w-5xl">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wide mb-2">
                <Navigation className="h-4 w-4" />
                <span>Service-area providers</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                Providers serving {cityName}
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-2xl leading-relaxed">
                These {industryPluralName.toLowerCase()} are based nearby and serve {cityName}.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {serviceAreaProviders.map((p) => {
                  const slug = p.slug || p.publicSlug;
                  const href = slug
                    ? `/${mapIndustryToPluralSlug(p.industry)}/${slugifyCity(p.city)}/${slug}`
                    : '#';
                  return (
                    <ProviderCard
                      key={p.id}
                      provider={p}
                      href={href}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Section C — browse nearby cities ───────────────────────────
            Rendered for EMPTY + SPARSE pages when other DirectoryLocation
            cities nearby have providers in the same industry. Each card links
            to that city's page (built with usePluralPath:true so it points
            to /{industry-plural}/{city-slug} — same route as this page). */}
        {(tierResult.tier === 'EMPTY' || tierResult.tier === 'SPARSE') && nearbyCities.length > 0 && (
          <section className="w-full px-4 sm:px-6 lg:px-8 py-8 border-t bg-muted/10">
            <div className="mx-auto max-w-5xl">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wide mb-2">
                <MapPin className="h-4 w-4" />
                <span>Nearby areas</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                Browse nearby cities
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-2xl leading-relaxed">
                {industryPluralName} in cities close to {cityName} with verified listings on Fieseros.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {nearbyCities.map((c) => (
                  <Link
                    key={c.citySlug}
                    href={c.href}
                    className="group rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                          {c.city}
                        </div>
                        {c.region && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {c.region}
                          </div>
                        )}
                      </div>
                      <MapPin className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-0.5 text-muted-foreground">
                        <Navigation className="h-3 w-3" />
                        {c.distanceKm} km away
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-300">
                        <Store className="h-3 w-3" />
                        {c.providerCount} provider{c.providerCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* SEO footer copy */}
        <section className="w-full px-4 sm:px-6 lg:px-8 py-10 border-t bg-muted/10">
          <div className="mx-auto max-w-4xl text-sm text-muted-foreground leading-relaxed">
            <h2 className="text-base font-semibold text-foreground mb-2">
              About {industryPluralName} in {cityName}
            </h2>
            <p>
              The Fieseros Marketplace connects homeowners and businesses in {cityName} with
              verified local {industryPluralName.toLowerCase()}. Every provider listed here has
              opted into the marketplace, so you can see at a glance how vetted they are —
              identity verified, business verified, insurance verified, and Stripe Connect
              payments enabled. Read real customer reviews, compare ratings and response times,
              then book instantly or request a quote. New {industryPluralName.toLowerCase()} join
              the marketplace every week, so check back often.
            </p>
          </div>
        </section>

        {/* ── For business owners — CRM CTA ────────────────────────────────
            Marketplace → CRM bridge: some visitors to /plumbers/london are
            plumbers themselves looking for software. This CTA connects them
            to the relevant industry software page (e.g. /plumbing-software).
        */}
        <section className="w-full px-4 sm:px-6 lg:px-8 py-10">
          {(() => {
            const softwareUrl = getIndustrySoftwareUrl(industryId);
            const softwareLabel = getIndustrySoftwareLabel(industryId);
            const industryName = getIndustryDisplayName(industryId);
            return (
              <div className="mx-auto max-w-4xl rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-6 sm:p-8">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wide mb-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>For Business Owners in {cityName}</span>
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Run your {industryName.toLowerCase()} business with Fieseros
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-2xl">
                  Manage leads, scheduling, dispatch, invoicing, and customer relationships in one
                  platform. Built for {industryName.toLowerCase()} professionals in {cityName}.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarClock className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Scheduling &amp; Dispatch</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Invoicing &amp; Payments</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Customer CRM</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Navigation className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Route Optimization</span>
                  </div>
                </div>
                <Link
                  href={softwareUrl}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <TrendingUp className="h-4 w-4" />
                  Explore {softwareLabel}
                </Link>
              </div>
            );
          })()}
        </section>
      </main>

      <CornerstoneFooter />

      {/* Mobile bottom tab bar — same as /marketplace */}
      <MarketplaceMobileNav />
    </div>
  );
}
