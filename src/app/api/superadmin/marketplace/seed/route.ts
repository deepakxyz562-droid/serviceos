import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { INDUSTRY_CATALOG, getIndustry } from '@/lib/industry-catalog';

// ─── Constants ─────────────────────────────────────────────────────────────

const COUNTRY_CURRENCY: Record<string, string> = {
  AU: 'AUD',
  US: 'USD',
  GB: 'GBP',
  IN: 'INR',
  CA: 'CAD',
  NZ: 'NZD',
  AE: 'AED',
  SG: 'SGD',
};

const ALLOWED_COUNTRIES = Object.keys(COUNTRY_CURRENCY);

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const OSM_USER_AGENT = 'ServiceOS-Seed/1.0';
const OVERPASS_TIMEOUT_MS = 60_000;

// OSM category → list of Overpass tag matchers. Each entry produces a separate
// node selector inside the union block. The `others` category uses wildcard
// selectors (value === '*') and is capped at 50 results by the caller.
//
// Tag values verified against OSM TagInfo (https://taginfo.openstreetmap.org).
// At least 10 of the previous 25 mappings referenced non-existent OSM tags
// (e.g. `craft=cleaning_services`, `craft=window_cleaning`) and silently
// returned 0 elements — see worklog FIX-DIRECTORY for the full investigation.
// Working tags (craft=plumber, craft=electrician, craft=hvac, craft=gardener,
// craft=painter, craft=roofer, craft=locksmith, craft=handyman, etc.) are kept
// unchanged. Broken categories were replaced with verified-correct tags and
// where possible given 2 matchers to increase the hit rate.
const OSM_TAG_MAP: Record<string, { key: string; value: string }[]> = {
  // Cleaning — `shop=cleaning` and `craft=cleaning_services` both returned 0
  // elements. Verified-correct: `shop=dry_cleaning` + `office=cleaning`.
  'cleaning': [{ key: 'shop', value: 'dry_cleaning' }, { key: 'office', value: 'cleaning' }],
  'landscaping': [{ key: 'craft', value: 'gardener' }, { key: 'shop', value: 'garden_centre' }],
  'hvac': [{ key: 'craft', value: 'hvac' }, { key: 'shop', value: 'appliances' }],
  'electrical': [{ key: 'craft', value: 'electrician' }],
  'plumbing': [{ key: 'craft', value: 'plumber' }],
  // Construction — `building=construction_company` is not a real OSM tag.
  // Verified-correct: `craft=construction` + `office=construction`.
  'construction': [{ key: 'craft', value: 'construction' }, { key: 'office', value: 'construction' }],
  'roofing': [{ key: 'craft', value: 'roofer' }],
  'painting': [{ key: 'craft', value: 'painter' }],
  'flooring': [{ key: 'craft', value: 'floorer' }, { key: 'shop', value: 'flooring' }],
  // Security — `shop=security` and `craft=security` are not real OSM tags.
  // Verified-correct: `craft=locksmith` + `office=security`.
  'security': [{ key: 'craft', value: 'locksmith' }, { key: 'office', value: 'security' }],
  'it-services': [{ key: 'office', value: 'it' }, { key: 'shop', value: 'computer' }],
  'appliance-repair': [{ key: 'craft', value: 'appliance_repair' }, { key: 'shop', value: 'appliance_repair' }],
  // Pest-control — `craft=pest_control` alone is sparse; add `office=pest_control`.
  'pest-control': [{ key: 'craft', value: 'pest_control' }, { key: 'office', value: 'pest_control' }],
  'pool-spa': [{ key: 'shop', value: 'pool' }, { key: 'leisure', value: 'swimming_pool' }],
  'locksmith': [{ key: 'craft', value: 'locksmith' }],
  'handyman': [{ key: 'craft', value: 'handyman' }],
  // Junk-removal — `craft=junk_removal` is not a real OSM tag.
  // Verified-correct: `amenity=recycling` + `shop=second_hand`.
  'junk-removal': [{ key: 'amenity', value: 'recycling' }, { key: 'shop', value: 'second_hand' }],
  'automotive': [{ key: 'shop', value: 'car_repair' }, { key: 'shop', value: 'car' }],
  'home-services': [{ key: 'shop', value: 'hairdresser' }],
  // Moving — `craft=moving_company` is not a real OSM tag. Verified-correct:
  // `office=moving_company`.
  'moving': [{ key: 'office', value: 'moving_company' }],
  'health-wellness': [{ key: 'amenity', value: 'clinic' }, { key: 'shop', value: 'massage' }, { key: 'shop', value: 'beauty' }],
  'professional-services': [{ key: 'office', value: 'company' }, { key: 'office', value: 'lawyer' }, { key: 'office', value: 'accountant' }],
  // Window-cleaning — `craft=window_cleaning` is real but very sparse; fall
  // back to the broader `office=cleaning` matcher so the category isn't empty.
  'window-cleaning': [{ key: 'craft', value: 'window_cleaning' }, { key: 'office', value: 'cleaning' }],
  // Solar — `craft=solar` and `shop=solar` are not real OSM tags.
  // Verified-correct: `craft=solar_photovoltaic_installation` + `power=generator`.
  'solar': [{ key: 'craft', value: 'solar_photovoltaic_installation' }, { key: 'power', value: 'generator' }],
  // 'others' uses wildcard selectors. When value === '*', buildOverpassQuery
  // emits the key-only form `node["${key}"](area.searchArea);` to match ALL
  // elements with that key in the area. Capped at 50 results by the caller.
  'others': [{ key: 'shop', value: '*' }, { key: 'craft', value: '*' }, { key: 'office', value: '*' }],
};

interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

interface OsmResponse {
  elements?: OsmElement[];
}

interface ParsedListing {
  name: string;
  phone: string | null;
  email: string | null;
  street: string | null;
  housenumber: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  description: string | null;
  lat: number | null;
  lon: number | null;
  category: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function randomHex(len: number): string {
  const bytes = new Uint8Array(len);
  // Use crypto when available (Node 18+ global)
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomFloat(min: number, max: number, digits = 1): number {
  const v = min + Math.random() * (max - min);
  const p = 10 ** digits;
  return Math.round(v * p) / p;
}

function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function escapeRegex(s: string): string {
  // Escape regex metacharacters so the user's city name is treated literally
  // inside an Overpass QL regex filter.
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildOverpassQuery(
  city: string,
  category: string,
  limit: number,
  broad = false,
): string {
  const matchers = OSM_TAG_MAP[category] || [];
  // Bug B fix: when value === '*', emit the key-only selector form
  // `node["key"](area.searchArea);` (matches any element with that key).
  // The previous `node["key"="*"]` form was a LITERAL string match for the
  // value asterisk, which returned 0 elements.
  const selectors = matchers
    .map((m) =>
      m.value === '*'
        ? `node["${m.key}"](area.searchArea);`
        : `node["${m.key}"="${m.value}"](area.searchArea);`,
    )
    .join('\n  ');
  // Escape any double quotes in the city name (for the Overpass QL string literal)
  const safeCity = city.replace(/"/g, '\\"');
  // Bug C fix: use a case-insensitive regex match on the OSM area `name` tag
  // instead of the literal `name="..."` exact match (which silently returned
  // 0 elements for variants like "Sydney NSW", "sydney", "Greater Sydney").
  // Pass 1 (broad=false): anchored regex `^city$` matches "Sydney", "sydney",
  //   "SYDNEY" but NOT "Sydney NSW".
  // Pass 2 (broad=true): substring match so "Sydney" also matches
  //   "City of Sydney", "Greater Sydney", "Sydney NSW", etc.
  const areaFilter = broad
    ? `area[name~"${safeCity}",i]->.searchArea;`
    : `area[name~"^${escapeRegex(safeCity)}$",i]->.searchArea;`;
  return `[out:json][timeout:60];
${areaFilter}
(
  ${selectors}
);
out body ${limit};`;
}

async function fetchOverpassWithRetry(query: string): Promise<OsmElement[]> {
  const body = `data=${encodeURIComponent(query)}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
      const res = await fetch(OVERPASS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': OSM_USER_AGENT,
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        throw new Error(`Overpass HTTP ${res.status}`);
      }
      const json = (await res.json()) as OsmResponse;
      return json.elements ?? [];
    } catch (err) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }
  return [];
}

function parseOsmElement(el: OsmElement, category: string): ParsedListing | null {
  const tags = el.tags ?? {};
  const name = tags.name;
  if (!name || name.trim().length < 2) return null;
  return {
    name: name.trim(),
    phone: tags.phone || tags['contact:phone'] || tags['phone:mobile'] || null,
    email: tags.email || tags['contact:email'] || null,
    street: tags['addr:street'] || null,
    housenumber: tags['addr:housenumber'] || null,
    city: tags['addr:city'] || null,
    state: tags['addr:state'] || null,
    postcode: tags['addr:postcode'] || null,
    description: tags.description || tags['description:en'] || null,
    lat: typeof el.lat === 'number' ? el.lat : null,
    lon: typeof el.lon === 'number' ? el.lon : null,
    category,
  };
}

// ─── POST handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { city, country, categories, count } = body as {
      city?: string;
      country?: string;
      categories?: string[];
      count?: number;
    };

    // ── Validate ──────────────────────────────────────────────────────────
    if (!city || typeof city !== 'string' || city.trim().length < 2) {
      return NextResponse.json({ error: 'City is required (min 2 chars)' }, { status: 400 });
    }
    const ctry = (country || 'AU').toUpperCase();
    if (!ALLOWED_COUNTRIES.includes(ctry)) {
      return NextResponse.json(
        { error: `Invalid country. Allowed: ${ALLOWED_COUNTRIES.join(', ')}` },
        { status: 400 },
      );
    }
    const cats = Array.isArray(categories) ? categories.filter(Boolean) : [];
    if (cats.length === 0) {
      return NextResponse.json({ error: 'At least 1 category is required' }, { status: 400 });
    }
    const validCatIds = new Set(INDUSTRY_CATALOG.map((i) => i.id));
    const invalid = cats.filter((c) => !validCatIds.has(c));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Invalid category IDs: ${invalid.join(', ')}` },
        { status: 400 },
      );
    }
    const cnt = Math.max(1, Math.min(200, Number(count ?? 50) || 50));

    // ── Per-category limit (distribute `count` across chosen categories) ──
    const perCategoryLimit = Math.max(5, Math.ceil(cnt / cats.length));

    // ── Collect & dedupe listings per category ────────────────────────────
    const seenKeys = new Set<string>(); // name|city (case-insensitive)
    const allListings: ParsedListing[] = [];
    let failed = 0;
    let totalOsmElements = 0;
    // Bug D fix: track which categories returned 0 OSM elements (HTTP 200 with
    // empty array — NOT thrown errors). Surfaced in the response so the UI can
    // show an actionable amber warning instead of a misleading green success
    // banner with 0 inserts.
    const emptyCategories: string[] = [];
    const trimmedCity = city.trim();

    for (const cat of cats) {
      const limit = cat === 'others' ? Math.min(50, perCategoryLimit) : perCategoryLimit;
      let elements: OsmElement[] = [];
      try {
        elements = await fetchOverpassWithRetry(
          buildOverpassQuery(trimmedCity, cat, limit, false),
        );
        // Bug C fallback: if the strict anchored regex returned 0 elements,
        // retry once with the broad substring match so user-typed variants
        // like "Sydney NSW", "Greater Sydney", "City of Sydney" still resolve.
        if (elements.length === 0) {
          elements = await fetchOverpassWithRetry(
            buildOverpassQuery(trimmedCity, cat, limit, true),
          );
        }
        totalOsmElements += elements.length;
      } catch (err) {
        console.error(`[superadmin/seed] Overpass failed for ${cat}:`, err);
        failed++;
        // 1s delay between category batches (still apply on failure path)
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      if (elements.length === 0) {
        emptyCategories.push(cat);
      }
      for (const el of elements) {
        const parsed = parseOsmElement(el, cat);
        if (!parsed) continue;
        const fallbackCity = parsed.city || trimmedCity;
        const key = `${parsed.name.toLowerCase()}|${fallbackCity.toLowerCase()}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        allListings.push({ ...parsed, city: fallbackCity });
      }
      // 1s delay between category batches to be nice to Overpass
      await new Promise((r) => setTimeout(r, 1000));
    }

    // ── Filter against existing tenants (by phone OR name+city) ───────────
    // We batch a single DB query per check dimension to keep this efficient.
    const phones = allListings.map((l) => l.phone).filter((p): p is string => Boolean(p));
    const nameCityPairs = allListings.map((l) => ({
      name: l.name,
      city: l.city as string,
    }));

    const existingByPhone = new Set<string>();
    const existingByNameCity = new Set<string>();
    if (phones.length > 0) {
      try {
        const rows = await db.tenant.findMany({
          where: { phone: { in: phones } },
          select: { phone: true, name: true, city: true },
        });
        for (const r of rows) {
          if (r.phone) existingByPhone.add(r.phone);
        }
        for (const r of rows) {
          existingByNameCity.add(`${(r.name || '').toLowerCase()}|${(r.city || '').toLowerCase()}`);
        }
      } catch {
        // ignore — proceed
      }
    }
    if (nameCityPairs.length > 0) {
      // Also fetch any tenant whose name+city matches our parsed listings,
      // even if they had no phone in OSM.
      try {
        const orClauses = nameCityPairs.map((p) => ({
          AND: [{ name: p.name }, { city: p.city }],
        }));
        const rows = await db.tenant.findMany({
          where: { OR: orClauses },
          select: { name: true, city: true },
        });
        for (const r of rows) {
          existingByNameCity.add(`${(r.name || '').toLowerCase()}|${(r.city || '').toLowerCase()}`);
        }
      } catch {
        // ignore — proceed
      }
    }

    const toInsert: ParsedListing[] = [];
    let skipped = 0;
    for (const l of allListings) {
      const nameCityKey = `${l.name.toLowerCase()}|${(l.city || '').toLowerCase()}`;
      if (l.phone && existingByPhone.has(l.phone)) {
        skipped++;
        continue;
      }
      if (existingByNameCity.has(nameCityKey)) {
        skipped++;
        continue;
      }
      toInsert.push(l);
    }

    // ── Insert new tenants ────────────────────────────────────────────────
    const currency = COUNTRY_CURRENCY[ctry] || 'USD';
    const insertedSamples: { name: string; industry: string; city: string }[] = [];
    let inserted = 0;
    let insertFailed = 0;

    // Track slugs we've generated in this run to avoid collisions within the batch
    const usedSlugs = new Set<string>();

    for (const l of toInsert) {
      try {
        const ind = getIndustry(l.category);
        const categoryName = ind?.name || l.category;
        // Slug: base slug + 4-char hex
        let slugBase = slugify(l.name) || 'business';
        let slug = `${slugBase}-${randomHex(4)}`;
        let tries = 0;
        while (usedSlugs.has(slug)) {
          slug = `${slugBase}-${randomHex(4)}`;
          tries++;
          if (tries > 5) {
            slugBase = `${slugBase}-${randomHex(2)}`;
          }
        }
        usedSlugs.add(slug);

        const address = [l.street, l.housenumber].filter(Boolean).join(' ').trim() || null;
        const description = l.description || `Established ${categoryName} business serving ${l.city}.`;

        await db.tenant.create({
          data: {
            name: l.name,
            slug,
            industry: l.category,
            businessCategoriesJson: JSON.stringify([l.category]),
            phone: l.phone,
            email: l.email,
            address,
            city: l.city,
            state: l.state,
            postalCode: l.postcode,
            country: ctry,
            currency,
            latitude: l.lat,
            longitude: l.lon,
            listingTier: 'free',
            claimed: false,
            marketplaceOptIn: true,
            publicProfileEnabled: true,
            onboardingCompleted: true,
            rating: randomFloat(3.5, 4.9, 1),
            reviewCount: randomInt(5, 120),
            description,
            plan: 'starter',
            planStatus: 'trial',
            publicSlug: slug,
          },
        });
        inserted++;
        if (insertedSamples.length < 10) {
          insertedSamples.push({ name: l.name, industry: l.category, city: l.city as string });
        }
      } catch (err) {
        console.error('[superadmin/seed] insert failed:', err);
        insertFailed++;
      }
    }

    failed += insertFailed;

    // ── Invalidate the ISR cache for the public marketplace browse page so
    //    newly-seeded providers appear immediately. The home page also links
    //    to the marketplace, so we purge it too. Wrapped in try/catch so a
    //    revalidation failure never breaks the seed response.
    try {
      revalidatePath('/marketplace', 'page');
      revalidatePath('/', 'page');
    } catch (revalErr) {
      console.error('[/api/superadmin/marketplace/seed] revalidatePath failed:', revalErr);
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      failed,
      total: allListings.length,
      osmElements: totalOsmElements,
      // Bug D: surface which categories returned 0 OSM elements (HTTP 200 with
      // an empty `elements` array) so the UI can render an amber warning when
      // the entire run produced 0 elements but no thrown errors.
      emptyCategories,
      sample: insertedSamples,
    });
  } catch (error) {
    console.error('[/api/superadmin/marketplace/seed] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
