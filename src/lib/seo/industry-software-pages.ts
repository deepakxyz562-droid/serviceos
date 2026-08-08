/**
 * industry-software-pages.ts — Maps marketplace industry IDs to their
 * dedicated CRM software landing pages (e.g. plumbing → /plumbing-software).
 *
 * Used by:
 *   - Business detail page CRM CTA (contextual "Run your business with Fieseros")
 *   - City browse page "For business owners" section
 *   - Industry hub page top CTA
 *
 * Falls back to /field-service-software (the generic pillar page) for
 * industries without a dedicated landing page.
 */

import { getIndustry } from '@/lib/industry-catalog';

/**
 * Canonical map of industry ID → CRM software page URL.
 * Mirrors the 18 routes that exist under src/app/*-software/page.tsx.
 * Industries not listed here fall back to /field-service-software.
 */
const INDUSTRY_TO_SOFTWARE_PAGE: Record<string, string> = {
  plumbing: '/plumbing-software',
  hvac: '/hvac-software',
  cleaning: '/cleaning-business-software',
  electrical: '/electrical-contractor-software',
  landscaping: '/landscaping-software',
  roofing: '/roofing-software',
  painting: '/painting-software',
  'pest-control': '/pest-control-software',
  'pool-spa': '/pool-service-software',
  handyman: '/handyman-software',
  'window-cleaning': '/window-cleaning-software',
  solar: '/solar-software',
  // Adjacent markets with dedicated pages but no catalog entry:
  construction: '/concrete-software',
  flooring: '/concrete-software',
  automotive: '/garage-door-software',
  'home-services': '/snow-removal-software',
  'junk-removal': '/snow-removal-software',
  'health-wellness': '/pet-services-software',
  'professional-services': '/tree-care-software',
  'lawn-care': '/lawn-care-software',
};

/** Generic fallback for industries without a dedicated page. */
const FALLBACK_SOFTWARE_PAGE = '/field-service-software';

/**
 * Get the CRM software landing page URL for an industry.
 * Returns /field-service-software if no dedicated page exists.
 *
 * @param industry - The Tenant.industry value (e.g. 'plumbing', 'hvac')
 */
export function getIndustrySoftwareUrl(industry?: string | null): string {
  if (!industry) return FALLBACK_SOFTWARE_PAGE;
  const id = industry.toLowerCase().trim();
  return INDUSTRY_TO_SOFTWARE_PAGE[id] ?? FALLBACK_SOFTWARE_PAGE;
}

/**
 * Get a human-readable label for the CRM software page CTA.
 * e.g. 'plumbing' → 'Plumbing Software', 'hvac' → 'HVAC Software'
 */
export function getIndustrySoftwareLabel(industry?: string | null): string {
  if (!industry) return 'Field Service Software';
  const meta = getIndustry(industry);
  if (meta) {
    // Use the catalog's display name + " Software"
    // Special-case HVAC so it renders as 'HVAC Software' not 'Hvac Software'
    const name = meta.name;
    return `${name} Software`;
  }
  // Fallback: title-case the industry ID
  const titleCased = industry
    .split('-')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
  return `${titleCased} Software`;
}

/**
 * Get the display name (singular) for an industry.
 * e.g. 'plumbing' → 'Plumbing', 'hvac' → 'HVAC', 'pest-control' → 'Pest Control'
 */
export function getIndustryDisplayName(industry?: string | null): string {
  if (!industry) return 'Service';
  const meta = getIndustry(industry);
  if (meta) return meta.name;
  return industry
    .split('-')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
