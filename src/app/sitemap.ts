import type { MetadataRoute } from "next";
import { listIndexableBusinessUrls } from "@/lib/public-business";

/**
 * Dynamic sitemap for ServiceOS public pages.
 *
 * Lists every indexable public route so search engines can discover them all.
 * This includes:
 *   - Homepage
 *   - 15 SEO cornerstone pages (industry, comparison, feature)
 *   - Free tools (invoice generator)
 *   - Legal/contact pages
 *   - Public Business Hub pages (/{industry}/{city}/{slug}) — auto-indexed
 *     only when the business profile is "rich enough":
 *     description ≥100 chars, ≥3 active public services, ≥1 image,
 *     publicProfileEnabled=true. See listIndexableBusinessUrls().
 *
 * Authenticated app routes and API routes are intentionally omitted —
 * they should not be indexed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://serviceos.com";
  const now = new Date().toISOString();

  // Static marketing + legal routes.
  const staticRoutes: {
    path: string;
    priority: number;
    changeFreq: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    // ─── Core ────────────────────────────────────────────────────────────
    { path: "", priority: 1.0, changeFreq: "weekly" },

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
    { path: "/serviceos-vs-jobber", priority: 0.8, changeFreq: "monthly" },

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

  // Dynamic: public business hub pages (only "rich enough" profiles).
  // Lower priority (0.7) since they're newer / less authoritative than the
  // cornerstone pages. Change freq = weekly because reviews & profile edits
  // update them.
  let businessEntries: MetadataRoute.Sitemap = []
  try {
    const businessUrls = await listIndexableBusinessUrls()
    businessEntries = businessUrls.map((url) => ({
      url,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }))
  } catch (err) {
    // If the DB query fails, still emit the static routes — don't 500 the
    // sitemap and break Google's view of the entire site.
    console.error('[sitemap] failed to list indexable businesses:', err)
  }

  return [...staticEntries, ...businessEntries];
}
