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
import { MarketplaceBrowser } from '@/components/marketplace/marketplace-browser';
import { MarketplaceHeader } from '@/components/marketplace/marketplace-header';
import { MarketplaceMobileNav } from '@/components/marketplace/marketplace-mobile-nav';
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

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
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
  let cityName = deslugifyCity(city);
  let cityLat: number | null = null;
  let cityLng: number | null = null;
  try {
    const dirLoc = await db.directoryLocation.findFirst({
      where: { citySlug: city, isActive: true },
      select: { city: true, latitude: true, longitude: true },
    });
    if (dirLoc) {
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

        {/* Provider grid — empty state if no providers */}
        {providers.length === 0 ? (
          <section className="w-full px-4 sm:px-6 lg:px-8 py-12">
            <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
                <Search className="h-7 w-7 text-emerald-700 dark:text-emerald-300" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                No {industryPluralName.toLowerCase()} found in {cityName} yet
              </h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                We don&apos;t have any verified {industryPluralName.toLowerCase()} listed in {cityName} yet.
                Try browsing all {industryPluralName.toLowerCase()} on the Fieseros marketplace, or
                list your own business to be the first.
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
