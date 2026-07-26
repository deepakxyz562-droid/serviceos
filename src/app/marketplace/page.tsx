import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { VERTICALS, getIndustry } from '@/lib/industry-catalog';
import { ProviderCard } from '@/components/marketplace/provider-card';
import type { ProviderListItem } from '@/components/marketplace/types';
import {
  Sparkles,
  Wrench,
  Search,
  MapPin,
  ShieldCheck,
  ArrowRight,
  Building2,
} from 'lucide-react';

export const revalidate = 300; // ISR — revalidate every 5 minutes

export const metadata: Metadata = {
  title: 'ServiceOS Marketplace — Find Trusted Local Service Professionals',
  description:
    'Browse 2,500+ verified local service professionals across 25 industries — HVAC, plumbing, electrical, cleaning, landscaping, pest control, roofing, painting, locksmiths, appliance repair, pool & spa, and automotive. Read real reviews, compare quotes, and book instantly or request emergency dispatch.',
  alternates: { canonical: 'https://serviceos.com/marketplace' },
  openGraph: {
    title: 'ServiceOS Marketplace — Find Trusted Local Service Professionals',
    description:
      'Browse 2,500+ verified local service professionals across 25 industries. Read real reviews, compare quotes, book instantly.',
    url: 'https://serviceos.com/marketplace',
    type: 'website',
  },
};

/**
 * Marketplace browse page — server-rendered for SEO.
 *
 * Fetches all marketplace-eligible providers (tenants who passed all 8
 * eligibility gates: paid + verified + Stripe + opt-in) and renders them
 * as a grid of provider cards. Each card links to /marketplace/[slug].
 *
 * Includes a 9-vertical filter sidebar (drives ?vertical= and ?industry=
 * query params for crawlable facet URLs) and a city search input.
 *
 * Works without JavaScript — the entire page is HTML.
 */

interface SerializedService {
  id: string;
  name: string;
  slug: string | null;
  basePrice: number | null;
  duration: number | null;
  image: string | null;
  description?: string | null;
  longDescription?: string | null;
  category?: string | null;
}

async function fetchProviders() {
  const tenants = await db.tenant.findMany({
    where: {
      marketplaceOptIn: true,
      identityVerified: true,
      businessVerified: true,
      insuranceVerified: true,
      stripeConnected: true,
      planStatus: 'active',
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
      services: {
        where: { isActive: true, isPublic: true },
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          duration: true,
          image: true,
          description: true,
          longDescription: true,
          category: true,
        },
        take: 10,
      },
    },
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
    take: 100,
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

  // Serialize to ProviderListItem shape (parse JSON columns safely)
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
      services: t.services as unknown as SerializedService[],
      featured: featuredMap.get(t.id) ?? null,
    } satisfies ProviderListItem;
  });
}

