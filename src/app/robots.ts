import type { MetadataRoute } from "next";

/**
 * Dynamic robots.txt for ServiceOS.
 * - Allows all good bots to crawl public pages.
 * - Blocks authenticated app routes, API routes, and portal routes that
 *   shouldn't appear in search results.
 * - Points crawlers at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/form/",
          "/f/",
          "/accept-invite",
          // Dynamic company-scoped portal/login routes — not indexable.
          "/*/login",
          "/*/customer",
          "/*/employee",
          "/*/accept-invite",
        ],
      },
    ],
    sitemap: "https://serviceos.com/sitemap.xml",
    host: "https://serviceos.com",
  };
}
