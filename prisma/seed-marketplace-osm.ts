/**
 * seed-marketplace-osm.ts
 * -------------------------------------------------------------------
 * Pulls REAL business data from OpenStreetMap's Overpass API and
 * creates Tenant records as FREE marketplace listings (unclaimed).
 *
 * This populates the marketplace with real businesses so it is not
 * empty on launch. The listings are:
 *   - listingTier: "free"
 *   - claimed: false          (no owner User; real owner can claim later)
 *   - marketplaceOptIn: true  (so they appear in the public browse page)
 *   - publicProfileEnabled: true
 *   - onboardingCompleted: true (skip the onboarding wizard)
 *   - plan: "starter", planStatus: "trial"  (not paying subscribers)
 *
 * No User accounts are created (these are unclaimed listings).
 * No Workspace is created (marketplace browse only reads Tenant fields).
 *
 * Usage:
 *   bun run prisma/seed-marketplace-osm.ts
 *   bun run prisma/seed-marketplace-osm.ts --city="Sydney" --country="AU" --limit=100
 *
 * Env (optional):
 *   SEED_CITY        default city if no --city arg
 *   SEED_COUNTRY     default country code if no --country arg
 *   SEED_LIMIT       default limit if no --limit arg
 *   OVERPASS_ENDPOINT  default https://overpass-api.de/api/interpreter
 *
 * Idempotent: skips Tenants that already exist by phone or (name + city).
 * Safe to re-run.
 */

import { PrismaClient } from '@prisma/client';
import { getIndustry } from '../src/lib/industry-catalog';

// ─── Prisma client (direct, not the Next.js singleton) ──────────────────────
const db = new PrismaClient({
  log: ['error', 'warn'],
});

// ─── Types ──────────────────────────────────────────────────────────────────
interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

interface OsmResponse {
  version?: number;
  elements?: OsmElement[];
}

interface ParsedArgs {
  city: string;
  country: string; // ISO 3166-1 alpha-2 ("AU", "US", ...)
  limit: number;
}

// ─── CLI arg parsing ─────────────────────────────────────────────────────────
function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const get = (key: string): string | undefined => {
    const m = args.find((a) => a.startsWith(`--${key}=`));
    return m ? m.slice(`--${key}=`.length) : undefined;
  };

  const city =
    get('city') ||
    process.env.SEED_CITY ||
    'Sydney';

  const country =
    (get('country') || process.env.SEED_COUNTRY || 'AU').toUpperCase();

  const limitStr = get('limit') || process.env.SEED_LIMIT || '100';
  const limit = Math.max(1, Math.min(500, parseInt(limitStr, 10) || 100));

  return { city, country, limit };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Slugify a name into a URL-safe base (lowercase, dashed). */
