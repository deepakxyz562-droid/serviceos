/**
 * Google Business Profile matcher — compares a Google Business Profile location
 * against a Fieseros marketplace listing to determine if they're the same business.
 *
 * Phase 12-13: Used by the claim verification flow when a user connects their
 * Google Business Profile via OAuth. After the OAuth callback stores
 * SocialAccount rows (platform='googlebusiness'), this matcher compares each
 * location's title + address against the target tenant's name + address.
 *
 * The matching uses the same abbreviation-expansion logic from
 * claim/request/route.ts (street→street, ave→avenue, etc.) so legitimate
 * address variations don't unfairly lower the score.
 */

export interface GoogleLocation {
  locationId: string;
  title: string;
  address?: string;
  phone?: string;
  website?: string;
}

export interface TenantAnchor {
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone?: string | null;
  website?: string | null;
}

export interface MatchResult {
  locationId: string;
  title: string;
  matchScore: number; // 0-1
  nameScore: number;
  addressScore: number;
  phoneMatch: boolean;
  websiteMatch: boolean;
}

// ── Abbreviation expansion (mirrors claim/request/route.ts) ──────────────────
const ABBREVIATION_EXPANSIONS: Record<string, string> = {
  st: 'street', str: 'street', ave: 'avenue', av: 'avenue', blvd: 'boulevard',
  rd: 'road', dr: 'drive', ln: 'lane', ct: 'court', pl: 'place', sq: 'square',
  ter: 'terrace', pkwy: 'parkway', hwy: 'highway', cir: 'circle',
  nw: 'northwest', ne: 'northeast', sw: 'southwest', se: 'southeast',
  n: 'north', s: 'south', e: 'east', w: 'west',
  ste: 'suite', apt: 'apartment', fl: 'floor',
  usa: 'us', 'united states': 'us', 'united states of america': 'us',
  canada: 'ca',
};

function normalizeString(s: string): string {
  if (!s) return '';
  return s.toLowerCase().replace(/[.,#]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeAddress(s: string): string {
  if (!s) return '';
  const normalized = normalizeString(s);
  return normalized
    .split(' ')
    .map((w) => ABBREVIATION_EXPANSIONS[w] ?? w)
    .join(' ');
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const aWords = new Set(normalizeString(a).split(/\s+/).filter(Boolean));
  const bWords = new Set(normalizeString(b).split(/\s+/).filter(Boolean));
  const intersection = [...aWords].filter((w) => bWords.has(w)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return union === 0 ? 0 : intersection / union;
}

function addressSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const aWords = new Set(normalizeAddress(a).split(/\s+/).filter(Boolean));
  const bWords = new Set(normalizeAddress(b).split(/\s+/).filter(Boolean));
  const intersection = [...aWords].filter((w) => bWords.has(w)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return union === 0 ? 0 : intersection / union;
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
  }
}

/**
 * Match a Google Business Profile location against a Fieseros tenant.
 *
 * @returns MatchResult with a composite score (name 70% + address 30%).
 *          A score ≥ 0.8 is considered a strong match.
 */
export function matchGoogleLocation(
  location: GoogleLocation,
  tenant: TenantAnchor,
): MatchResult {
  const nameScore = similarity(location.title || '', tenant.name || '');

  // Build the full tenant address for comparison
  const tenantFullAddress = [
    tenant.address,
    tenant.city,
    tenant.state,
    tenant.country,
  ]
    .filter(Boolean)
    .join(', ');

  const addressScore = addressSimilarity(location.address || '', tenantFullAddress);

  // Phone match (digits only)
  const phoneMatch =
    location.phone && tenant.phone
      ? location.phone.replace(/\D/g, '') === tenant.phone.replace(/\D/g, '')
      : false;

  // Website domain match
  const websiteMatch =
    location.website && tenant.website
      ? extractDomain(location.website) === extractDomain(tenant.website)
      : false;

  // Composite score. Gate 1.8 fix: when address is unavailable (Google's
  // list call only returns name+title, not address/phone/website), the
  // addressScore is 0 and the old weighting (name 70% + address 30%) made
  // it impossible to reach the 80% threshold. Now: if address is unavailable,
  // weight name at 100% (since it's the only signal). If address IS
  // available, use the original 70/30 split.
  const hasAddress = !!(location.address && location.address.trim());
  const nameWeight = hasAddress ? 0.7 : 1.0;
  const addressWeight = hasAddress ? 0.3 : 0.0;

  let matchScore = nameScore * nameWeight + addressScore * addressWeight;
  // Boost by 0.05 each if phone or website matches (evidence, not score change)
  if (phoneMatch) matchScore = Math.min(1, matchScore + 0.05);
  if (websiteMatch) matchScore = Math.min(1, matchScore + 0.05);

  return {
    locationId: location.locationId,
    title: location.title,
    matchScore: Math.round(matchScore * 100) / 100,
    nameScore: Math.round(nameScore * 100) / 100,
    addressScore: Math.round(addressScore * 100) / 100,
    phoneMatch,
    websiteMatch,
  };
}

/**
 * Find the best matching Google location for a tenant from a list of locations.
 *
 * @returns the best MatchResult, or null if no location scores ≥ 0.5.
 */
export function findBestMatch(
  locations: GoogleLocation[],
  tenant: TenantAnchor,
): MatchResult | null {
  if (locations.length === 0) return null;

  const results = locations.map((loc) => matchGoogleLocation(loc, tenant));
  results.sort((a, b) => b.matchScore - a.matchScore);

  // Only return if the best score is ≥ 0.5 (below that, it's not a real match)
  return results[0].matchScore >= 0.5 ? results[0] : null;
}

/** Threshold for auto-approving a claim based on Google match. */
export const GOOGLE_MATCH_THRESHOLD = 0.8;
