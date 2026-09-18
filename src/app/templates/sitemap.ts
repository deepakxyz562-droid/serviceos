import type { MetadataRoute } from 'next';
import {
  getAllTemplates,
  TEMPLATE_CATEGORIES,
  TEMPLATE_INDUSTRIES,
} from '@/lib/forms/templates';

/**
 * Dynamic sitemap for all template-related routes.
 *
 * Next.js will serve this at /templates/sitemap.xml (and merge it with the
 * root sitemap if one exists). It includes:
 *   - /templates (main gallery)
 *   - /templates/[category] (one per category with ≥1 template)
 *   - /templates/industries/[industry] (one per industry with ≥1 template)
 *   - /templates/[category]/[slug] (one per template)
 *
 * Priority and changeFrequency are set per Jotform's pattern:
 *   gallery: 0.9, weekly
 *   category/industry: 0.7, weekly
 *   template detail: 0.8, monthly (templates rarely change once published)
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://fieseros.com';

export default function templatesSitemap(): MetadataRoute.Sitemap {
  const all = getAllTemplates();

  // Build category + industry sets from actual templates
  const categorySet = new Set<string>();
  const industrySet = new Set<string>();
  for (const t of all) {
    for (const c of t.categories) categorySet.add(c);
    for (const i of t.industries) industrySet.add(i);
  }

  const entries: MetadataRoute.Sitemap = [];

  // Main gallery
  entries.push({
    url: `${SITE_URL}/templates`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  });

  // Category pages
  for (const cat of categorySet) {
    entries.push({
      url: `${SITE_URL}/templates/${cat}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  // Industry pages
  for (const ind of industrySet) {
    if (ind === 'general') continue;
    entries.push({
      url: `${SITE_URL}/templates/industries/${ind}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }

  // Template detail pages
  for (const t of all) {
    const category = t.categories[0] || 'general';
    entries.push({
      url: `${SITE_URL}/templates/${category}/${t.id}`,
      lastModified: new Date(t.updatedAt || t.createdAt || Date.now()),
      changeFrequency: 'monthly',
      priority: t.isFeatured ? 0.9 : 0.8,
    });
  }

  return entries;
}
