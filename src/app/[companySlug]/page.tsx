import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Wrench,
  Store,
  MapPin,
  ChevronRight,
  TrendingUp,
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
import { MarketplaceHeader } from '@/components/marketplace/marketplace-header';
import { MarketplaceMobileNav } from '@/components/marketplace/marketplace-mobile-nav';
import { CornerstoneFooter } from '@/components/seo/cornerstone-footer';
import { computeCardType, fetchFeaturedListingsMap } from '@/lib/marketplace-featured';
import type { ProviderListItem } from '@/components/marketplace/types';

// ── Route config ────────────────────────────────────────────────────────────
// Same policy as /[companySlug]/[city] — force-dynamic for fresh data.
export const dynamic = 'force-dynamic';

// ── Plural display-name map (mirrors /[companySlug]/[city] for consistency) ──
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
  // ── Added 2026-08-10: 6 industries with dedicated SEO contractor folders ──
  concrete: 'Concrete Contractors',
  'garage-door': 'Garage Door Contractors',
  'lawn-care': 'Lawn Care Services',
  'pet-services': 'Pet Services',
  'snow-removal': 'Snow Removal Services',
  'tree-care': 'Tree Care Services',
};

function getIndustryPluralDisplayName(industryId: string): string {
  if (INDUSTRY_PLURAL_DISPLAY[industryId]) return INDUSTRY_PLURAL_DISPLAY[industryId];
  const meta = getIndustry(industryId);
  if (meta) return meta.name;
  const plural = mapIndustryToPluralSlug(industryId);
  return plural.charAt(0).toUpperCase() + plural.slice(1).replace(/-/g, ' ');
}

// ── generateStaticParams ────────────────────────────────────────────────────
// Pre-render all known plural industry slugs at build time.
export async function generateStaticParams() {
  return Object.keys(
    await import('@/lib/seo/plural-industry-slugs').then((m) => m.PLURAL_SLUG_TO_INDUSTRY)
  ).map((slug) => ({ companySlug: slug }));
}

// ── generateMetadata ────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}): Promise<Metadata> {
  const { companySlug } = await params;

  const industryId = pluralSlugToIndustry(companySlug);
  if (!industryId) return {};

  const industryPluralName = getIndustryPluralDisplayName(industryId);
  const industrySingularName = getIndustryDisplayName(industryId);

  const title = `${industryPluralName} — Find Verified ${industrySingularName} Businesses | Fieseros`;
  const description = `Browse verified ${industryPluralName.toLowerCase()} across all cities on the Fieseros Marketplace. Compare ratings, reviews, and service areas. Book instantly or request a quote from trusted ${industrySingularName.toLowerCase()} professionals.`;
  const appUrl = getAppUrl();
  const canonicalPath = `/${companySlug}`;
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

