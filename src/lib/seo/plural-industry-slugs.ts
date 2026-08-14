/**
 * plural-industry-slugs.ts — Plural industry slug maps for SEO-friendly
 * marketplace browse URLs (/plumbers/london, /electricians/manchester, etc.)
 *
 * The existing mapIndustryToUrlSlug() in schemas.ts maps to SINGULAR slugs
 * (plumbing → plumber) used by the 3-segment profile route. This file adds
 * PLURAL slugs for the 2-segment browse route + new plural profile URLs.
 *
 * Canonical URL structure:
 *   /{pluralIndustry}/{city}           → browse providers in industry+city
 *   /{pluralIndustry}/{city}/{slug}    → provider profile
 */

// Singular → Plural mapping (the canonical industry ID → plural URL slug)
export const INDUSTRY_TO_PLURAL_SLUG: Record<string, string> = {
  plumbing: 'plumbers',
  electrical: 'electricians',
  cleaning: 'cleaners',
  hvac: 'hvac',
  'air-conditioning': 'hvac',
  landscaping: 'landscapers',
  lawn: 'landscapers',
  gardening: 'landscapers',
  roofing: 'roofers',
  painting: 'painters',
  'pest-control': 'pest-control',
  // ── MKT-8 FIX: flooring was missing from the map ──────────────────────
  // Without this entry, mapIndustryToPluralSlug('flooring') fell through to
  // the fallback (slugify + 's' → 'floorings'), but 'floorings' was NOT in
  // the reverse map (PLURAL_SLUG_TO_INDUSTRY). So resolveIndustryFromAnySlug
  // returned null → the page-level early redirect was skipped →
  // getPublicBusinessByUrl was called directly → cache collision → infinite
  // redirect loop. Adding the canonical mapping fixes both directions.
  flooring: 'flooring-contractors',
  'floor-covering': 'flooring-contractors',
  'window-cleaning': 'window-cleaners',
  'window-washing': 'window-cleaners',
  movers: 'movers',
  moving: 'movers',
  'auto-repair': 'auto-repair',
  automotive: 'auto-repair',
  salon: 'salons',
  spa: 'salons',
  beauty: 'salons',
  'pet-care': 'pet-care',
  veterinary: 'pet-care',
  grooming: 'pet-care',
  catering: 'catering',
  food: 'catering',
  photography: 'photographers',
  tutoring: 'tutors',
  education: 'tutors',
  handyman: 'handymen',
  'general-contractor': 'contractors',
  construction: 'contractors',
  locksmith: 'locksmiths',
  // ── Added 2026-08-10: 6 industries with dedicated SEO contractor folders ──
  concrete: 'concrete-contractors',
  'garage-door': 'garage-door-contractors',
  'lawn-care': 'lawn-care-contractors',
  'pet-services': 'pet-services-contractors',
  'snow-removal': 'snow-removal-contractors',
  'tree-care': 'tree-care-contractors',
};

// Reverse map: plural URL slug → canonical industry ID
export const PLURAL_SLUG_TO_INDUSTRY: Record<string, string> = Object.entries(
  INDUSTRY_TO_PLURAL_SLUG
).reduce((acc, [industry, plural]) => {
  // Keep the first industry ID for each plural slug (handles aliases like
  // 'air-conditioning' → 'hvac' where both map to 'hvac')
  if (!(plural in acc)) acc[plural] = industry;
  return acc;
}, {} as Record<string, string>);

/**
 * Map a free-form industry string (Tenant.industry) to a plural URL slug.
 * Mirrors the logic of mapIndustryToUrlSlug() but returns plural form.
 * Falls back to slugified industry + 's' for unmapped industries.
 */