export default async function MarketplaceBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ vertical?: string; industry?: string; city?: string }>;
}) {
  const params = await searchParams;
  const verticalFilter = params.vertical ?? null;
  const industryFilter = params.industry ?? null;
  const cityFilter = params.city?.trim().toLowerCase() ?? null;

  let providers: ProviderListItem[] = [];
  let dbError = false;
  try {
    providers = await fetchProviders();
  } catch (err) {
    console.error('[marketplace/page] failed to fetch providers:', err);
    dbError = true;
  }

  // Apply in-app filters
  const filtered = providers.filter((p) => {
    if (industryFilter) {
      const ind = (p.industry ?? '').toLowerCase().trim();
      if (ind !== industryFilter) return false;
    }
    if (verticalFilter) {
      // Map industry → vertical using INDUSTRY_CATALOG
      const meta = p.industry ? getIndustry(p.industry) : undefined;
      if (!meta || meta.vertical !== verticalFilter) return false;
    }
    if (cityFilter) {
      const city = (p.city ?? '').toLowerCase();
      const state = (p.state ?? '').toLowerCase();
      const inAreas = p.serviceAreas.some((a) =>
        String(a).toLowerCase().includes(cityFilter),
      );
      if (!city.includes(cityFilter) && !state.includes(cityFilter) && !inAreas) {
        return false;
      }
    }
    return true;
  });

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

  const title = verticalFilter
    ? VERTICALS.find((v) => v.id === verticalFilter)?.name ?? 'All Providers'
    : industryFilter
      ? getIndustry(industryFilter)?.name ?? 'All Providers'
      : 'All Providers';

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
            Find trusted <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400">local service professionals</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {providers.length}+ verified providers across {VERTICALS.length} verticals. Read real reviews, compare quotes, and book instantly — or describe your problem and let our AI route you to the right pro.
          </p>

          {/* AI describe-problem search (links to homepage where the actual AI lives) */}
          <div className="mx-auto mt-6 max-w-2xl">
            <a
              href="/#top"
              className="flex flex-col gap-2 rounded-2xl border bg-card p-2 shadow-xl sm:flex-row sm:items-center hover:border-emerald-300 transition-colors"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <div className="h-12 pl-11 pr-3 flex items-center text-muted-foreground text-base">
                  Describe your problem — e.g. &ldquo;My AC stopped cooling&rdquo;
                </div>
              </div>
              <div className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 text-base font-semibold text-white">
                <Sparkles className="h-5 w-5" /> Try AI Search
              </div>
            </a>
            <p className="mt-2 text-xs text-muted-foreground">
              Or use the city + industry filters below to browse manually.
            </p>
          </div>
        </div>
      </section>

      {/* Main grid: sidebar + provider cards */}
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 py-8 flex-1">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
          {/* Sidebar — industry filter by vertical */}
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

              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Filter by City
                </h2>
                <form method="get" className="space-y-2">
                  {/* Preserve any active vertical/industry filter when the user searches by city */}
                  {verticalFilter ? <input type="hidden" name="vertical" value={verticalFilter} /> : null}
                  {industryFilter ? <input type="hidden" name="industry" value={industryFilter} /> : null}
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      name="city"
                      defaultValue={params.city ?? ''}
                      placeholder="City or postal code"
                      className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-9 w-full rounded-md bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Filter
                  </button>
                </form>
                {cities.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {cities.slice(0, 12).map((c) => (
                      <a
                        key={c}
                        href={`/marketplace?city=${encodeURIComponent(c)}`}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:border-emerald-300 hover:text-emerald-700"
                      >
                        {c}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">All providers verified</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                      Identity, business, insurance, and Stripe Connect — all 4 gates passed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main column */}
          <div>
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {dbError
                    ? 'Having trouble loading providers right now. Please try again in a moment.'
                    : `Showing ${filtered.length} verified provider${filtered.length === 1 ? '' : 's'}.`}
                </p>
              </div>
              <a
                href="/#top"
                className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
              >
                Use AI search instead <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {dbError ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="font-semibold">Couldn&apos;t reach the database</p>
                <p className="mt-1 text-xs">The marketplace is temporarily unavailable. Please try again in a moment.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">No providers match this filter.</p>
                <p className="mt-1 text-xs text-muted-foreground">Try clearing filters or browse all providers.</p>
                <a
                  href="/marketplace"
                  className="mt-4 inline-flex items-center gap-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Browse all providers <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((p) => {
                  const slug = p.slug || p.publicSlug;
                  return (
                    <ProviderCard
                      key={p.id}
                      provider={p}
                      featured={!!p.featured}
                      compact
                      href={slug ? `/marketplace/${slug}` : undefined}
                    />
                  );
                })}
              </div>
            )}

            {/* SEO footer copy */}
            <div className="mt-12 rounded-xl border border-border bg-muted/20 p-5 text-sm text-muted-foreground leading-relaxed">
              <h2 className="text-base font-semibold text-foreground mb-2">
                About the ServiceOS Marketplace
              </h2>
              <p>
                The ServiceOS Marketplace connects homeowners and businesses with verified local service professionals across {VERTICALS.length} verticals — from HVAC and plumbing to cleaning, landscaping, pest control, roofing, painting, locksmiths, appliance repair, pool services, and automotive. Every provider on ServiceOS has passed our 4-gate verification process: identity verified, business verified, insurance verified, and Stripe Connect payments set up. Browse by vertical or city, read real customer reviews, and book instantly — or describe your problem and let our AI route you to the right professional.
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