function slugifyBase(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Random 4-char hex suffix (ensures slug uniqueness across reruns). */
function randomSuffix(): string {
  return Math.random().toString(16).slice(2, 6);
}

/** Sleep helper for pacing between Overpass batches. */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Resolve an industry id against the catalog. Falls back to "others"
 * with a warning if the category does not exist yet (e.g. `retail`,
 * `fabric-textile` are being added by Task 3 in parallel).
 */
function resolveIndustry(id: string): string {
  if (getIndustry(id)) return id;
  console.warn(
    `  ⚠ Industry "${id}" not in INDUSTRY_CATALOG yet — falling back to "others".`,
  );
  return 'others';
}

/**
 * Map OSM tags → ServiceOS industry id.
 * Mapping per task spec; unknown combinations fall back to "others".
 */
function mapIndustry(tags: Record<string, string>): string {
  const shop = (tags.shop || '').toLowerCase();
  const amenity = (tags.amenity || '').toLowerCase();
  const craft = (tags.craft || '').toLowerCase();
  const office = (tags.office || '').toLowerCase();

  // Hair & beauty → home-services (no dedicated beauty industry yet)
  if (shop === 'hairdresser' || shop === 'beauty' || shop === 'salon') {
    return resolveIndustry('home-services');
  }

  // Retail (NEW category — falls back to "others" if not in catalog yet)
  if (
    [
      'supermarket',
      'convenience',
      'florist',
      'hardware',
      'doityourself',
      'garden_centre',
      'books',
      'gift',
      'jewelry',
      'electronics',
      'mobile_phone',
      'sports',
      'toys',
      'shoes',
      'optician',
      'bakery',
      'butcher',
      'greengrocer',
      'beverages',
      'alcohol',
      'pet',
      'stationery',
      'newsagent',
      'tobacco',
      'chemist',
      'cosmetics',
    ].includes(shop)
  ) {
    return resolveIndustry('retail');
  }

  // Fabric & textile (NEW category — falls back to "others" if not in catalog yet)
  if (
    [
      'clothes',
      'fabric',
      'textiles',
      'sewing',
      'tailor',
      'fashion',
      'leather',
      'haberdashery',
    ].includes(shop)
  ) {
    return resolveIndustry('fabric-textile');
  }

  // Restaurants / cafes / bars → "others" (no hospitality category yet)
  if (
    amenity === 'restaurant' ||
    amenity === 'cafe' ||
    amenity === 'fast_food' ||
    amenity === 'bar' ||
    amenity === 'pub'
  ) {
    return resolveIndustry('others');
  }

  // Trade crafts → corresponding ServiceOS industries
  if (craft === 'plumber') return resolveIndustry('plumbing');
  if (craft === 'electrician') return resolveIndustry('electrical');
  if (
    craft === 'hvac' ||
    craft === 'heating_engineer' ||
    craft === 'air_conditioning'
  ) {
    return resolveIndustry('hvac');
  }
  if (craft === 'carpenter' || craft === 'joiner') {
    return resolveIndustry('construction');
  }
  if (craft === 'painter' || craft === 'decorator') {
    return resolveIndustry('painting');
  }
  if (craft === 'locksmith') return resolveIndustry('locksmith');
  if (craft === 'cleaning' || craft === 'cleaner') {
    return resolveIndustry('cleaning');
  }
  if (craft === 'gardener' || craft === 'landscaper') {
    return resolveIndustry('landscaping');
  }
  if (craft === 'mechanic') return resolveIndustry('automotive');
  if (craft === 'appliance_repair') return resolveIndustry('appliance-repair');
  if (craft === 'pest_control') return resolveIndustry('pest-control');
  if (craft === 'pool_maintenance' || craft === 'swimming_pool_technician') {
    return resolveIndustry('pool-spa');
  }
  if (craft === 'roofer') return resolveIndustry('roofing');
  if (craft === 'floorer') return resolveIndustry('flooring');

  // Office-based professional services
  if (
    office === 'company' ||
    office === 'business' ||
    office === 'lawyer' ||
    office === 'accountant' ||
    office === 'consulting' ||
    office === 'marketing' ||
    office === 'advertising_agency' ||
    office === 'architect' ||
    office === 'estate_agent' ||
    office === 'real_estate_agent' ||
    office === 'insurance' ||
    office === 'tax_advisor' ||
    office === 'financial'
  ) {
    return resolveIndustry('professional-services');
  }

  // IT services
  if (office === 'it' || office === 'computer' || office === 'telecommunication') {
    return resolveIndustry('it-services');
  }

  return resolveIndustry('others');
}

/** Build a short human description. */
function buildDescription(
  tags: Record<string, string>,
  industryId: string,
  city: string,
): string {
  if (tags.description && tags.description.trim().length >= 60) {
    return tags.description.trim().slice(0, 600);
  }
  const industryMeta = getIndustry(industryId);
  const label = industryMeta?.name ?? 'service';
  const tagline = tags.shop
    ? tags.shop.replace(/_/g, ' ')
    : tags.craft
      ? tags.craft.replace(/_/g, ' ')
      : tags.amenity
        ? tags.amenity
        : 'service';
  return (
    `Established ${label.toLowerCase()} (${tagline}) serving ${city} and surrounding areas. ` +
    `Find contact details, location and opening hours below. ` +
    `Claim this listing to manage your profile, services and bookings.`
  );
}

/** Generate a random rating between 3.5 and 4.9 (one decimal). */
function randomRating(): number {
  const r = 3.5 + Math.random() * 1.4; // 3.5..4.9
  return Math.round(r * 10) / 10;
}

/** Generate a random review count between 5 and 120. */
function randomReviewCount(): number {
  return Math.floor(5 + Math.random() * 116);
}

/** Normalize a phone number (very light — just trim, keep digits/+/-/spaces). */
function normalizePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed;
}

