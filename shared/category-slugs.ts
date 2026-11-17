/**
 * Universal Category Taxonomy & Specialization Slug Resolver
 * 
 * Works for all 4,000+ Google Business Profile categories.
 * Zero hardcoded if/else regex chains.
 * Client-safe, zero external dependencies.
 */

const TRADE_STOP_WORDS = new Set([
  'best', 'top', 'service', 'services', 'centre', 'center', 'the', 'and', 'for',
  'at', 'near', 'me', 'shop', 'store', 'in', 'to', 'a', 'an', 'of', 'by', 'with',
  'certified', 'expert', 'solutions', 'provider',
]);

/**
 * Deterministically resolves ANY category string, Google category name/ID, or trade text
 * into a clean, canonical specialization slug for S3 storage and visual asset lookup.
 * 
 * Examples:
 *  "Air conditioning repair service" -> "air_conditioning_repair"
 *  "Solar Water Heater Contractor" -> "solar_water_heater_contractor"
 *  "Acupuncture Clinic" -> "acupuncture_clinic"
 *  "Borewell Drilling Contractor" -> "borewell_drilling_contractor"
 *  "Dentist & Orthodontic Clinic" -> "dentist_orthodontic_clinic"
 *  "Coaching Institute" -> "coaching_institute"
 *  "Plywood Supplier" -> "plywood_supplier"
 */
export function toSpecializationSlug(categoryText: string): string {
  if (!categoryText || typeof categoryText !== 'string') {
    return 'general_business';
  }

  // 1. Strip gcid prefix, special symbols, multiple spaces
  const clean = categoryText
    .replace(/^gcid:/i, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  if (!clean) return 'general_business';

  // 2. Tokenize and filter out generic noise words
  const tokens = clean.split(/\s+/).filter(Boolean);
  const meaningfulTokens = tokens.filter((t) => !TRADE_STOP_WORDS.has(t));

  const slug = (meaningfulTokens.length > 0 ? meaningfulTokens : tokens)
    .join('_')
    .slice(0, 60);

  return slug || 'general_business';
}

/**
 * Backward-compatible alias for getCategoryStorageFolder and getCategoryPhotoFolder
 */
export const getCategoryStorageFolder = toSpecializationSlug;
export const getCategoryPhotoFolder = toSpecializationSlug;
