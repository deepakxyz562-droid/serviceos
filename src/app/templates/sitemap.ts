import type { MetadataRoute } from 'next';
import {
  getCatalogIndex,
  TEMPLATE_CATEGORIES,
  TEMPLATE_INDUSTRIES,
} from '@/lib/forms/templates';

/**
 * Dynamic sitemap for all 20,000+ template-related routes.
 *
 * Next.js serves this at /templates/sitemap.xml. It includes:
 *   - /templates (main gallery)
 *   - /templates/[category] (all 40 categories)
 *   - /templates/industries/[industry] (all 60 industries)
 *   - /templates/[category]/[slug] (all 20,391 high-intent synthesized & curated templates)
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://fieseros.com';

export default function templatesSitemap(): MetadataRoute.Sitemap {
  const index = getCatalogIndex();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [];

  // Main gallery
  entries.push({
    url: `${SITE_URL}/templates`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 1.0,
  });

  // All 40 Category hubs
  for (const cat of TEMPLATE_CATEGORIES) {
    entries.push({
      url: `${SITE_URL}/templates/${cat.id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  // All 60 Industry hubs
  for (const ind of TEMPLATE_INDUSTRIES) {
    if (ind.id === 'general') continue;
    entries.push({
      url: `${SITE_URL}/templates/industries/${ind.id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  // All 20,391 Template detail pages
  for (const t of index) {
    entries.push({
      url: `${SITE_URL}/templates/${t.categoryId}/${t.id}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: t.isFeatured ? 0.9 : 0.6,
    });
  }

  return entries;
}
