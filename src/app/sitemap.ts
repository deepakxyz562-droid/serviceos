import type { MetadataRoute } from "next";
import { listIndexableBusinessUrls } from "@/lib/public-business";

/**
 * Dynamic sitemap for ServiceOS public pages.
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
  const base = "https://serviceos.cc";
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
      // Support both new { url, lastModified } shape and legacy string.
      if (typeof entry === 'string') {
        return {
          url: entry,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }
      }
      return {
        url: entry.url,
        lastModified: entry.lastModified || now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }
    })
  } catch (err) {
    // If the DB query fails, still emit the static routes — don't 500 the
    // sitemap and break Google's view of the entire site.
    console.error('[sitemap] failed to list indexable businesses:', err)
  }

  return [...staticEntries, ...businessEntries];
}
