import type { MetadataRoute } from "next";

/**
 * Dynamic sitemap for ServiceOS public pages.
 * Lists every indexable public route so search engines can discover them all
 * (including the free Invoice Generator tool). Authenticated app routes and
 * API routes are intentionally omitted — they should not be indexed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://serviceos.com";
  const now = new Date().toISOString();

  const routes: { path: string; priority: number; changeFreq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "", priority: 1.0, changeFreq: "weekly" },
    { path: "/invoice-generator", priority: 0.9, changeFreq: "monthly" },
    { path: "/contact-us", priority: 0.6, changeFreq: "monthly" },
    { path: "/privacy-policy", priority: 0.3, changeFreq: "yearly" },
    { path: "/terms-of-service", priority: 0.3, changeFreq: "yearly" },
    { path: "/cookie-policy", priority: 0.3, changeFreq: "yearly" },
    { path: "/data-deletion", priority: 0.3, changeFreq: "yearly" },
  ];

  return routes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFreq,
    priority: r.priority,
  }));
}