export function mapIndustryToPluralSlug(industry?: string | null): string {
  if (!industry) return 'services';
  const i = industry.toLowerCase().trim();
  // Direct match against the map
  if (i in INDUSTRY_TO_PLURAL_SLUG) return INDUSTRY_TO_PLURAL_SLUG[i];
  // Substring matches (mirrors mapIndustryToUrlSlug heuristics)
  if (i.includes('plumb')) return 'plumbers';
  if (i.includes('hvac') || i.includes('air cond') || i.includes('heating') || i.includes('cooling')) return 'hvac';
  if (i.includes('electric')) return 'electricians';
  if (i.includes('clean')) return 'cleaners';
  if (i.includes('pest')) return 'pest-control';
  if (i.includes('mov')) return 'movers';
  if (i.includes('landscape') || i.includes('lawn') || i.includes('garden')) return 'landscapers';
  if (i.includes('roof')) return 'roofers';
  if (i.includes('paint')) return 'painters';
  // ── MKT-8 FIX: add floor + window substring matches ───────────────────
  if (i.includes('floor')) return 'flooring-contractors';
  if (i.includes('window')) return 'window-cleaners';
  if (i.includes('auto') || i.includes('car') || i.includes('mechanic')) return 'auto-repair';
  if (i.includes('salon') || i.includes('spa') || i.includes('beauty')) return 'salons';
  if (i.includes('pet') || i.includes('vet') || i.includes('groom')) return 'pet-care';
  if (i.includes('food') || i.includes('restaurant') || i.includes('cater')) return 'catering';
  if (i.includes('photo')) return 'photographers';
  if (i.includes('tutor') || i.includes('education') || i.includes('teach')) return 'tutors';
  if (i.includes('handyman') || i.includes('handy')) return 'handymen';
  // Fallback: slugify + naive plural
  const slug = i.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'services';
  return slug.endsWith('s') ? slug : slug + 's';
}

/**
 * Resolve a plural URL slug back to a canonical industry ID.
 * Returns null if the slug doesn't match any known industry.
 * Used by the /[industry]/[city] route to validate + 404 unknown industries.
 */
export function pluralSlugToIndustry(pluralSlug?: string | null): string | null {
  if (!pluralSlug) return null;
  const slug = pluralSlug.toLowerCase().trim();
  return PLURAL_SLUG_TO_INDUSTRY[slug] ?? null;
}

// ─── Singular-slug reverse lookup ──────────────────────────────────────────
//
// mapIndustryToUrlSlug() (in schemas.ts) maps industry ID → SINGULAR slug
// (plumbing → 'plumber'). For the plural-canonical URL scheme we need the
// reverse: given a singular slug from a legacy URL (e.g. '/plumber/london/'),
// resolve the industry ID so we can 301-redirect to the plural canonical
// ('/plumbers/london/').
//
// We pre-build this map lazily on first call (one-time cost) by walking the
// INDUSTRY_TO_PLURAL_SLUG keys and computing each one's singular slug via the
// same mapIndustryToUrlSlug() heuristics. schemas.ts does NOT import this
// file, so we can safely import it here without a circular dep.

import { mapIndustryToUrlSlug } from '@/lib/seo/schemas';

let SINGULAR_TO_INDUSTRY_CACHE: Record<string, string> | null = null;

/**
 * Resolve a singular industry URL slug (e.g. 'plumber', 'electrician',
 * 'cleaning') back to the canonical industry ID ('plumbing', 'electrical',
 * 'cleaning'). Returns null if the slug doesn't match any known industry.
 *
 * Used by the 3-segment profile route to detect legacy singular URLs and
 * 301-redirect them to the plural canonical form.
 */
export function singularSlugToIndustry(singularSlug?: string | null): string | null {
  if (!singularSlug) return null;
  const slug = singularSlug.toLowerCase().trim();
  if (!SINGULAR_TO_INDUSTRY_CACHE) {
    const cache: Record<string, string> = {};
    for (const industryId of Object.keys(INDUSTRY_TO_PLURAL_SLUG)) {
      const singular = mapIndustryToUrlSlug(industryId);
      // First-write-wins: if two industries map to the same singular slug,
      // keep the canonical one (the order in INDUSTRY_TO_PLURAL_SLUG is
      // canonical-first, aliases after).
      if (!(singular in cache)) cache[singular] = industryId;
    }
    SINGULAR_TO_INDUSTRY_CACHE = cache;
  }
  return SINGULAR_TO_INDUSTRY_CACHE[slug] ?? null;
}

/**
 * Convenience: try plural first, then singular. Returns the canonical
 * industry ID for either URL form, or null if neither matches.
 *
 * Used by the 3-segment profile route to decide whether to issue a
 * singular→plural 301 redirect.
 */
export function resolveIndustryFromAnySlug(urlSlug?: string | null): string | null {
  return pluralSlugToIndustry(urlSlug) ?? singularSlugToIndustry(urlSlug);
}
