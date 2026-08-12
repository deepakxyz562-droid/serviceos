/**
 * Industry Contractors Directory — shared server components.
 * =========================================================
 * Renders two page types used by the 18 contractor directory routes:
 *
 *   <IndustryContractorsLanding />      → /{industry}-contractors
 *   <IndustryContractorsCityPage />     → /{industry}-contractors/{city}
 *
 * The route files (src/app/{industry}-contractors/...) handle DB queries +
 * metadata and pass plain serializable props into these components. Keeping
 * the rendering here avoids duplicating ~200 lines of JSX across 36 files.
 *
 * SEO structure per spec:
 *   - CornerstoneLayout (header + breadcrumbs + AI receptionist + footer mesh)
 *   - H1 with industry + (optional) city
 *   - ItemList JSON-LD for the city list (landing) or provider list (city page)
 *   - BreadcrumbList JSON-LD (handled by CornerstoneLayout breadcrumbs)
 *   - Canonical URLs set in the route's `metadata` export
 *   - Claim CTA on every page → /#signup (CRM acquisition funnel)
 */

import Link from "next/link";
import {
  Building2,
  MapPin,
  Navigation,
  Store,
  ArrowRight,
  ArrowLeft,
  Wrench,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { CornerstoneLayout } from "@/components/seo/cornerstone-layout";
import { ProviderCard } from "@/components/marketplace/provider-card";
import type { ProviderListItem } from "@/components/marketplace/types";
import type { IndustryConfig } from "@/lib/seo/industry-config";
import {
  getItemListSchema,
  getBreadcrumbSchema,
  slugifyCity,
  mapIndustryToUrlSlug,
} from "@/lib/seo/schemas";
import { type CityPageTier } from "@/lib/marketplace/city-page-tier";
import {
  type NearbyCityEntry,
  type ServiceAreaProvider,
} from "@/lib/marketplace/city-page-fallbacks";

const SITE_URL = "https://fieseros.com";

// ─── Industry iconography ────────────────────────────────────────────────────
// Lightweight map from industryId → lucide icon + tailwind color tokens used on
// the city-card grid + the empty-state hero. Keeps each landing page visually
// distinct without needing a per-industry hero image asset.

const INDUSTRY_ICON: Record<string, { icon: LucideIcon; bg: string; text: string }> = {
  hvac: { icon: Wrench, bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-300" },
  plumbing: { icon: Wrench, bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300" },
  electrical: { icon: Wrench, bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300" },
  roofing: { icon: Building2, bg: "bg-slate-50 dark:bg-slate-950/40", text: "text-slate-700 dark:text-slate-300" },
  landscaping: { icon: Sparkles, bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300" },
  "lawn-care": { icon: Sparkles, bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300" },
  painting: { icon: Wrench, bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-300" },
  "pest-control": { icon: Search, bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-300" },
  "pool-spa": { icon: Building2, bg: "bg-cyan-50 dark:bg-cyan-950/40", text: "text-cyan-700 dark:text-cyan-300" },
  cleaning: { icon: Sparkles, bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-700 dark:text-teal-300" },
  concrete: { icon: Building2, bg: "bg-stone-50 dark:bg-stone-950/40", text: "text-stone-700 dark:text-stone-300" },
  "garage-door": { icon: Building2, bg: "bg-zinc-50 dark:bg-zinc-950/40", text: "text-zinc-700 dark:text-zinc-300" },
  handyman: { icon: Wrench, bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300" },
  "pet-services": { icon: Search, bg: "bg-fuchsia-50 dark:bg-fuchsia-950/40", text: "text-fuchsia-700 dark:text-fuchsia-300" },
  "snow-removal": { icon: Sparkles, bg: "bg-sky-50 dark:bg-sky-950/40", text: "text-sky-700 dark:text-sky-300" },
  solar: { icon: Sparkles, bg: "bg-yellow-50 dark:bg-yellow-950/40", text: "text-yellow-700 dark:text-yellow-300" },
  "tree-care": { icon: Sparkles, bg: "bg-green-50 dark:bg-green-950/40", text: "text-green-700 dark:text-green-300" },
  "window-cleaning": { icon: Sparkles, bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-300" },
};

function getIndustryIcon(industryId: string) {
  return INDUSTRY_ICON[industryId] ?? {
    icon: Wrench,
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
  };
}

// ─── Shared "Claim your business" CTA ────────────────────────────────────────
// This is the CRM acquisition funnel — every directory page funnels to /#signup.

function ClaimCtaSection({ config }: { config: IndustryConfig }) {
  return (
    <section className="border-t bg-muted/20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30 p-8 sm:p-10 text-center shadow-sm">
          <Store className="h-10 w-10 mx-auto text-emerald-700 dark:text-emerald-300 mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
            Are you an {config.contractorNoun} business?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-6">
            Claim your free listing on the Fieseros Marketplace and get found by
            customers searching for {config.contractorNoun} in your area. Update
            your business info, respond to leads, and grow — at no cost.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/#signup"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
            >
              <Store className="h-4 w-4" />
              Claim your free listing
            </Link>
            <Link
              href={`/${config.softwareSlug}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
            >
              Run your {config.name} business? See the software <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 1. Landing page: /{industry}-contractors ────────────────────────────────

export interface CityListEntry {
  city: string;
  state: string | null;
  count: number;
}

export function IndustryContractorsLanding({
  config,
  cities,
}: {
  config: IndustryConfig;
  cities: CityListEntry[];
}) {
  const industryIcon = getIndustryIcon(config.industryId);
  const totalProviders = cities.reduce((sum, c) => sum + c.count, 0);
  const cityCount = cities.length;

  // ItemList JSON-LD for the city list — helps Google understand the directory
  // structure and can surface as rich results for "HVAC contractors in {city}".
  const itemListLd = getItemListSchema({
    name: `${config.name} Contractors Directory`,
    description: `Browse ${config.contractorNoun} across ${cityCount} cities on the Fieseros Marketplace.`,
    url: `${SITE_URL}${config.contractorsBasePath}`,
    items: cities.slice(0, 30).map((c, i) => ({
      position: i + 1,
      name: `${config.name} Contractors in ${c.city}`,
      url: `${SITE_URL}${config.contractorsBasePath}/${slugifyCity(c.city)}`,
      description: `${c.count} ${config.contractorNoun} listed in ${c.city}${c.state ? `, ${c.state}` : ""}.`,
    })),
  });

  const breadcrumbLd = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: `${config.name} Contractors`, url: config.contractorsBasePath },
  ]);

  return (
    <CornerstoneLayout
      activePath={config.contractorsBasePath}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: `${config.name} Contractors`, url: config.contractorsBasePath },
      ]}
      additionalSchema={[itemListLd, breadcrumbLd]}
    >
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="border-b bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-4">
            <industryIcon.icon className="h-3.5 w-3.5" />
            Fieseros Marketplace
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
            {config.name} Contractors
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Find verified {config.contractorNoun} across {cityCount}{" "}
            {cityCount === 1 ? "city" : "cities"} on the Fieseros Marketplace.
            {totalProviders > 0
              ? ` Compare ${totalProviders} local businesses, read real reviews, and request quotes.`
              : " Browse listings and claim your free business page."}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/#signup"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
            >
              <Store className="h-4 w-4" />
              Claim your free listing
            </Link>
            <Link
              href={`/${config.softwareSlug}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
            >
              Looking for {config.name} software? <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── City grid ───────────────────────────────────────────────────── */}
      {cities.length === 0 ? (
        <section className="w-full px-4 sm:px-6 lg:px-8 py-14">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              No {config.contractorNoun} listed yet
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              We don&apos;t have any {config.contractorNoun} on the Fieseros
              Marketplace yet. Be the first — claim your free listing and start
              receiving leads from customers in your area.
            </p>
            <Link
              href="/#signup"
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <Store className="h-4 w-4" />
              Claim your free listing
            </Link>
          </div>
        </section>
      ) : (
        <section className="w-full px-4 sm:px-6 lg:px-8 py-12">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Browse {config.name} Contractors by City
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {cityCount} {cityCount === 1 ? "city" : "cities"} ·{" "}
                  {totalProviders} {totalProviders === 1 ? "business" : "businesses"} listed
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cities.map((c) => (
                <Link
                  key={c.city}
                  href={`${config.contractorsBasePath}/${slugifyCity(c.city)}`}
                  className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md"
                >
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">
                      {c.city}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {c.state ?? "—"}
                      <span className="mx-1 text-muted-foreground/40">·</span>
                      <span className="font-medium text-emerald-700 dark:text-emerald-300">
                        {c.count} {c.count === 1 ? "business" : "businesses"}
                      </span>
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-700 dark:group-hover:text-emerald-400" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Software cross-link ─────────────────────────────────────────── */}
      <section className="border-t bg-muted/10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Run a {config.name.toLowerCase()} business? Fieseros also builds{" "}
            <Link
              href={`/${config.softwareSlug}`}
              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              {config.name} service software
            </Link>{" "}
            for scheduling, dispatch, invoicing, and customer CRM. Try it free.
          </p>
        </div>
      </section>

      <ClaimCtaSection config={config} />
    </CornerstoneLayout>
  );
}

// ─── 2. City page: /{industry}-contractors/{city} ────────────────────────────

export function IndustryContractorsCityPage({
  config,
  city,
  providers,
  tier,
  nearbyCities,
  serviceAreaProviders,
}: {
  config: IndustryConfig;
  city: string;
  providers: ProviderListItem[];
  /** Optional — city-page tier computed by `computeCityPageTierFromProviders`.
   *  When provided, EMPTY/SPARSE tiers trigger the fallback sections below
   *  the provider grid (service-area providers + nearby cities). When
   *  undefined, the component renders the legacy behavior (grid + CTAs only). */
  tier?: CityPageTier;
  /** Optional — nearby cities with providers in the same industry.
   *  Rendered as a card grid when tier is EMPTY or SPARSE. */
  nearbyCities?: NearbyCityEntry[];
  /** Optional — service-area providers (located elsewhere but willing to travel).
   *  Rendered via ProviderCard when tier is EMPTY or SPARSE. */
  serviceAreaProviders?: ServiceAreaProvider[];
}) {
  // Whether to render the fallback sections. Only rendered for EMPTY/SPARSE
  // tiers (when the page is too thin to index on its own). READY/STRONG pages
  // are rich enough to stand alone — fallbacks would just add noise.
  const showFallbacks = tier === "EMPTY" || tier === "SPARSE";
  const hasServiceArea =
    showFallbacks && !!serviceAreaProviders && serviceAreaProviders.length > 0;
  const hasNearby =
    showFallbacks && !!nearbyCities && nearbyCities.length > 0;
  const industryIcon = getIndustryIcon(config.industryId);
  const citySlug = slugifyCity(city);
  const canonicalPath = `${config.contractorsBasePath}/${citySlug}`;

  // ItemList JSON-LD — list the providers (capped at 30 for schema brevity).
  const itemListLd = getItemListSchema({
    name: `${config.name} Contractors in ${city}`,
    description: `Verified ${config.contractorNoun} in ${city}. Compare reviews, request quotes, and book services on the Fieseros Marketplace.`,
    url: `${SITE_URL}${canonicalPath}`,
    items: providers.slice(0, 30).map((p, i) => {
      const slug = p.slug || p.publicSlug;
      const profileUrl = slug
        ? `${SITE_URL}/${mapIndustryToUrlSlug(p.industry)}/${slugifyCity(p.city)}/${slug}`
        : `${SITE_URL}${canonicalPath}`;
      return {
        position: i + 1,
        name: p.name,
        url: profileUrl,
        description: p.description || p.tagline || undefined,
      };
    }),
  });

  const breadcrumbLd = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: `${config.name} Contractors`, url: config.contractorsBasePath },
    { name: city, url: canonicalPath },
  ]);

  return (
    <CornerstoneLayout
      activePath={config.contractorsBasePath}
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: `${config.name} Contractors`, url: config.contractorsBasePath },
        { name: city, url: canonicalPath },
      ]}
      additionalSchema={[itemListLd, breadcrumbLd]}
    >
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="border-b bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-4">
            <industryIcon.icon className="h-3.5 w-3.5" />
            {config.name} Contractors
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
            {config.name} Contractors in {city}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Find verified {config.contractorNoun} in {city}. Compare reviews,
            request quotes, and book services on the Fieseros Marketplace.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {providers.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <Store className="h-3.5 w-3.5" />
                {providers.length} {providers.length === 1 ? "provider" : "providers"} available
              </span>
            ) : null}
            <Link
              href="/#signup"
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition-colors"
            >
              <Store className="h-4 w-4" />
              Claim your free listing
            </Link>
          </div>
        </div>
      </section>

      {/* ── Back link ───────────────────────────────────────────────────── */}
      <div className="border-b bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <Link
            href={config.contractorsBasePath}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All {config.name} Contractors
          </Link>
        </div>
      </div>

      {/* ── Provider grid ───────────────────────────────────────────────── */}
      {providers.length === 0 ? (
        <section className="w-full px-4 sm:px-6 lg:px-8 py-14">
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              No {config.contractorNoun} listed in {city} yet
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              We don&apos;t have any {config.contractorNoun} listed in {city} yet.
              Be the first — claim your free listing on the Fieseros Marketplace
              and start receiving leads from local customers.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/#signup"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <Store className="h-4 w-4" />
                Claim your free listing
              </Link>
              <Link
                href={config.contractorsBasePath}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
              >
                Browse other cities
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {providers.length} {config.name} {providers.length === 1 ? "Contractor" : "Contractors"} in {city}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Each business below has opted into the Fieseros Marketplace. Tap
                a profile to see services, reviews, and request a quote.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {providers.map((p) => {
                const slug = p.slug || p.publicSlug;
                const href = slug
                  ? `/${mapIndustryToUrlSlug(p.industry)}/${slugifyCity(p.city)}/${slug}`
                  : undefined;
                return (
                  <ProviderCard
                    key={p.id}
                    provider={p}
                    featured={!!p.featured}
                    href={href}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Section B — providers serving {city} (service-area fallback) ──
          Rendered for EMPTY + SPARSE pages when nearby tenants exist whose
          service radius covers this city. Reuses the existing ProviderCard
          component for visual consistency. Each card's href points to the
          provider's full profile page (same URL pattern as the grid above). */}
      {hasServiceArea && serviceAreaProviders && (
        <section className="w-full px-4 sm:px-6 lg:px-8 py-8 border-t">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wide mb-2">
              <Navigation className="h-4 w-4" />
              <span>Service-area providers</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-1">
              Providers serving {city}
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-2xl leading-relaxed">
              These {config.contractorNoun} are based nearby and serve {city}.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {serviceAreaProviders.map((p) => {
                const slug = p.slug || p.publicSlug;
                const href = slug
                  ? `/${mapIndustryToUrlSlug(p.industry)}/${slugifyCity(p.city)}/${slug}`
                  : "#";
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

      {/* ── Section C — browse nearby cities ──────────────────────────────
          Rendered for EMPTY + SPARSE pages when other DirectoryLocation
          cities nearby have providers in the same industry. Each card links
          to that city's contractor page (built with usePluralPath:false so
          it points to /{industry}-contractors/{city-slug} — same route as
          this page). */}
      {hasNearby && nearbyCities && (
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
              {config.contractorNoun} in cities close to {city} with verified listings on Fieseros.
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
                      {c.providerCount} provider{c.providerCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Local SEO content sections (READY/STRONG only) ─────────────────
          These sections only render for indexed city pages (tier READY or
          STRONG). For EMPTY/SPARSE pages (noindex), they'd be filler content
          without providers to back it up, which Google flags as thin. The
          content adds E-E-A-T depth + local relevance signals that help the
          page rank for "{industry} contractors in {city}" queries. */}
      {!showFallbacks && providers.length > 0 && (
        <>
          {/* About {industry} in {city} */}
          <section className="border-t">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4">
                About {config.name.toLowerCase()} contractors in {city}
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  {city} has a mix of residential and commercial properties that
                  rely on local {config.contractorNoun} for routine maintenance,
                  emergency repairs, and new installations. {config.emergencyExample !== "My AC isn't working" ? `Common emergency requests include ${config.emergencyExample.toLowerCase()}.` : `Whether it's a ${config.emergencyExample.toLowerCase()} or a scheduled installation, response time and local reputation matter.`}
                </p>
                <p>
                  The {config.contractorNoun} listed above have opted into the
                  Fieseros Marketplace, which means they have active business
                  profiles, verified contact information, and have agreed to
                  receive quote requests from local customers. Each profile
                  shows the services offered, service area, and any
                  verifications completed (identity, business, insurance).
                </p>
                <p>
                  When choosing a {config.contractorNoun.replace(/s$/, "")} in {city},
                  consider three things: <strong>local presence</strong> (a
                  contractor based in or near {city} can respond faster),
                  <strong> verification status</strong> (identity-verified and
                  insurance-verified businesses carry less risk), and
                  <strong> service area coverage</strong> (verify your
                  neighbourhood is within their travel radius).
                </p>
              </div>
            </div>
          </section>

          {/* How to choose */}
          <section className="border-t bg-muted/20">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-4">
                How to choose a {config.contractorNoun.replace(/s$/, "")} in {city}
              </h2>
              <div className="space-y-3">
                {[
                  {
                    title: "Verify licensing and insurance",
                    desc: `Ask for proof of licensing specific to ${config.name.toLowerCase()} work in your province or state, and confirm the contractor carries liability insurance. Insurance-verified businesses on Fieseros have uploaded proof — look for the insurance badge on their profile.`,
                  },
                  {
                    title: "Check local service area",
                    desc: `A contractor based in or near ${city} will respond faster and charge less for travel. Review the service area listed on each profile to confirm your neighbourhood is covered.`,
                  },
                  {
                    title: "Compare multiple quotes",
                    desc: `Request quotes from at least three ${config.contractorNoun} for any non-emergency work. Pricing can vary significantly based on the contractor's schedule, overhead, and current ${config.demandLabel}.`,
                  },
                  {
                    title: "Ask about warranties and guarantees",
                    desc: `Reputable ${config.contractorNoun} stand behind their work with written warranties on labour and clearly state the manufacturer warranty on parts. Get both in writing before work begins.`,
                  },
                  {
                    title: `Confirm availability for ${config.demandLabel}`,
                    desc: `${config.name} work often has ${config.demandLabel}. If your need is time-sensitive (especially emergencies like "${config.emergencyExample}"), confirm the contractor's current response time before requesting a quote.`,
                  },
                ].map((item, i) => (
                  <div key={i} className="rounded-lg border bg-card p-4">
                    <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Local FAQ */}
          <section className="border-t">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-6 text-center">
                {config.name} contractors in {city} — FAQ
              </h2>
              <div className="space-y-3">
                {[
                  {
                    q: `How much do ${config.contractorNoun} charge in ${city}?`,
                    a: `Pricing varies by job type, urgency, and contractor experience. Most ${config.contractorNoun} in ${city} offer free quotes — request quotes from at least three providers to compare. Emergency or after-hours calls typically carry a premium. ${config.name} businesses with higher verification status (insurance, business license) often charge more but carry less risk.`,
                  },
                  {
                    q: `How quickly can a ${config.contractorNoun.replace(/s$/, "")} respond in ${city}?`,
                    a: `Response time depends on the contractor's current schedule and your location within ${city}. For emergencies like "${config.emergencyExample}", look for contractors with emergencyServiceAvailable on their profile. Most listed providers respond to quote requests within a few hours during business hours.`,
                  },
                  {
                    q: `Are the ${config.contractorNoun} on this page verified?`,
                    a: `Each provider has a Fieseros Marketplace profile. Verification badges (identity, business, insurance) indicate which documents the contractor has uploaded and we have reviewed. Verified badges reduce risk but do not guarantee work quality — always check references for large projects.`,
                  },
                  {
                    q: `Can I leave a review for a ${config.contractorNoun.replace(/s$/, "")} in ${city}?`,
                    a: `Yes. After working with a contractor, you can leave a review on their Fieseros profile. Reviews help other ${city} residents make informed decisions and help quality contractors stand out. Be specific about the work performed, timeliness, and overall experience.`,
                  },
                ].map((faq, i) => (
                  <details key={i} className="group rounded-lg border bg-card p-4">
                    <summary className="cursor-pointer font-medium text-foreground flex items-center justify-between gap-2">
                      {faq.q}
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-open:rotate-90 transition-transform" />
                    </summary>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* Related services in {city} */}
          <section className="border-t bg-muted/20">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3 text-center">
                Other contractors in {city}
              </h2>
              <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
                Browse other verified service businesses on the Fieseros Marketplace serving {city}.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {config.relatedIndustries.slice(0, 6).map((rel) => {
                  // Map software slug back to contractors path
                  // e.g. "plumbing-software" → "plumbing-contractors"
                  const contractorSlug = rel.slug.replace("-software", "").replace("electrical-contractor", "electrical");
                  return (
                    <Link
                      key={rel.slug}
                      href={`/${contractorSlug}-contractors/${citySlug}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:border-emerald-500/40"
                    >
                      {rel.name} Contractors
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── Software cross-link + claim CTA ─────────────────────────────── */}
      <section className="border-t bg-muted/10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Run a {config.name.toLowerCase()} business in {city}? Fieseros also
            builds{" "}
            <Link
              href={`/${config.softwareSlug}`}
              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              {config.name} service software
            </Link>{" "}
            for scheduling, dispatch, invoicing, and customer CRM. Try it free.
          </p>
        </div>
      </section>

      <ClaimCtaSection config={config} />
    </CornerstoneLayout>
  );
}
