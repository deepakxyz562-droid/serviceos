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
}: {
  config: IndustryConfig;
  city: string;
  providers: ProviderListItem[];
}) {
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
