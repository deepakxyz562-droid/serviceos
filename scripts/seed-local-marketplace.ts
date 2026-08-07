/**
 * seed-local-marketplace.ts
 *
 * Generates a LARGE synthetic marketplace dataset into the LOCAL SQLite DB
 * so we can reproduce + verify fixes for the marketplace issues locally:
 *
 *   - ~5,000 US providers across 12 industries and 15 cities
 *   - ~1,000 CA providers across 8 industries and 6 cities
 *   - Several industries intentionally have >1,000 records in US so we can
 *     verify the "1000 cap" bug in the counts endpoint is fixed.
 *   - Several cities have >500 records so city-wise counts are testable.
 *
 * All providers pass the marketplace eligibility gates:
 *   publicProfileEnabled=true, marketplaceOptIn=true, suspendedAt=null
 *
 * Idempotent: wipes + recreates only synthetic tenants (identified by
 * `settingsJson.seedSource = "local-synthetic"`).
 *
 * Usage:  bun run scripts/seed-local-marketplace.ts
 */

import { db } from '../src/lib/db';

// ─── Industry catalog (matches src/lib/industry-catalog.ts) ──────────────────
const INDUSTRIES = [
  'plumbing',
  'hvac',
  'electrical',
  'cleaning',
  'landscaping',
  'pest-control',
  'roofing',
  'painting',
  'locksmith',
  'appliance-repair',
  'pool-spa',
  'automotive',
] as const;

// ─── City distribution (US) — weights chosen so some cities have >500 ────────
const US_CITIES: { city: string; state: string; weight: number }[] = [
  { city: 'New York', state: 'NY', weight: 18 },
  { city: 'Los Angeles', state: 'CA', weight: 15 },
  { city: 'Chicago', state: 'IL', weight: 12 },
  { city: 'Houston', state: 'TX', weight: 12 },
  { city: 'Phoenix', state: 'AZ', weight: 8 },
  { city: 'Philadelphia', state: 'PA', weight: 8 },
  { city: 'San Antonio', state: 'TX', weight: 6 },
  { city: 'San Diego', state: 'CA', weight: 6 },
  { city: 'Dallas', state: 'TX', weight: 6 },
  { city: 'San Jose', state: 'CA', weight: 4 },
  { city: 'Austin', state: 'TX', weight: 4 },
  { city: 'Jacksonville', state: 'FL', weight: 3 },
  { city: 'Columbus', state: 'OH', weight: 2 },
  { city: 'Charlotte', state: 'NC', weight: 2 },
  { city: 'Seattle', state: 'WA', weight: 2 },
];

