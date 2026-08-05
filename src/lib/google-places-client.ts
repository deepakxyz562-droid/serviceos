/**
 * Google Places API v1 client — Text Search only.
 *
 * Used by scripts/google-places-seed.ts to fetch real business data.
 *
 * Pricing: $32 per 1,000 requests. Each request returns up to 20 results;
 * a query has at most 3 pages (60 results max).
 *
 * Rate limit: 10 QPS (Google Places default for standard API keys).
 * Retry: exponential backoff on 429 / 5xx (max 3 retries).
 */

const PLACES_BASE = 'https://places.googleapis.com/v1/places:searchText';

/** Maximum requests per second (Google Places default quota for standard keys). */
const QPS_LIMIT = 10;
/** Per-request timeout in ms. */
const REQUEST_TIMEOUT_MS = 15_000;
/** Maximum retries on 429/5xx. */
const MAX_RETRIES = 3;

/** Field mask sent as `X-Goog-FieldMask` header — controls which fields Google returns. */
const FIELD_MASK = [
  'places.id',
  'places.displayName.text',
  'places.formattedAddress',
  'places.addressComponents',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.internationalPhoneNumber',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.businessStatus',
  'places.googleMapsUri',
  'places.primaryType',
  'places.types',
  'nextPageToken',
].join(',');

export interface GooglePlaceAddressComponent {
  longText?: string;
  shortText?: string;
  types: string[];
}

export interface GooglePlace {
  id: string;
  displayName?: { text: string; languageCode: string };
  formattedAddress?: string;
  addressComponents?: GooglePlaceAddressComponent[];
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  businessStatus?: string;
  googleMapsUri?: string;
  primaryType?: string;
  types?: string[];
}

export interface GoogleTextSearchResponse {
  places?: GooglePlace[];
  nextPageToken?: string;
}

/** Simple QPS gate — ensures we never exceed 10 requests per rolling second. */
class RateLimiter {
  private timestamps: number[] = [];

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < 1000);
    if (this.timestamps.length >= QPS_LIMIT) {
      const waitMs = 1000 - (now - this.timestamps[0]) + 50; // +50ms buffer
      await new Promise((r) => setTimeout(r, waitMs));
      return this.waitForSlot();
    }
    this.timestamps.push(now);
  }
}

const limiter = new RateLimiter();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Calls Google Places Text Search API.
 *
 * @param textQuery    e.g. "plumber in Houston, TX"
 * @param regionCode   ISO 3166-1 alpha-2 country code (e.g. "us", "ca", "gb", "au")
 * @param languageCode e.g. "en"
 * @param pageToken    nextPageToken from a previous call (for pagination)
 */
export async function searchText(
  textQuery: string,
  regionCode: string,
  languageCode: string = 'en',
  pageToken?: string,
): Promise<GoogleTextSearchResponse> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not set in environment.');
  }

  const body: Record<string, unknown> = {
    textQuery,
    languageCode,
    regionCode,
    pageSize: 20,
  };
  if (pageToken) {
    body.pageToken = pageToken;
  }

  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await limiter.waitForSlot();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const res = await fetch(PLACES_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 429 || res.status >= 500) {
        // Retry with exponential backoff
        lastErr = new Error(`HTTP ${res.status} from Google Places`);
        if (attempt < MAX_RETRIES) {
          const backoffMs = 500 * Math.pow(2, attempt) + Math.random() * 250;
          console.warn(
            `[google-places] HTTP ${res.status}, retrying in ${Math.round(backoffMs)}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
          );
          await sleep(backoffMs);
          continue;
        }
        const errText = await res.text().catch(() => '');
        throw new Error(`Google Places API ${res.status}: ${errText.slice(0, 500)}`);
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Google Places API ${res.status}: ${errText.slice(0, 500)}`);
      }

      const json = (await res.json()) as GoogleTextSearchResponse;
      return json;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES && !(err instanceof Error && err.message.includes('Google Places API '))) {
        // Network/timeout errors — retry
        const backoffMs = 500 * Math.pow(2, attempt) + Math.random() * 250;
        console.warn(
          `[google-places] ${err instanceof Error ? err.message : 'error'}, retrying in ${Math.round(backoffMs)}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await sleep(backoffMs);
        continue;
      }
      throw err;
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error('Google Places API exhausted retries');
}

/**
 * Fetches ALL pages for a single text query (up to 3 pages, ~60 results max).
 * Includes a short delay between pages — Google recommends 2s for page token
 * propagation.
 */
export async function searchTextAllPages(
  textQuery: string,
  regionCode: string,
  languageCode: string = 'en',
  maxPages: number = 3,
): Promise<{ places: GooglePlace[]; pages: number; requests: number }> {
  const all: GooglePlace[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  let requests = 0;

  for (let page = 0; page < maxPages; page++) {
    const res = await searchText(textQuery, regionCode, languageCode, pageToken);
    requests++;
    pages++;

    if (res.places && res.places.length > 0) {
      all.push(...res.places);
    }

    if (!res.nextPageToken) break;
    pageToken = res.nextPageToken;
    // Google requires a short delay before the next-page token becomes valid.
    await sleep(2200);
  }

  return { places: all, pages, requests };
}
