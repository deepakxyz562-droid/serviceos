/**
 * Maps a Google Place (from Places API Text Search) to a Tenant record
 * suitable for SQL INSERT.
 *
 * Used by scripts/google-places-seed.ts.
 *
 * Output is a plain object with primitive values only — the seed script
 * converts it to a SQL INSERT statement with proper escaping.
 */

import type { GooglePlace, GooglePlaceAddressComponent } from './google-places-client';
import { primaryIndustry, allIndustries } from './google-types-mapping';

/** Parsed address components extracted from Google's structured `addressComponents`. */
export interface ParsedAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string; // ISO 3166-1 alpha-2
  countryCode?: string;
}

/** A fully-mapped Tenant row ready for SQL generation. */
export interface MappedTenant {
  id: string;
  name: string;
  slug: string;
  industry: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  currency: string;
  latitude: number | null;
  longitude: number | null;
  rating: number;
  reviewCount: number;
  googlePlaceId: string;
  businessCategoriesJson: string;
  tagline: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  marketplaceOptIn: boolean;
  publicProfileEnabled: boolean;
  listingTier: string;
  claimed: boolean;
  plan: string;
  serviceRadiusKm: number;
  employeesCount: number;
  settingsJson: string;
}

/** Country code → currency code. */
const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  AU: 'AUD',
};

/**
 * Parses Google's `addressComponents` array into our flat address fields.
 * Google's component types are documented at:
 * https://developers.google.com/maps/documentation/places/web-service/place-types#address-components
 */
export function parseAddress(
  components: GooglePlaceAddressComponent[] | undefined,
  fallbackFormattedAddress?: string,
  fallbackCountryCode?: string,
): ParsedAddress {
  const result: ParsedAddress = {
    countryCode: fallbackCountryCode,
    country: fallbackCountryCode,
  };

  if (!components || components.length === 0) {
    return result;
  }

  const find = (type: string): GooglePlaceAddressComponent | undefined =>
    components.find((c) => (c.types || []).includes(type));

  const streetNumber = find('street_number');
  const route = find('route');
  const locality = find('locality') || find('administrative_area_level_3') || find('postal_town');
  const adminArea = find('administrative_area_level_1');
  const postal = find('postal_code');
  const country = find('country');

  if (streetNumber && route) {
    result.street = `${streetNumber.longText || streetNumber.shortText || ''} ${route.longText || route.shortText || ''}`.trim();
  } else if (route) {
    result.street = route.longText || route.shortText;
  }

  if (locality) {
    result.city = locality.longText || locality.shortText;
  }
  if (adminArea) {
    // Use shortText for state (e.g. "TX" not "Texas") — matches US/CA/AU convention
    result.state = adminArea.shortText || adminArea.longText;
  }
  if (postal) {
    result.postalCode = postal.longText || postal.shortText;
  }
  if (country) {
    result.countryCode = country.shortText; // ISO code (e.g. "US")
    result.country = country.longText;
  }

  // Fallback: if no street from components but we have formattedAddress, use it
  if (!result.street && fallbackFormattedAddress) {
    result.street = fallbackFormattedAddress.split(',')[0] || null;
  }

  return result;
}

/** Slugify a business name for use in URLs. */
function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** Generate a random 6-char hex suffix for slug uniqueness. */
function randomSuffix(): string {
  return Math.random().toString(16).slice(2, 8).padEnd(6, '0');
}

/**
 * Slice a string to at most `maxLen` UTF-16 code units WITHOUT splitting a
 * surrogate pair. Some business names use Unicode characters outside the
 * Basic Multilingual Plane (e.g. "𝐂𝐔𝐋𝐓𝐔𝐑𝐀𝐋 𝐋𝐀𝐖𝐍𝐒" — mathematical bold
 * letters, U+1D400-U+1D7FF), which are encoded as surrogate pairs in JS.
 * A naive `.slice(0, 70)` can split a pair, producing a lone surrogate
 * that breaks JSON serialization when the row is later sent to PostgREST
 * (Supabase rejects it as "Empty or invalid json" with PGRST102).
 */
function safeSlice(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  let sliced = str.slice(0, maxLen);
  const lastCode = sliced.charCodeAt(sliced.length - 1);
  if (lastCode >= 0xD800 && lastCode <= 0xDBFF) {
    sliced = sliced.slice(0, -1);
  }
  return sliced;
}

/** Generate a cuid-like ID (timestamp + random) — Prisma will accept any string ID. */
function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  const rand2 = Math.random().toString(36).slice(2, 6);
  return `c${ts}${rand}${rand2}`.slice(0, 24);
}