const CA_CITIES: { city: string; state: string; weight: number }[] = [
  { city: 'Toronto', state: 'ON', weight: 25 },
  { city: 'Montreal', state: 'QC', weight: 18 },
  { city: 'Vancouver', state: 'BC', weight: 15 },
  { city: 'Calgary', state: 'AB', weight: 12 },
  { city: 'Edmonton', state: 'AB', weight: 10 },
  { city: 'Ottawa', state: 'ON', weight: 10 },
  { city: 'Winnipeg', state: 'MB', weight: 5 },
  { city: 'Quebec City', state: 'QC', weight: 5 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[0];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 4): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const FIRST_WORDS = [
  'Apex', 'Blue', 'Crystal', 'Dynamic', 'Elite', 'Evergreen', 'Golden',
  'Grand', 'Harbor', 'Hometown', 'Honest', 'Instant', 'Iron', 'Legacy',
  'Metro', 'Midwest', 'Modern', 'NextDay', 'Northern', 'Oak', 'Pioneer',
  'Precision', 'Prime', 'Pro', 'Punctual', 'Reliable', 'Royal', 'Silver',
  'Skyline', 'Smart', 'Summit', 'Sunrise', 'Sunset', 'Superior', 'Swift',
  'Titan', 'Top', 'Trust', 'Unified', 'Urban', 'Vanguard', 'Vista',
  'Westside', 'Zenith', 'Aqua', 'Bright', 'Clear', 'Coastal', 'Daily',
  'Express', 'Fast', 'Friendly', 'Global', 'Highland', 'Keystone', 'Liberty',
];

const SECOND_WORDS = [
  'Plumbing', 'HVAC', 'Electric', 'Cleaning', 'Landscape', 'Pest',
  'Roofing', 'Painting', 'Locksmith', 'Appliance', 'Pool', 'Auto',
  'Services', 'Pros', 'Experts', 'Solutions', 'Brothers', 'Co', 'Group',
  'Works', 'Masters', 'Specialists', 'Contractors', 'Tech', 'Repair',
  'Home', 'Care', 'Pro', 'Team', 'and Sons', 'Company',
];

function generateName(industry: string): string {
  const w1 = randChoice(FIRST_WORDS);
  const w2 = randChoice(SECOND_WORDS);
  // Sometimes use the industry word, sometimes the generic second word
  return Math.random() > 0.5 ? `${w1} ${w2}` : `${w1} ${industry.charAt(0).toUpperCase() + industry.slice(1)} ${w2}`;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function makeSlug(name: string, salt: string): string {
  return `${slugify(name)}-${salt}`;
}

const TAGLINES = [
  'Your trusted local professional.',
  'Quality service, every time.',
  'Licensed, insured, and reliable.',
  'Serving the community since 1998.',
  'Fast, friendly, affordable.',
  'Your neighborhood expert.',
  'Punctual. Professional. Polite.',
  '24/7 emergency service available.',
];

const DESCRIPTIONS = [
  'We are a family-owned business serving local customers with pride. Our team of certified professionals delivers high-quality workmanship on every job, big or small. Contact us today for a free quote.',
  'With years of experience in the industry, we provide top-notch services to residential and commercial clients. Our commitment to excellence and customer satisfaction sets us apart.',
  'Professional, reliable, and affordable — that is our promise to you. We handle every project with care and precision, ensuring results you can trust.',
  'From small repairs to large installations, our skilled technicians have you covered. We use only the best materials and back our work with a satisfaction guarantee.',
];

// City coordinates (approximate centroids) for distance sort testing
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'New York': { lat: 40.7128, lng: -74.006 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  Chicago: { lat: 41.8781, lng: -87.6298 },
  Houston: { lat: 29.7604, lng: -95.3698 },
  Phoenix: { lat: 33.4484, lng: -112.074 },
  Philadelphia: { lat: 39.9526, lng: -75.1652 },
  'San Antonio': { lat: 29.4241, lng: -98.4936 },
  'San Diego': { lat: 32.7157, lng: -117.1611 },
  Dallas: { lat: 32.7767, lng: -96.797 },
  'San Jose': { lat: 37.3382, lng: -121.8863 },
  Austin: { lat: 30.2672, lng: -97.7431 },
  Jacksonville: { lat: 30.3322, lng: -81.6557 },
  Columbus: { lat: 39.9612, lng: -82.9988 },
  Charlotte: { lat: 35.2271, lng: -80.8431 },
  Seattle: { lat: 47.6062, lng: -122.3321 },
  Toronto: { lat: 43.6532, lng: -79.3832 },
  Montreal: { lat: 45.5017, lng: -73.5673 },
  Vancouver: { lat: 49.2827, lng: -123.1207 },
  Calgary: { lat: 51.0447, lng: -114.0719 },
  Edmonton: { lat: 53.5461, lng: -113.4938 },
  Ottawa: { lat: 45.4215, lng: -75.6972 },
  Winnipeg: { lat: 49.8951, lng: -97.1384 },
  'Quebec City': { lat: 46.8139, lng: -71.208 },
};

interface GeneratedTenant {
  id: string;
  name: string;
  slug: string;
  industry: string;
  phone: string;
  email: string | null;
  website: string | null;
  address: string;
  country: string;
  currency: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
  plan: string;
  marketplaceOptIn: boolean;
  publicProfileEnabled: boolean;
  listingTier: string;
  claimed: boolean;
  rating: number;
  reviewCount: number;
  tagline: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  businessCategoriesJson: string;
  settingsJson: string;
  employeesCount: number;
  googlePlaceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function generateTenant(
  index: number,
  country: 'US' | 'CA',
): GeneratedTenant {
  const cities = country === 'US' ? US_CITIES : CA_CITIES;
  const cityInfo = pickWeighted(cities);
  const coords = CITY_COORDS[cityInfo.city] ?? { lat: 0, lng: 0 };
  const industry = randChoice(INDUSTRIES);
  const name = generateName(industry);
  const salt = Math.random().toString(36).slice(2, 8);
  const slug = makeSlug(name, salt);
  const rating = parseFloat((Math.random() * 2 + 3).toFixed(1)); // 3.0 - 5.0
  const reviewCount = randInt(1, 320);
  const id = `syn-${country.toLowerCase()}-${index.toString().padStart(6, '0')}`;
  const now = new Date();

  const phone =
    country === 'US'
      ? `+1 ${randInt(200, 989)}-${randInt(200, 989)}-${randInt(1000, 9999)}`
      : `+1 ${randInt(200, 989)}-${randInt(200, 989)}-${randInt(1000, 9999)}`;

  const postalCode =
    country === 'US'
      ? `${randInt(10001, 99999)}`
      : `${randChoice(['M', 'T', 'V', 'H', 'K', 'L', 'R', 'S'])}${randInt(1, 9)}A${randInt(1, 9)} ${randInt(1, 9)}A${randInt(1, 9)}`;

  const email = Math.random() > 0.3
    ? `info@${slug}.com`
    : null;
  const website = Math.random() > 0.2 ? `https://${slug}.com` : null;

  return {
    id,
    name,
    slug,
    industry,
    phone,
    email,
    website,
    address: `${randInt(100, 9999)} ${randChoice(['Main', 'Oak', 'Pine', 'Maple', 'Cedar', 'Park', 'Elm', 'High'])} ${randChoice(['St', 'Ave', 'Blvd', 'Dr', 'Rd'])}, ${cityInfo.city}, ${cityInfo.state} ${postalCode}`,
    country,
    currency: country === 'US' ? 'USD' : 'CAD',
    city: cityInfo.city,
    state: cityInfo.state,
    postalCode,
    latitude: coords.lat + randFloat(-0.15, 0.15),
    longitude: coords.lng + randFloat(-0.15, 0.15),
    serviceRadiusKm: randChoice([15, 20, 25, 30, 40, 50]),
    plan: randChoice(['business', 'business', 'business', 'starter', 'enterprise']),
    marketplaceOptIn: true,
    publicProfileEnabled: true,
    listingTier: randChoice(['none', 'none', 'none', 'free', 'free', 'featured']),
    claimed: Math.random() > 0.7,
    rating,
    reviewCount,
    tagline: `${name} — ${industry} in ${cityInfo.city}`,
    description: randChoice(DESCRIPTIONS),
    seoTitle: `${name} — ${industry} in ${cityInfo.city} | Fieseros`,
    seoDescription: `Book ${name} for ${industry} services in ${cityInfo.city}. Professional, reliable, and trusted by local customers. Rated ${rating}★ (${reviewCount} reviews).`,
    businessCategoriesJson: JSON.stringify([industry]),
    settingsJson: JSON.stringify({
      seededAt: now.toISOString(),
      seedSource: 'local-synthetic',
    }),
    employeesCount: randChoice([1, 2, 3, 5, 8, 12, 20, 35]),
    googlePlaceId: null,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Local Marketplace Seed ===\n');

  // 1. Wipe previously-seeded synthetic tenants
  console.log('1. Deleting previously-seeded synthetic tenants...');
  const deleted = await db.tenant.deleteMany({
    where: { settingsJson: { contains: '"seedSource":"local-synthetic"' } },
  });
  console.log(`   Deleted ${deleted.count} old synthetic tenants`);

  // 2. Generate US tenants (~5000)
  const US_COUNT = 5000;
  const CA_COUNT = 1000;
  console.log(`\n2. Generating ${US_COUNT} US + ${CA_COUNT} CA tenants in memory...`);
  const tenants: GeneratedTenant[] = [];
  for (let i = 0; i < US_COUNT; i++) tenants.push(generateTenant(i, 'US'));
  for (let i = 0; i < CA_COUNT; i++) tenants.push(generateTenant(i, 'CA'));
  console.log(`   Generated ${tenants.length} tenants`);

  // 3. Insert in batches of 500 using createMany (fast)
  console.log('\n3. Inserting in batches of 500...');
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < tenants.length; i += BATCH) {
    const batch = tenants.slice(i, i + BATCH);
    await db.tenant.createMany({
      data: batch.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        industry: t.industry,
        phone: t.phone,
        email: t.email,
        website: t.website,
        address: t.address,
        country: t.country,
        currency: t.currency,
        city: t.city,
        state: t.state,
        postalCode: t.postalCode,
        latitude: t.latitude,
        longitude: t.longitude,
        serviceRadiusKm: t.serviceRadiusKm,
        plan: t.plan,
        marketplaceOptIn: t.marketplaceOptIn,
        publicProfileEnabled: t.publicProfileEnabled,
        listingTier: t.listingTier,
        claimed: t.claimed,
        rating: t.rating,
        reviewCount: t.reviewCount,
        tagline: t.tagline,
        description: t.description,
        seoTitle: t.seoTitle,
        seoDescription: t.seoDescription,
        businessCategoriesJson: t.businessCategoriesJson,
        settingsJson: t.settingsJson,
        employeesCount: t.employeesCount,
        googlePlaceId: t.googlePlaceId,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
    inserted += batch.length;
    if (inserted % 1000 === 0 || inserted === tenants.length) {
      console.log(`   Inserted ${inserted}/${tenants.length}`);
    }
  }

  // 4. Verify counts
  console.log('\n4. Verifying counts...');
  const where = { publicProfileEnabled: true, marketplaceOptIn: true, suspendedAt: null };
  const total = await db.tenant.count({ where });
  const usTotal = await db.tenant.count({ where: { ...where, country: 'US' } });
  const caTotal = await db.tenant.count({ where: { ...where, country: 'CA' } });
  console.log(`   TOTAL eligible: ${total}`);
  console.log(`   US: ${usTotal}, CA: ${caTotal}`);

  console.log('\n   US by industry:');
  const usByInd = await db.tenant.groupBy({
    by: ['industry'],
    _count: { _all: true },
    where: { ...where, country: 'US' },
    orderBy: { _count: { industry: 'desc' } },
  });
  usByInd.forEach((r) => console.log(`     ${r.industry}: ${r._count._all}`));

  console.log('\n   US by city (top 5):');
  const usByCity = await db.tenant.groupBy({
    by: ['city'],
    _count: { _all: true },
    where: { ...where, country: 'US' },
    orderBy: { _count: { city: 'desc' } },
    take: 5,
  });
  usByCity.forEach((r) => console.log(`     ${r.city}: ${r._count._all}`));

  console.log('\n   New York by industry:');
  const nyByInd = await db.tenant.groupBy({
    by: ['industry'],
    _count: { _all: true },
    where: { ...where, country: 'US', city: 'New York' },
    orderBy: { _count: { industry: 'desc' } },
  });
  nyByInd.forEach((r) => console.log(`     ${r.industry}: ${r._count._all}`));

  console.log('\n=== Seed complete ===');
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await db.$disconnect();
    process.exit(1);
  });
