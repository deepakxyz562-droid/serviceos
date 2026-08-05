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
    components.find((c) => c.types.includes(type));

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
 * Template: "Looking for reliable {industry} services in {city}? {name} is a
 * trusted {industry} business based in {city}, {state}. Rated {rating}★ from
 * {reviewCount} Google reviews, {name} provides professional {industry}
 * services to the {city} area. Contact {name} today for quality workmanship
 * and competitive pricing."
 */
export function generateDescription(
  name: string,
  industry: string,
  city: string | null,
  state: string | null,
  rating: number,
  reviewCount: number,
): string {
  const cityPart = city || 'your area';
  const statePart = state ? `, ${state}` : '';
  const ratingPart = rating > 0
    ? `Rated ${rating.toFixed(1)}★ from ${reviewCount} Google reviews, ${name} provides professional ${industry} services to the ${cityPart} area.`
    : `${name} provides professional ${industry} services to the ${cityPart} area.`;
  return `Looking for reliable ${industry} services in ${cityPart}? ${name} is a trusted ${industry} business based in ${cityPart}${statePart}. ${ratingPart} Contact ${name} today for quality workmanship and competitive pricing.`;
}

/** Generate a short tagline. */
function generateTagline(name: string, industry: string, city: string | null): string {
  const cityPart = city ? ` in ${city}` : '';
  return `${name} — ${industry}${cityPart}`.slice(0, 120);
}

/** Generate SEO title (≤60 chars ideal). */
function generateSeoTitle(name: string, industry: string, city: string | null): string {
  const cityPart = city ? ` in ${city}` : '';
  const base = `${name} — ${industry}${cityPart} | Fieseros`;
  return base.slice(0, 70);
}

/** Generate SEO meta description (≤155 chars). */
function generateSeoDescription(
  name: string,
  industry: string,
  city: string | null,
  rating: number,
  reviewCount: number,
): string {
  const cityPart = city || 'your area';
  const ratingPart = rating > 0 ? ` Rated ${rating.toFixed(1)}★ (${reviewCount} reviews).` : '';
  const base = `Book ${name} for ${industry} services in ${cityPart}. Professional, reliable, and trusted by local customers.${ratingPart}`;
  return base.slice(0, 155);
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
}

/**
 * Map a single Google Place to a Tenant row.
 *
 * @param place   Google Place object
 * @param opts    Mapping options (country code + scraped data)
 */
export function mapPlaceToTenant(place: GooglePlace, opts: MapOptions): MappedTenant {
  const { countryCode } = opts;
  const name = place.displayName?.text || 'Unknown Business';
  const addr = parseAddress(place.addressComponents, place.formattedAddress, countryCode);
  const city = addr.city || null;
  const state = addr.state || null;

  const industry = primaryIndustry(place.primaryType, place.types);
  const categories = allIndustries(place.primaryType, place.types);

  const rating = typeof place.rating === 'number' ? place.rating : 0;
  const reviewCount = typeof place.userRatingCount === 'number' ? place.userRatingCount : 0;

  const description = opts.scrapedDescription && opts.scrapedDescription.length >= 30
    ? opts.scrapedDescription
    : generateDescription(name, industry, city, state, rating, reviewCount);

  const descriptionSource = opts.scrapedDescription && opts.scrapedDescription.length >= 30
    ? 'website_scrape'
    : 'generated';

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
    seoTitle: generateSeoTitle(name, industry, city),
    seoDescription: generateSeoDescription(name, industry, city, rating, reviewCount),
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