/**
 * Generate a SEO-friendly description when scraping fails.
 *
 * Output is HTML with <p> tags — matches the format of scraped descriptions
 * so the detail page renders consistently whether the description was
 * scraped from the business website or generated as a fallback.
 *
 * The detail page renders `description` via `dangerouslySetInnerHTML` with
 * Tailwind `prose` classes, so <p> tags produce proper paragraph breaks.
 *
 * IMPORTANT — Google Maps Platform ToS compliance:
 *   We do NOT include Google ratings/review counts in the description.
 *   Google Places API content (other than the Place ID) is subject to a
 *   30-day caching limit and cannot be stored indefinitely. The `rating`
 *   and `reviewCount` fields are still stored on the Tenant row for
 *   internal ranking, but they are NOT surfaced in user-visible copy.
 *
 * Template (2 paragraphs, platform-focused, no Google ratings):
 *   <p>Looking for reliable {Industry} services in {City}? {Name} is a
 *   trusted {Industry} business based in {City}, {State}.</p>
 *   <p>Contact {Name} today for quality workmanship, transparent pricing,
 *   and professional service.</p>
 */
export function generateDescription(
  name: string,
  industry: string,
  city: string | null,
  state: string | null,
): string {
  const industryLabel = prettifyIndustry(industry);
  const cityPart = city || 'your area';
  const statePart = state ? `, ${state}` : '';

  const p1 = `Looking for reliable ${industryLabel} services in ${cityPart}? ${name} is a trusted ${industryLabel} business based in ${cityPart}${statePart}.`;
  const p2 = `Contact ${name} today for quality workmanship, transparent pricing, and professional service.`;

  return `<p>${p1}</p>\n<p>${p2}</p>`;
}

/**
 * Convert an industry ID (e.g. 'plumbing', 'hvac', 'pest-control') into a
 * human-readable label (e.g. 'Plumbing', 'HVAC', 'Pest Control').
 *
 * Used in SEO title/description generators so the copy reads naturally
 * instead of showing the raw kebab-case ID.
 */
