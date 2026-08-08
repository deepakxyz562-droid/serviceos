/**
 * industry-software-pages.ts — Map industry IDs to SEO software page URLs.
 * -----------------------------------------------------------------------
 * Provides helpers used by the marketplace business detail page
 * (src/app/[companySlug]/[city]/[slug]/page.tsx) to link from a provider's
 * listing to the relevant industry CRM software landing page.
 *
 * This module was missing (referenced but never created), causing the
 * marketplace detail page to throw a module-not-found error. Created now
 * as a thin wrapper over INDUSTRY_CONFIGS with safe fallbacks.
 *
 * Fallback policy:
 *   - If the industry has a config entry (18 supported industries), return
 *     the verified software page URL (e.g. /hvac-software).
 *   - If the industry is NOT in the config (e.g. "appliance-repair",
 *     "locksmith", "junk-removal", "others"), fall back to
 *     /best-field-service-software — a page that always exists and covers
 *     all field service industries generically.
 *   - For null/undefined industry, fall back to /field-service-software.
 */

import { INDUSTRY_CONFIGS } from './industry-config';
import { getIndustry } from '@/lib/industry-catalog';

/**
 * Returns the SEO software page URL for an industry.
 * e.g. "hvac" → "/hvac-software", "pool-spa" → "/pool-service-software"
 * Unknown industries fall back to "/best-field-service-software".
 */
export function getIndustrySoftwareUrl(industry: string | null | undefined): string {
  if (!industry) return '/field-service-software';
  const cfg = INDUSTRY_CONFIGS[industry];
  if (cfg) return `/${cfg.softwareSlug}`;
  // Unknown industry — fall back to the generic comparison page
  return '/best-field-service-software';
}

/**
 * Returns the display label for the software page.
 * e.g. "hvac" → "HVAC Software", "pool-spa" → "Pool Service Software"
 */
export function getIndustrySoftwareLabel(industry: string | null | undefined): string {
  if (!industry) return 'Field Service Software';
  const cfg = INDUSTRY_CONFIGS[industry];
  if (cfg) return `${cfg.name} Software`;
  // Try the industry catalog for a display name
  const cat = getIndustry(industry);
  const name = cat?.name || titleCase(industry);
  return `${name} Software`;
}

/**
 * Returns the display name for an industry.
 * e.g. "hvac" → "HVAC", "pool-spa" → "Pool Service"
 */
export function getIndustryDisplayName(industry: string | null | undefined): string {
  if (!industry) return 'Service Business';
  const cfg = INDUSTRY_CONFIGS[industry];
  if (cfg) return cfg.name;
  const cat = getIndustry(industry);
  return cat?.name || titleCase(industry);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function titleCase(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