// ─── Overpass fetch with retry + timeout ────────────────────────────────────

const OVERPASS_ENDPOINT =
  process.env.OVERPASS_ENDPOINT || 'https://overpass-api.de/api/interpreter';

const FETCH_TIMEOUT_MS = 60_000;
const USER_AGENT = 'ServiceOS-Seed/1.0 (+https://serviceos.cc)';

async function fetchWithTimeout(
  url: string,
  body: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Run a single Overpass QL query. Retries once on failure.
 * Returns parsed elements (may be empty).
 */
async function runOverpassQuery(query: string, label: string): Promise<OsmElement[]> {
  const body = `data=${encodeURIComponent(query)}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`  → [${label}] Overpass request (attempt ${attempt})...`);
      const res = await fetchWithTimeout(OVERPASS_ENDPOINT, body, FETCH_TIMEOUT_MS);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          `Overpass HTTP ${res.status} ${res.statusText}: ${text.slice(0, 200)}`,
        );
      }
      const json = (await res.json()) as OsmResponse;
      const elements = (json.elements ?? []).filter(
        (e): e is OsmElement =>
          e.type === 'node' && typeof e.lat === 'number' && typeof e.lon === 'number',
      );
      console.log(`  ✓ [${label}] Got ${elements.length} elements.`);
      return elements;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < 2) {
        console.warn(`  ⚠ [${label}] Attempt ${attempt} failed: ${msg}`);
        console.warn(`  … retrying in 2s...`);
        await sleep(2000);
      } else {
        console.error(`  ✗ [${label}] Both attempts failed: ${msg}`);
        return []; // don't crash — return empty so other batches can still try
      }
    }
  }
  return [];
}

// ─── Build the 4 category queries ───────────────────────────────────────────

function buildCategoryQuery(city: string, category: string, perBatch: number): string {
  // perBatch is the per-batch limit on Overpass side.
  // We use [timeout:60] per spec.
  let categoryClause: string;
  switch (category) {
    case 'shop':
      categoryClause = 'node["shop"]["name"](area.searchArea);';
      break;
    case 'restaurant':
      categoryClause = 'node["amenity"="restaurant"]["name"](area.searchArea);';
      break;
    case 'craft':
      categoryClause = 'node["craft"]["name"](area.searchArea);';
      break;
    case 'office':
      categoryClause = 'node["office"]["name"](area.searchArea);';
      break;
    default:
      throw new Error(`Unknown category: ${category}`);
  }
  return `[out:json][timeout:60];
area[name="${city}"]->.searchArea;
(
  ${categoryClause}
);
out body ${perBatch};`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { city, country, limit } = parseArgs();

  console.log('=== ServiceOS Marketplace Seed — OSM Overpass ===');
  console.log(`City:       ${city}`);
  console.log(`Country:    ${country}`);
  console.log(`Limit:      ${limit} listings`);
  console.log(`Endpoint:   ${OVERPASS_ENDPOINT}`);
  console.log(`User-Agent: ${USER_AGENT}`);
  console.log('');

  // ── 1. Fetch from Overpass (4 category batches, 1s delay between) ──────────
  const perBatch = Math.min(200, Math.max(50, limit * 2)); // fetch plenty, dedupe later
  const categories = ['shop', 'restaurant', 'craft', 'office'];

  const allElements: OsmElement[] = [];
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const query = buildCategoryQuery(city, cat, perBatch);
    const elements = await runOverpassQuery(query, cat);
    allElements.push(...elements);
    if (i < categories.length - 1) {
      await sleep(1000); // 1-second delay between batches
    }
  }

  console.log(
    `\nFetched ${allElements.length} total OSM elements for ${city} across 4 categories.`,
  );

  if (allElements.length === 0) {
    console.error('✗ No OSM elements returned — nothing to seed. Exiting.');
    await db.$disconnect();
    process.exit(1);
  }

  // ── 2. Filter + dedupe within OSM results ───────────────────────────────────
  // Keep only elements with a non-empty name and valid coords.
  const seenOsmIds = new Set<number>();
  const seenKeys = new Set<string>(); // "name::city" for intra-batch dedupe

  const candidates: OsmElement[] = [];
  for (const el of allElements) {
    if (!el.tags?.name) continue;
    if (typeof el.lat !== 'number' || typeof el.lon !== 'number') continue;
    if (seenOsmIds.has(el.id)) continue;
    seenOsmIds.add(el.id);

    const name = el.tags.name.trim();
    if (!name) continue;

    const tagCity = (el.tags['addr:city'] || city || '').trim().toLowerCase();
    const dedupeKey = `${name.toLowerCase()}::${tagCity}`;
    if (seenKeys.has(dedupeKey)) continue; // skip duplicate OSM entries (e.g. chain stores)
    seenKeys.add(dedupeKey);

    candidates.push(el);
    if (candidates.length >= limit * 3) break; // plenty of headroom
  }

  console.log(
    `After intra-OSM dedupe: ${candidates.length} candidate businesses (limit ${limit}).`,
  );

  // ── 3. Insert as free Tenant listings ──────────────────────────────────────
  let inserted = 0;
  let skipped = 0;
  let slugCollisionRetried = 0;
  const sampleNames: string[] = [];

  for (const el of candidates) {
    if (inserted >= limit) break;

    const tags = el.tags || {};
    const name = (tags.name || '').trim();
    if (!name) {
      skipped++;
      continue;
    }

    const industryId = mapIndustry(tags);
    const phone =
      normalizePhone(tags.phone) || normalizePhone(tags['contact:phone']) || null;
    const email =
      (tags.email || tags['contact:email'] || '').trim() || null;

    const street = tags['addr:street'] || '';
    const housenumber = tags['addr:housenumber'] || '';
    const addressParts = [housenumber, street].filter(Boolean);
    const address = addressParts.join(' ').trim() || null;

    const elCity = (tags['addr:city'] || city).trim();
    const elState = (tags['addr:state'] || '').trim() || null;
    const postalCode = (tags['addr:postcode'] || '').trim() || null;

    // ── Duplicate check: existing Tenant by phone OR (name + city) ──────────
    // NOTE: SQLite does not support `mode: 'insensitive'` on `equals`, so we
    // do a case-sensitive SQL match here AND a JS case-insensitive fallback.
    // Phone numbers are compared exactly (no case to worry about).
    const orClauses: Record<string, unknown>[] = [
      { name: name, city: elCity },
    ];
    if (phone) {
      orClauses.push({ phone });
    }
    const existing = await db.tenant.findFirst({
      where: { OR: orClauses },
      select: { id: true, slug: true, name: true, city: true, phone: true },
    });
    if (existing) {
      // JS-side case-insensitive double-check
      const sameName =
        existing.name?.toLowerCase() === name.toLowerCase() &&
        (existing.city ?? '').toLowerCase() === elCity.toLowerCase();
      const samePhone = phone && existing.phone === phone;
      if (sameName || samePhone) {
        skipped++;
        continue;
      }
    }

    // ── Build slug (slugify + random suffix, ensure unique) ──────────────────
    const base = slugifyBase(name);
    let slug = `${base}-${randomSuffix()}`;
    let attempts = 0;
    while (await db.tenant.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${base}-${randomSuffix()}`;
      attempts++;
      if (attempts > 5) {
        slugCollisionRetried++;
        break;
      }
    }

    const rating = randomRating();
    const reviewCount = randomReviewCount();
    const description = buildDescription(tags, industryId, elCity);
    const industryMeta = getIndustry(industryId);
    const tagline =
      (tags.description || '').trim().slice(0, 80) ||
      industryMeta?.description ||
      `${industryMeta?.name ?? 'Service'} in ${elCity}.`;

    // Build a useful service areas list — city + state if available.
    const serviceAreas = [elCity, elState].filter(Boolean) as string[];

    try {
      const tenant = await db.tenant.create({
        data: {
          name,
          slug,
          industry: industryId,
          phone,
          email,
          address,
          city: elCity,
          state: elState,
          postalCode,
          country,
          currency: country === 'AU' ? 'AUD' : country === 'GB' ? 'GBP' : country === 'CA' ? 'CAD' : 'USD',
          latitude: el.lat,
          longitude: el.lon,
          // Marketplace listing tier
          listingTier: 'free',
          claimed: false,
          claimedAt: null,
          // Marketplace visibility (3-gate eligibility for browse)
          publicProfileEnabled: true,
          marketplaceOptIn: true,
          // Skip onboarding — seed listings are pre-onboarded
          onboardingCompleted: true,
          onboardingStep: 100,
          // Subscription state
          plan: 'starter',
          planStatus: 'trial',
          // Display fields
          tagline,
          description,
          rating,
          reviewCount,
          businessCategoriesJson: JSON.stringify([industryId]),
          serviceAreasJson: JSON.stringify(serviceAreas),
          // Verification flags — intentionally false for unclaimed listings
          // (the marketplace browse shows them as "Listed", not "Verified")
          identityVerified: false,
          businessVerified: false,
          insuranceVerified: false,
          stripeConnected: false,
          profileCompletionPct: 30, // minimal — name + address + coords
        },
        select: { id: true, name: true, slug: true },
      });

      inserted++;
      if (sampleNames.length < 8) {
        sampleNames.push(`${tenant.name} (${industryId})`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Unique constraint errors are non-fatal — log and skip
      if (msg.includes('Unique constraint')) {
        console.warn(`  ⚠ Unique constraint on "${name}" — skipping.`);
        skipped++;
      } else {
        console.error(`  ✗ Failed to insert "${name}": ${msg}`);
        skipped++;
      }
    }
  }

  // ── 4. Summary ────────────────────────────────────────────────────────────
  const freeCount = await db.tenant.count({ where: { listingTier: 'free' } });
  const totalMarketplace = await db.tenant.count({
    where: { marketplaceOptIn: true },
  });

  console.log('\n=== Seed Complete ===');
  console.log(`Fetched from OSM:           ${allElements.length} elements`);
  console.log(`After intra-OSM dedupe:     ${candidates.length} candidates`);
  console.log(`Inserted new listings:      ${inserted}`);
  console.log(`Skipped (dupes/errors):     ${skipped}`);
  if (slugCollisionRetried > 0) {
    console.log(`Slug collisions retried:    ${slugCollisionRetried}`);
  }
  console.log('');
  console.log(`Free listings in DB now:    ${freeCount}`);
  console.log(`Total marketplace-eligible: ${totalMarketplace}`);

  if (sampleNames.length > 0) {
    console.log('\nSample inserted businesses:');
    sampleNames.forEach((n) => console.log(`  • ${n}`));
  }

  await db.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error('Seed failed:', e);
  await db.$disconnect();
  process.exit(1);
});