function prettifyIndustry(industry: string): string {
  if (!industry) return 'Service';
  // Special-case common acronyms so they render as 'HVAC' not 'Hvac'.
  const ACRONYMS = new Set(['hvac']);
  const lower = industry.toLowerCase().trim();
  if (ACRONYMS.has(lower)) return 'HVAC';
  // Title-case each kebab-word, preserving hyphens as spaces.
  return lower
    .split('-')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Generate a short tagline. */
function generateTagline(name: string, industry: string, city: string | null): string {
  const industryLabel = prettifyIndustry(industry);
  const cityPart = city ? ` in ${city}` : '';
  return safeSlice(`${name} — ${industryLabel}${cityPart}`, 120);
}

/**
 * Generate SEO title in the format:
 *   {Name} | {Industry} Company in {City}, {ST} | Fieseros
 *
 * Falls back gracefully when city/state are missing:
 *   {Name} | {Industry} Company | Fieseros
 *
 * Truncated to 70 chars (Google's typical SERP truncation point).
 *
 * NOTE: No Google ratings — Google Maps Platform ToS §3.2.4 restricts
 * indefinite storage of Places API content (only the Place ID can be
 * stored indefinitely).
 */
function generateSeoTitle(
  name: string,
  industry: string,
  city: string | null,
  state: string | null,
): string {
  const industryLabel = prettifyIndustry(industry);
  // Build the location segment: "in City, ST" or "in City" or empty.
  let locationSegment = '';
  if (city && state) {
    locationSegment = ` in ${city}, ${state}`;
  } else if (city) {
    locationSegment = ` in ${city}`;
  }
  const base = `${name} | ${industryLabel} Company${locationSegment} | Fieseros`;
  return safeSlice(base, 70);
}

/**
 * Generate SEO meta description (≤155 chars).
 *
 * Template:
 *   "{Name} is a {Industry} company in {City}, {ST}. Book trusted local
 *    professionals for quality workmanship and transparent pricing."
 *
 * NOTE: No Google ratings/review counts — Google Maps Platform ToS §3.2.4
 * restricts indefinite storage of Places API content.
 */
function generateSeoDescription(
  name: string,
  industry: string,
  city: string | null,
  state: string | null,
): string {
  const industryLabel = prettifyIndustry(industry);
  // Build the location label: "City, ST" or "City" or "your area".
  let locationLabel = 'your area';
  if (city && state) {
    locationLabel = `${city}, ${state}`;
  } else if (city) {
    locationLabel = city;
  }
  const base = `${name} is a ${industryLabel} company in ${locationLabel}. Book trusted local professionals for quality workmanship and transparent pricing.`;
  return safeSlice(base, 155);
}

/**
 * Country code → display name.
 *
 * NOTE: The `country` field on Tenant is matched EXACTLY by the marketplace
 * browse page's WHERE clause (e.g. `WHERE country = 'US'`). The existing
 * marketplace convention (see prisma/seed-sql/01-us.sql, 02-au.sql) uses
 * ISO 3166-1 alpha-2 codes ("US", "AU", "CA", "GB") — NOT display names.
 * Schema.org's `addressCountry` also accepts ISO codes, so there is no SEO
 * downside. We MUST use ISO codes here or country filtration will silently
 * exclude all our seed data.
 */
const COUNTRY_DISPLAY: Record<string, string> = {
  US: 'US',
  CA: 'CA',
  GB: 'GB',
  AU: 'AU',
};

export interface MapOptions {
  /** ISO country code the query was for (US/CA/GB/AU) — used for fallback + currency. */
  countryCode: string;
  /** Email scraped from website (null if not scraped / not found). */
  scrapedEmail?: string | null;
  /** Description scraped from website (null if not scraped / not found). */
  scrapedDescription?: string | null;
  /** Where the description came from — recorded in settingsJson for audit. */
  descriptionSource?: 'website_scrape' | 'generated';
  /** Where the email came from — recorded in settingsJson for audit. */
  emailSource?: 'website_scrape' | 'none';
  /**
   * The industry the SEARCH QUERY was for (e.g. 'landscaping', 'plumbing').
   * This is used as the PRIMARY industry for the Tenant, because Google's
   * `primaryType` often returns 'general_contractor' for trades like
   * landscaping, garage door repair, handyman — which would mis-categorize
   * them as 'construction'.
   *
   * Google's types[] are still scanned for SECONDARY categories
   * (businessCategoriesJson), but the canonical `industry` field always
   * reflects what the user searched for.
   */
  intendedIndustry?: string;
}

/**
 * Map a single Google Place to a Tenant row.
 *
 * @param place   Google Place object
 * @param opts    Mapping options (country code + scraped data)
 */
export function mapPlaceToTenant(place: GooglePlace, opts: MapOptions): MappedTenant {
  const { countryCode, intendedIndustry } = opts;
  const name = place.displayName?.text || 'Unknown Business';
  const addr = parseAddress(place.addressComponents, place.formattedAddress, countryCode);
  const city = addr.city || null;
  const state = addr.state || null;

  // ── Industry assignment ─────────────────────────────────────
  // The `intendedIndustry` (from the search query) takes precedence over
  // Google's primaryType. Google often returns 'general_contractor' for
  // landscaping, handyman, garage door repair — which would wrongly tag
  // them as 'construction'. The query's intended industry is the source
  // of truth for the canonical `industry` field.
  //
  // Google's types[] are still used for secondary categories, but we:
  //   - exclude the intended industry (no dup)
  //   - exclude 'others' (not useful as a secondary)
  //   - exclude 'construction' if the intended industry IS landscaping/handyman
  //     (because Google tags them as general_contractor → construction, which
  //     is noise, not a genuine secondary trade)
  const googleIndustries = allIndustries(place.primaryType, place.types);
  const industry = intendedIndustry || googleIndustries[0] || 'others';

  // Build secondary categories from Google's types, excluding:
  //   - the intended industry (no dup with primary)
  //   - 'others' (not useful)
  //   - 'construction' if intended industry is a trade that Google
  //     systematically tags as general_contractor
  const NOISY_CONSTRUCTION_TRADES = new Set([
    'landscaping', 'handyman', 'construction', 'roofing', 'flooring',
  ]);
  const suppressConstruction = NOISY_CONSTRUCTION_TRADES.has(industry);
  const categories = [industry, ...googleIndustries.filter((i) => {
    if (i === industry) return false;
    if (i === 'others') return false;
    if (suppressConstruction && i === 'construction') return false;
    return true;
  })].slice(0, 3);

  const rating = typeof place.rating === 'number' ? place.rating : 0;
  const reviewCount = typeof place.userRatingCount === 'number' ? place.userRatingCount : 0;

  // Use the scraped description only if it's rich enough (≥200 chars of HTML,
  // which corresponds to roughly 1 substantive paragraph). Otherwise fall
  // back to the generated template so the detail page always has decent copy.
  const hasUsableScrape = opts.scrapedDescription && opts.scrapedDescription.length >= 200;

  const description = hasUsableScrape
    ? opts.scrapedDescription!
    : generateDescription(name, industry, city, state);

  const descriptionSource = hasUsableScrape ? 'website_scrape' : 'generated';

  const emailSource = opts.scrapedEmail ? 'website_scrape' : 'none';

  const settingsJson = JSON.stringify({
    emailSource,
    emailVerified: false,
    descriptionSource,
    seededAt: new Date().toISOString(),
    seedSource: 'google-places',
  });

  return {
    id: generateId(),
    name,
    slug: `${slugifyName(name)}-${randomSuffix()}`,
    industry,
    phone: place.internationalPhoneNumber || place.nationalPhoneNumber || null,
    email: opts.scrapedEmail || null,
    website: place.websiteUri || null,
    address: place.formattedAddress || null,
    city,
    state,
    postalCode: addr.postalCode || null,
    country: COUNTRY_DISPLAY[countryCode] || countryCode,
    currency: COUNTRY_CURRENCY[countryCode] || 'USD',
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    rating,
    reviewCount,
    googlePlaceId: place.id,
    businessCategoriesJson: JSON.stringify(categories),
    tagline: generateTagline(name, industry, city),
    description,
    seoTitle: generateSeoTitle(name, industry, city, state),
    seoDescription: generateSeoDescription(name, industry, city, state),
    marketplaceOptIn: true,
    publicProfileEnabled: true,
    listingTier: 'free',
    claimed: false,
    plan: 'business',
    serviceRadiusKm: 25,
    employeesCount: Math.floor(Math.random() * 15) + 1,
    settingsJson,
  };
}