export default async function IndustryHubPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  // Validate the plural industry slug. 404 if unknown.
  const industryId = pluralSlugToIndustry(companySlug);
  if (!industryId) {
    notFound();
  }

  const industryPluralName = getIndustryPluralDisplayName(industryId);
  const industrySingularName = getIndustryDisplayName(industryId);
  const industryMeta = getIndustry(industryId);
  const parentVerticalId = industryMeta?.vertical ?? null;
  const parentVerticalName = parentVerticalId
    ? VERTICALS.find((v) => v.id === parentVerticalId)?.name ?? null
    : null;

  // ── 1. Fetch top providers nationally (top 12 by rating) ──────────────
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
    rating: number;
    reviewCount: number;
    description: string | null;
    coverImage: string | null;
    claimed: boolean;
    plan: string | null;
    planStatus: string | null;
    listingTier: string | null;
    trialEndsAt: Date | null;
  }> = [];
  try {
    tenants = await db.tenant.findMany({
      where: {
        publicProfileEnabled: true,
        marketplaceOptIn: true,
        suspendedAt: null,
        OR: [
          { industry: { equals: industryId } },
          { businessCategoriesJson: { contains: `"${industryId}"` } },
        ],
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: 12,
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
        rating: true,
        reviewCount: true,
        description: true,
        coverImage: true,
        claimed: true,
        plan: true,
        planStatus: true,
        listingTier: true,
        trialEndsAt: true,
      },
    });
  } catch (err) {
    console.error('[industry-hub] tenant.findMany failed:', err);
  }

  // ── 2. Fetch featured-listing map ─────────────────────────────────────
  const tenantIds = tenants.map((t) => t.id);
  let featuredMap: Map<string, boolean> = new Map();
  try {
    const fm = await fetchFeaturedListingsMap(tenantIds);
    featuredMap = new Map(tenantIds.map((id) => [id, fm.has(id)]));
  } catch (err) {
    console.error('[industry-hub] fetchFeaturedListingsMap failed:', err);
  }

  // ── 3. Build ProviderListItem[] for cards ─────────────────────────────
  const providers: ProviderListItem[] = tenants.map((t) => {
    const cardType = computeCardType(
      {
        claimed: t.claimed,
        plan: t.plan,
        planStatus: t.planStatus,
        trialEndsAt: t.trialEndsAt,
        listingTier: t.listingTier,
      },
      featuredMap.get(t.id) ?? false,
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
      currency: 'USD',
      rating: t.rating,
      reviewCount: t.reviewCount,
      description: t.description,
      coverImage: t.coverImage,
      pricingType: null,
      callOutFee: 0,
      emergencyServiceAvailable: false,
      serviceAreas: [],
      services: [],
      featured: cardType === 'featured' ? 'featured' : null,
      cardType,
      claimed: t.claimed,
      listingTier: t.listingTier,
      phone: null,
      identityVerified: false,
      businessVerified: false,
      insuranceVerified: false,
      stripeConnected: false,
      planStatus: t.planStatus,
      plan: t.plan,
      googleBusinessProfileUrl: null,
      googleBusinessVerified: false,
      jobsCount: Math.round((t.reviewCount ?? 0) * 3),
      responseTimeMins: 30,
      latitude: null,
      longitude: null,
      serviceRadiusKm: 25,
    } satisfies ProviderListItem;
  });

  // ── 4. Fetch top cities that have providers in this industry ──────────
  // Group tenants by city to find which cities have the most providers.
  const cityCounts = new Map<string, { city: string; state: string | null; country: string; count: number }>();
  for (const t of tenants) {
    if (!t.city) continue;
    const key = `${t.city}|${t.country}`;
    const existing = cityCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      cityCounts.set(key, {
        city: t.city,
        state: t.state,
        country: t.country,
        count: 1,
      });
    }
  }
  // Also query DirectoryLocation for known cities (top 24 by population)
  let directoryCities: Array<{ city: string; citySlug: string; countryCode: string }> = [];
  try {
    directoryCities = await db.directoryLocation.findMany({
      where: { isActive: true },
      orderBy: { population: 'desc' },
      take: 24,
      select: { city: true, citySlug: true, countryCode: true },
    });
  } catch (err) {
    console.error('[industry-hub] directoryLocation.findMany failed:', err);
  }

  // ── 5. Build JSON-LD: ItemList + BreadcrumbList ───────────────────────
  const appUrl = getAppUrl();
  const canonicalPath = `/${companySlug}`;
  const canonicalUrl = `${appUrl}${canonicalPath}`;

  const itemListLd = getItemListSchema({
    name: `${industryPluralName} — Fieseros Marketplace`,
    description: `Top ${industryPluralName.toLowerCase()} on the Fieseros Marketplace. Compare ratings, reviews, and book instantly.`,
    url: canonicalUrl,
    items: providers.slice(0, 12).map((p, i) => {
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
    { name: industryPluralName, url: canonicalPath },
  ]);

  // ── CRM software page URL for the "For business owners" CTA ──────────
  const softwareUrl = getIndustrySoftwareUrl(industryId);
  const softwareLabel = getIndustrySoftwareLabel(industryId);

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
        <nav aria-label="Breadcrumb" className="border-b bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <li className="flex items-center gap-1">
                <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground">
                  Home
                </Link>
                <ChevronRight className="h-3 w-3" />
              </li>
              <li className="flex items-center gap-1">
                <Link href="/marketplace" className="hover:text-foreground">
                  Marketplace
                </Link>
                <ChevronRight className="h-3 w-3" />
              </li>
              {parentVerticalName ? (
                <li className="flex items-center gap-1">
                  <Link
                    href={`/marketplace?vertical=${parentVerticalId}`}
                    className="hover:text-foreground"
                  >
                    {parentVerticalName}
                  </Link>
                  <ChevronRight className="h-3 w-3" />
                </li>
              ) : null}
              <li className="flex items-center gap-1">
                <span className="font-medium text-foreground">{industryPluralName}</span>
              </li>
            </ol>
          </div>
        </nav>

        {/* Page header — H1 + intro + CTAs */}
        <section className="border-b bg-gradient-to-b from-emerald-50/40 to-background dark:from-emerald-950/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wide mb-2">
              <Wrench className="h-4 w-4" />
              <span>Fieseros Marketplace</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
              {industryPluralName}
            </h1>
            <p className="mt-3 text-base text-muted-foreground max-w-3xl leading-relaxed">
              Browse verified {industryPluralName.toLowerCase()} across all cities on the Fieseros
              Marketplace. Compare ratings, reviews, and service areas. Book instantly or request a
              quote from trusted {industrySingularName.toLowerCase()} professionals.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
              >
                <Store className="h-4 w-4" />
                Browse all providers
              </Link>
              <Link
                href={softwareUrl}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <TrendingUp className="h-4 w-4" />
                {softwareLabel}
              </Link>
            </div>
          </div>
        </section>

        {/* Top providers grid */}
        {providers.length > 0 ? (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold tracking-tight">
                Top-Rated {industryPluralName}
              </h2>
              <span className="text-sm text-muted-foreground">
                {providers.length} featured provider{providers.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((p) => {
                const slug = p.slug || p.publicSlug;
                const profileUrl = slug
                  ? `/${mapIndustryToPluralSlug(p.industry)}/${slugifyCity(p.city)}/${slug}`
                  : '/marketplace';
                return (
                  <Link
                    key={p.id}
                    href={profileUrl}
                    className="group rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate group-hover:text-emerald-700 transition-colors">
                            {p.name}
                          </h3>
                          {p.tagline && (
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                              {p.tagline}
                            </p>
                          )}
                        </div>
                        {p.claimed && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                            Verified
                          </span>
                        )}
                      </div>
                      {p.city && (
                        <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {p.city}
                          {p.state ? `, ${p.state}` : ''}
                        </div>
                      )}
                      {p.description && (
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                          {p.description.replace(/<[^>]+>/g, '')}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
              <Store className="h-7 w-7 text-emerald-700 dark:text-emerald-300" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              No {industryPluralName.toLowerCase()} listed yet
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Be the first to list your {industrySingularName.toLowerCase()} business on the Fieseros Marketplace.
            </p>
            <Link
              href="/#pricing"
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <Store className="h-4 w-4" />
              List your business
            </Link>
          </section>
        )}

        {/* Browse by city */}
        {directoryCities.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 border-t">
            <h2 className="text-2xl font-bold tracking-tight mb-4">
              Browse {industryPluralName} by City
            </h2>
            <div className="flex flex-wrap gap-2">
              {directoryCities.map((c) => (
                <Link
                  key={`${c.citySlug}-${c.country}`}
                  href={`/${companySlug}/${c.citySlug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted/40 hover:border-emerald-300 transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {industryPluralName} in {c.city}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* For business owners — CRM CTA */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">
                  Run your {industrySingularName.toLowerCase()} business with Fieseros
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  Manage leads, scheduling, dispatch, invoicing, and customer relationships in one
                  platform. Built for {industrySingularName.toLowerCase()} professionals.
                </p>
              </div>
              <Link
                href={softwareUrl}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <TrendingUp className="h-4 w-4" />
                Explore {softwareLabel}
              </Link>
            </div>
          </div>
        </section>

        {/* SEO footer copy */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 border-t bg-muted/10">
          <h2 className="text-base font-semibold text-foreground mb-2">
            About {industryPluralName} on Fieseros
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The Fieseros Marketplace connects homeowners and businesses with verified{' '}
            {industryPluralName.toLowerCase()} across the country. Every provider listed here has
            opted into the marketplace, so you can see at a glance how vetted they are — identity
            verified, business verified, insurance verified, and Stripe Connect payments enabled.
            Read real customer reviews, compare ratings and response times, then book instantly or
            request a quote.
          </p>
        </section>
      </main>

      <CornerstoneFooter />
      <MarketplaceMobileNav />
    </div>
  );
}
