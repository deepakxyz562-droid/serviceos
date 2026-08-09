import type { MetadataRoute } from "next";
import { listIndexableBusinessUrls } from "@/lib/public-business";
import { getAllPosts } from "@/lib/blog";
import { db } from "@/lib/db";
import { mapIndustryToPluralSlug, PLURAL_SLUG_TO_INDUSTRY } from "@/lib/seo/plural-industry-slugs";

/**
 * Dynamic sitemap for Fieseros public pages.
 *
 * Lists every indexable public route so search engines can discover them all.
 * This includes:
 *   - Homepage
 *   - Marketplace browse page (/marketplace) — provider cards link to the
 *     canonical /{industry}/{city}/{slug} public hub URL (the legacy
 *     /marketplace/[slug] route now 301-redirects there).
 *   - 15 SEO cornerstone pages (industry, comparison, feature)
 *   - Free tools (invoice generator)
 *   - Legal/contact pages
 *   - Public Business Hub pages (/{industry}/{city}/{slug}) — the single
 *     canonical URL for every business. Auto-indexed only when the profile
 *     is "rich enough": description ≥100 chars, ≥3 active public services,
 *     ≥1 image, publicProfileEnabled=true. See listIndexableBusinessUrls().
 *
 * SEO FIX (Concern #3): Business entries now use each tenant's real
 * `updatedAt` timestamp for `<lastmod>` (instead of a shared "now" value).
 * This gives Google an accurate freshness signal — a page that was updated
 * yesterday gets crawled sooner than one unchanged for 6 months. Previously
 * every entry shared the same `new Date().toISOString()` which provided
 * zero freshness differentiation.
 *
 * Authenticated app routes and API routes are intentionally omitted —
 * they should not be indexed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://fieseros.com";
  const now = new Date().toISOString();

  // Static marketing + legal routes.
  const staticRoutes: {
    path: string;
    priority: number;
    changeFreq: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    // ─── Core ────────────────────────────────────────────────────────────
    { path: "", priority: 1.0, changeFreq: "weekly" },

    // ─── Marketplace (Phase 13 — dual-audience landing + marketplace routes)
    { path: "/marketplace", priority: 0.9, changeFreq: "weekly" },

    // ─── Cornerstone: Industry pages (high commercial intent) ────────────
    { path: "/field-service-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/plumbing-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/hvac-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/cleaning-business-software", priority: 0.9, changeFreq: "monthly" },
    {
      path: "/electrical-contractor-software",
      priority: 0.9,
      changeFreq: "monthly",
    },
    { path: "/landscaping-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/lawn-care-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/painting-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/handyman-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/tree-care-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/snow-removal-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/pest-control-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/roofing-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/pool-service-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/window-cleaning-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/concrete-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/garage-door-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/solar-software", priority: 0.9, changeFreq: "monthly" },
    { path: "/pet-services-software", priority: 0.9, changeFreq: "monthly" },

    // ─── Cornerstone: Comparison pages (high conversion intent) ──────────
    { path: "/jobber-alternatives", priority: 0.9, changeFreq: "monthly" },
    {
      path: "/housecall-pro-alternatives",
      priority: 0.8,
      changeFreq: "monthly",
    },
    {
      path: "/servicetitan-alternatives",
      priority: 0.8,
      changeFreq: "monthly",
    },
    {
      path: "/best-field-service-software",
      priority: 0.9,
      changeFreq: "monthly",
    },

    // ─── Cornerstone: Feature pages ──────────────────────────────────────
    { path: "/scheduling-and-dispatch", priority: 0.8, changeFreq: "monthly" },
    { path: "/invoicing-and-payments", priority: 0.8, changeFreq: "monthly" },
    { path: "/customer-crm", priority: 0.8, changeFreq: "monthly" },
    { path: "/technician-app", priority: 0.8, changeFreq: "monthly" },
    { path: "/automations", priority: 0.8, changeFreq: "monthly" },

    // ─── Free tools (link magnets) ───────────────────────────────────────
    { path: "/invoice-generator", priority: 0.9, changeFreq: "monthly" },

    // ─── Blog (informational content hub — drives top-of-funnel traffic) ─
    { path: "/blog", priority: 0.8, changeFreq: "weekly" },

    // ─── Contact & legal (low priority, rarely change) ───────────────────
    { path: "/contact-us", priority: 0.6, changeFreq: "monthly" },
    { path: "/privacy-policy", priority: 0.3, changeFreq: "yearly" },
    { path: "/terms-of-service", priority: 0.3, changeFreq: "yearly" },
    { path: "/cookie-policy", priority: 0.3, changeFreq: "yearly" },
    { path: "/data-deletion", priority: 0.3, changeFreq: "yearly" },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFreq,
    priority: r.priority,
  }));

  // Dynamic: public business hub pages (/{industry}/{city}/{slug}).
  //
  // These are the SINGLE canonical URL for every business — the old
  // /marketplace/[slug] route now 301-redirects here, so we no longer emit
  // a separate marketplace-provider sitemap section (it would either
  // duplicate these URLs or emit noindex pages).
  //
  // Only "rich enough" profiles are listed (description ≥100 chars, ≥3
  // active public services, ≥1 image, publicProfileEnabled=true) — see
  // listIndexableBusinessUrls(). Thin profiles render with robots:noindex
  // and are intentionally omitted from the sitemap.
  //
  // Priority 0.8 (raised from 0.7) because these are now the canonical
  // marketplace landing pages too, not just SEO hub pages. Change freq =
  // weekly because reviews & profile edits update them.
  //
  // SEO FIX (Concern #3): `listIndexableBusinessUrls()` now returns
  // `{ url, lastModified }` tuples (the tenant's real `updatedAt`) so
  // Google gets an accurate freshness signal per URL. If it returns plain
  // strings (backward compat), we fall back to `now`.
  let businessEntries: MetadataRoute.Sitemap = []
  try {
    const businessUrls = await listIndexableBusinessUrls()
    businessEntries = businessUrls.map((entry) => {
      // Tier-based priority: Tier A (rich, claimed, verified) gets 0.8,
      // Tier B (medium) gets 0.5. Tier C is never emitted by
      // listIndexableBusinessUrls (excluded via isIndexableByTier). This
      // differentiates crawl priority at 100K-listing scale so Google
      // crawls high-quality pages more aggressively than thin ones.
      const tier = (entry as { tier?: 'A' | 'B' }).tier
      const priority = tier === 'A' ? 0.8 : tier === 'B' ? 0.5 : 0.7
      // Support both new { url, lastModified } shape and legacy string.
      if (typeof entry === 'string') {
        return {
          url: entry,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority,
        }
      }
      return {
        url: entry.url,
        lastModified: entry.lastModified || now,
        changeFrequency: "weekly" as const,
        priority,
      }
    })
  } catch (err) {
    // If the DB query fails, still emit the static routes — don't 500 the
    // sitemap and break Google's view of the entire site.
    console.error('[sitemap] failed to list indexable businesses:', err)
  }

  // Dynamic: blog articles (from MDX files in content/blog/).
  // Each article gets its own sitemap entry with its real publish date as
  // lastModified — this gives Google an accurate freshness signal and helps
  // the article qualify for "fresh content" ranking boosts.
  const blogEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: post.date,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // ── Dynamic: plural browse pages (/{pluralIndustry}/{city}) ───────────────
  //
  // Top 50 cities × 4 most popular industries = up to 200 high-intent
  // "category + location" landing pages (e.g. /plumbers/london,
  // /electricians/manchester, /hvac/berlin, /cleaners/paris). These are the
  // highest-commercial-intent URLs on the site — someone searching "plumber
  // in london" lands directly on a curated list of verified local plumbers.
  //
  // We cap at 200 (50 cities × 4 industries) to avoid sitemap bloat. The
  // missing (city, industry) combos still resolve at runtime via the
  // [companySlug]/[city] route (force-dynamic) — Google discovers them via
  // internal links from the static pages we DO list here.
  //
  // Priority 0.8 — higher than the 0.5 default and below the 1.0 homepage.
  // These pages have strong commercial intent but less freshness than the
  // individual business profile pages (which inherit tenant.updatedAt).

  // ── Industry-only hub pages (/{pluralIndustry}) ──────────────────────────
  // e.g. /plumbers, /electricians, /hvac — these are the top-level industry
  // landing pages that breadcrumbs on business detail pages link to. They
  // were previously missing (404) — now created at src/app/[companySlug]/page.tsx.
  // We list all known plural industry slugs so Google discovers them.
  const industryHubEntries: MetadataRoute.Sitemap = Object.keys(
    PLURAL_SLUG_TO_INDUSTRY
  ).map((slug) => ({
    url: `${base}/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  let browseEntries: MetadataRoute.Sitemap = [];
  try {
    const cities = await db.directoryLocation.findMany({
      where: { isActive: true },
      orderBy: { population: "desc" },
      take: 50,
      select: { citySlug: true },
    });
    // The 4 most popular industries on the marketplace (by search volume +
    // provider count). Adding more here linearly increases sitemap size.
    const topIndustries = ["plumbing", "electrical", "cleaning", "hvac"];

    // ── Demand-gated emission (anti-template-spinning) ─────────────────────
    // Per the consultant's principle "only create pages where there is real
    // business/listing demand": fetch the set of (city, industry) combos
    // that actually have ≥1 provider, then only emit sitemap entries for
    // those combos. This prevents 1000s of empty city pages from hitting
    // Google's index via the sitemap (the per-page robots directive in the
    // [city]/page.tsx files also sets noindex,follow on empty pages as
    // belt-and-suspenders, but excluding them from the sitemap is the
    // primary signal).
    //
    // Single batched query: fetch all tenants matching the top industries,
    // build a Set of `${citySlug}|${industry}` keys, then check membership
    // when emitting entries. Cheaper than N×M count queries.
    const tenantsForDemand = await db.tenant.findMany({
      where: {
        publicProfileEnabled: true,
        marketplaceOptIn: true,
        suspendedAt: null,
        OR: topIndustries.flatMap((industry) => [
          { industry: { equals: industry } },
          { businessCategoriesJson: { contains: `"${industry}"` } },
        ]),
      },
      select: { industry: true, city: true, businessCategoriesJson: true },
    });
    // Build the demand Set. A tenant counts toward an industry if either
    // its primary industry matches OR its businessCategoriesJson contains
    // the industry id. City is slugified to match the directoryLocation
    // citySlug format (so "Los Angeles" → "los-angeles").
    const demandKeys = new Set<string>();
    for (const t of tenantsForDemand) {
      if (!t.city) continue;
      const citySlug = t.city
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      if (!citySlug) continue;
      // A tenant may count for multiple industries (via businessCategoriesJson).
      for (const industry of topIndustries) {
        const matches =
          t.industry === industry ||
          t.businessCategoriesJson?.includes(`"${industry}"`);
        if (matches) {
          demandKeys.add(`${citySlug}|${industry}`);
        }
      }
    }
    for (const city of cities) {
      for (const industry of topIndustries) {
        // Skip city+industry combos with zero providers — demand-gated.
        if (!demandKeys.has(`${city.citySlug}|${industry}`)) continue;
        const plural = mapIndustryToPluralSlug(industry);
        browseEntries.push({
          url: `${base}/${plural}/${city.citySlug}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        });
      }
    }
  } catch (err) {
    // If the DirectoryLocation query fails (e.g. DB unavailable during
    // build), still emit the other sitemap sections — don't 500 the
    // sitemap and break Google's view of the entire site.
    console.error("[sitemap] failed to list plural browse URLs:", err);
  }

  return [...staticEntries, ...blogEntries, ...businessEntries, ...industryHubEntries, ...browseEntries];
}
