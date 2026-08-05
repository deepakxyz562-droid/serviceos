#!/usr/bin/env bun
/**
 * Google Places Marketplace Seed Script
 *
 * Fetches real business data from Google Places API (Text Search) across
 * 4 countries (US/CA/GB/AU) and 15 service categories, scrapes their
 * websites for email + description, and generates a Supabase-compatible
 * SQL file with INSERT statements.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * USAGE
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   # Test run (5 records, 1 query)
 *   bun run scripts/google-places-seed.ts --test
 *
 *   # Batch 1: US, 1000 records
 *   bun run scripts/google-places-seed.ts --batch 1
 *
 *   # Specific country + limit
 *   bun run scripts/google-places-seed.ts --country US --limit 500
 *
 * ───────────────────────────────────────────────────────────────────────────
 * OUTPUT
 * ───────────────────────────────────────────────────────────────────────────
 *
 *   prisma/seed-sql/google/test-5.sql
 *   prisma/seed-sql/google/01-us-1000.sql
 *   prisma/seed-sql/google/02-ca-1000.sql
 *   ...
 *
 * Each SQL file is wrapped in BEGIN/COMMIT and uses
 *   INSERT ... ON CONFLICT ("googlePlaceId") DO NOTHING
 * so it is safe to re-run.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUOTA TRACKING
 * ───────────────────────────────────────────────────────────────────────────
 *
 * After each batch, prints:
 *   - API requests used this batch
 *   - Cumulative API requests
 *   - Estimated cost (cumulative)
 *   - Free credit remaining ($200 - cost)
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { searchTextAllPages, type GooglePlace } from '../src/lib/google-places-client';
import { scrapeWebsite } from '../src/lib/website-scraper';
import { mapPlaceToTenant, type MappedTenant } from '../src/lib/google-places-to-tenant';

// ─── Configuration ──────────────────────────────────────────────────────────

const COUNTRY_CITIES: Record<string, string[]> = {
  US: [
    'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
    'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'Austin, TX',
    'San Jose, CA', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC',
    'San Francisco, CA', 'Seattle, WA', 'Denver, CO', 'Boston, MA', 'Nashville, TN',
  ],
  CA: [
    'Toronto, ON', 'Montreal, QC', 'Vancouver, BC', 'Calgary, AB', 'Edmonton, AB',
    'Ottawa, ON', 'Winnipeg, MB', 'Quebec City, QC', 'Hamilton, ON', 'Halifax, NS',
  ],
  GB: [
    'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow',
    'Liverpool', 'Bristol', 'Sheffield', 'Edinburgh', 'Cardiff',
  ],
  AU: [
    'Sydney, NSW', 'Melbourne, VIC', 'Brisbane, QLD', 'Perth, WA', 'Adelaide, SA',
    'Gold Coast, QLD', 'Newcastle, NSW', 'Canberra, ACT', 'Sunshine Coast, QLD', 'Hobart, TAS',
  ],
};

interface CategoryDef {
  /** Our internal industry ID */
  industry: string;
  /** Google Text Search query template ({city} replaced) */
  query: string;
}

const CATEGORIES: CategoryDef[] = [
  { industry: 'landscaping', query: 'landscaping contractor in {city}' },
  { industry: 'hvac', query: 'hvac contractor in {city}' },
  { industry: 'electrical', query: 'electrician in {city}' },
  { industry: 'plumbing', query: 'plumber in {city}' },
  { industry: 'pest-control', query: 'pest control service in {city}' },
  { industry: 'cleaning', query: 'house cleaning service in {city}' },
  { industry: 'cleaning', query: 'maid service in {city}' },
  { industry: 'roofing', query: 'roofing contractor in {city}' },
  { industry: 'window-cleaning', query: 'window cleaning service in {city}' },
  { industry: 'painting', query: 'painting contractor in {city}' },
  { industry: 'handyman', query: 'handyman service in {city}' },
  { industry: 'construction', query: 'garage door repair in {city}' },
  { industry: 'appliance-repair', query: 'appliance repair service in {city}' },
  { industry: 'flooring', query: 'flooring contractor in {city}' },
  { industry: 'landscaping', query: 'tree service in {city}' },
];

const REGION_CODE: Record<string, string> = {
  US: 'us', CA: 'ca', GB: 'gb', AU: 'au',
};

const BATCH_TO_COUNTRY: Record<number, string> = {
  1: 'US',
  2: 'CA',
  3: 'GB',
  4: 'AU',
  5: 'US', // top-up — extra US cities
};

const PROGRESS_FILE = path.join(process.cwd(), 'scripts', 'google-places-seed-progress.json');
const OUTPUT_DIR = path.join(process.cwd(), 'prisma', 'seed-sql', 'google');
const QUOTA_STATE_FILE = path.join(process.cwd(), 'scripts', 'google-places-quota.json');

const PRICE_PER_1000 = 32; // USD
const FREE_CREDIT = 200; // USD

// ─── Progress / Quota State ──────────────────────────────────────────────────

interface ProgressState {
  /** Set of "country|googlePlaceId" already seeded — for resumability. */
  seenPlaceIds: string[];
  /** Set of "country|query" already executed — for resumability. */
  completedQueries: string[];
}

interface QuotaState {
  totalRequests: number;
  totalRecords: number;
  totalCost: number;
  byBatch: Record<number, { requests: number; records: number; cost: number }>;
}

async function loadProgress(): Promise<ProgressState> {
  if (!existsSync(PROGRESS_FILE)) {
    return { seenPlaceIds: [], completedQueries: [] };
  }
  try {
    const raw = await readFile(PROGRESS_FILE, 'utf-8');
    return JSON.parse(raw) as ProgressState;
  } catch {
    return { seenPlaceIds: [], completedQueries: [] };
  }
}

async function saveProgress(state: ProgressState): Promise<void> {
  await writeFile(PROGRESS_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

async function loadQuota(): Promise<QuotaState> {
  if (!existsSync(QUOTA_STATE_FILE)) {
    return { totalRequests: 0, totalRecords: 0, totalCost: 0, byBatch: {} };
  }
  try {
    const raw = await readFile(QUOTA_STATE_FILE, 'utf-8');
    return JSON.parse(raw) as QuotaState;
  } catch {
    return { totalRequests: 0, totalRecords: 0, totalCost: 0, byBatch: {} };
  }
}

async function saveQuota(state: QuotaState): Promise<void> {
  await writeFile(QUOTA_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

// ─── SQL Generation ──────────────────────────────────────────────────────────

/** Escape a string for use in a SQL string literal (Postgres/Supabase). */
function sqlEscape(s: string | null | undefined): string {
  if (s === null || s === undefined) return 'NULL';
  return `'${s.replace(/'/g, "''").replace(/\\/g, '\\\\').slice(0, 2000)}'`;
}

function sqlBool(b: boolean): string {
  return b ? 'true' : 'false';
}

function sqlNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return 'NULL';
  return String(n);
}

/** Generate a single INSERT statement for a MappedTenant. */
function tenantToSql(t: MappedTenant): string {
  const cols = [
    'id', 'name', 'slug', 'industry', 'phone', 'email', 'website', 'address',
    'country', 'currency', 'city', 'state', 'postalCode', 'latitude', 'longitude',
    'serviceRadiusKm', 'plan', 'marketplaceOptIn', 'publicProfileEnabled',
    'listingTier', 'claimed', 'rating', 'reviewCount', 'tagline', 'description',
    'seoTitle', 'seoDescription', 'businessCategoriesJson', 'settingsJson',
    'employeesCount', 'googlePlaceId',
  ];

  const vals = [
    sqlEscape(t.id), sqlEscape(t.name), sqlEscape(t.slug), sqlEscape(t.industry),
    sqlEscape(t.phone), sqlEscape(t.email), sqlEscape(t.website), sqlEscape(t.address),
    sqlEscape(t.country), sqlEscape(t.currency), sqlEscape(t.city), sqlEscape(t.state),
    sqlEscape(t.postalCode), sqlNum(t.latitude), sqlNum(t.longitude),
    sqlNum(t.serviceRadiusKm), sqlEscape(t.plan), sqlBool(t.marketplaceOptIn),
    sqlBool(t.publicProfileEnabled), sqlEscape(t.listingTier), sqlBool(t.claimed),
    sqlNum(t.rating), sqlNum(t.reviewCount), sqlEscape(t.tagline), sqlEscape(t.description),
    sqlEscape(t.seoTitle), sqlEscape(t.seoDescription), sqlEscape(t.businessCategoriesJson),
    sqlEscape(t.settingsJson), sqlNum(t.employeesCount), sqlEscape(t.googlePlaceId),
  ];

  return `INSERT INTO "Tenant" (${cols.map((c) => `"${c}"`).join(', ')})\n  VALUES (${vals.join(', ')})\n  ON CONFLICT ("googlePlaceId") DO NOTHING;`;
}

/** Wrap INSERTs in a transaction with a header comment. */
function buildSqlFile(tenants: MappedTenant[], batchLabel: string): string {
  const header = [
    `-- ───────────────────────────────────────────────────────────────────────────`,
    `-- ${batchLabel}`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Records: ${tenants.length}`,
    `-- Source: Google Places API (Text Search) + website scraping`,
    `-- Idempotent: ON CONFLICT ("googlePlaceId") DO NOTHING`,
    `-- Run in Supabase SQL Editor (paste entire file, click Run)`,
    `-- ───────────────────────────────────────────────────────────────────────────`,
    ``,
    `BEGIN;`,
    ``,
  ].join('\n');

  const inserts = tenants.map(tenantToSql).join('\n\n');

  const footer = `\n\nCOMMIT;\n`;

  return header + inserts + footer;
}

// ─── Main Seed Logic ─────────────────────────────────────────────────────────

interface SeedOptions {
  test?: boolean;
  batch?: number;
  country?: string;
  limit?: number;
  outputFile?: string;
}

function parseArgs(): SeedOptions {
  const args = process.argv.slice(2);
  const opts: SeedOptions = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--test') opts.test = true;
    else if (a === '--batch') opts.batch = parseInt(args[++i], 10);
    else if (a === '--country') opts.country = args[++i]?.toUpperCase();
    else if (a === '--limit') opts.limit = parseInt(args[++i], 10);
    else if (a === '--out') opts.outputFile = args[++i];
  }
  return opts;
}

interface SeedResult {
  tenants: MappedTenant[];
  apiRequests: number;
  rawPlaces: GooglePlace[];
  stats: {
    withWebsite: number;
    withEmail: number;
    withScrapedDescription: number;
    withGeneratedDescription: number;
    avgRating: number;
    avgReviewCount: number;
    byCity: Record<string, number>;
    byIndustry: Record<string, number>;
  };
}

/**
 * Run the seed for a given country. Iterates categories × cities until the
 * limit is reached or all queries are exhausted.
 */
async function seedCountry(
  countryCode: string,
  limit: number,
  progress: ProgressState,
  batchLabel: string,
): Promise<SeedResult> {
  const cities = COUNTRY_CITIES[countryCode] || [];
  const regionCode = REGION_CODE[countryCode] || countryCode.toLowerCase();
  const seenPlaceIds = new Set(progress.seenPlaceIds);
  const tenants: MappedTenant[] = [];
  const rawPlaces: GooglePlace[] = [];
  let apiRequests = 0;

  const stats = {
    withWebsite: 0,
    withEmail: 0,
    withScrapedDescription: 0,
    withGeneratedDescription: 0,
    avgRating: 0,
    avgReviewCount: 0,
    byCity: {} as Record<string, number>,
    byIndustry: {} as Record<string, number>,
  };

  const totalRating: { sum: number; count: number } = { sum: 0, count: 0 };
  const totalReviews: { sum: number; count: number } = { sum: 0, count: 0 };

  outer: for (const category of CATEGORIES) {
    for (const city of cities) {
      if (tenants.length >= limit) break outer;

      const queryKey = `${countryCode}|${category.query.replace('{city}', city)}`;
      if (progress.completedQueries.includes(queryKey)) {
        console.log(`[skip] already completed: ${queryKey}`);
        continue;
      }

      const textQuery = category.query.replace('{city}', city);
      console.log(`[fetch] ${countryCode} / ${city} / ${category.industry} — "${textQuery}"`);

      let result;
      try {
        result = await searchTextAllPages(textQuery, regionCode, 'en', 3);
      } catch (err) {
        console.error(`[error] query failed: ${textQuery}`, err);
        continue;
      }

      apiRequests += result.requests;
      progress.completedQueries.push(queryKey);

      const newPlaces = result.places.filter((p) => {
        // Skip already-seen (dedup across queries)
        if (seenPlaceIds.has(p.id)) return false;
        // Skip closed
        if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') return false;
        // Skip no coords (can't show on map)
        if (!p.location) return false;
        return true;
      });

      console.log(`  → ${result.places.length} results, ${newPlaces.length} new after dedup`);

      // Scrape websites in parallel (10 at a time)
      const BATCH_SIZE = 10;
      for (let i = 0; i < newPlaces.length; i += BATCH_SIZE) {
        if (tenants.length >= limit) break;
        const slice = newPlaces.slice(i, i + BATCH_SIZE);

        const mapped = await Promise.all(
          slice.map(async (place): Promise<MappedTenant | null> => {
            let scrapedEmail: string | null = null;
            let scrapedDescription: string | null = null;

            if (place.websiteUri) {
              stats.withWebsite++;
              try {
                const scraped = await scrapeWebsite(place.websiteUri);
                if (scraped.email) {
                  scrapedEmail = scraped.email;
                  stats.withEmail++;
                }
                if (scraped.description) {
                  scrapedDescription = scraped.description;
                  stats.withScrapedDescription++;
                } else {
                  stats.withGeneratedDescription++;
                }
              } catch {
                stats.withGeneratedDescription++;
              }
            } else {
              stats.withGeneratedDescription++;
            }

            const tenant = mapPlaceToTenant(place, {
              countryCode,
              scrapedEmail,
              scrapedDescription,
            });

            // Stats
            if (tenant.rating > 0) {
              totalRating.sum += tenant.rating;
              totalRating.count++;
            }
            totalReviews.sum += tenant.reviewCount;
            totalReviews.count++;

            const cityKey = tenant.city || 'Unknown';
            stats.byCity[cityKey] = (stats.byCity[cityKey] || 0) + 1;
            stats.byIndustry[tenant.industry] = (stats.byIndustry[tenant.industry] || 0) + 1;

            return tenant;
          }),
        );

        for (const t of mapped) {
          if (t && tenants.length < limit) {
            tenants.push(t);
            seenPlaceIds.add(t.googlePlaceId);
            progress.seenPlaceIds.push(t.googlePlaceId);
            rawPlaces.push(newPlaces.find((p) => p.id === t.googlePlaceId)!);
          }
        }

        // Save progress after each website-scrape batch (resumability)
        await saveProgress(progress);

        console.log(`  → scraped ${slice.length} websites, total mapped: ${tenants.length}/${limit}`);
      }
    }
  }

  stats.avgRating = totalRating.count > 0 ? totalRating.sum / totalRating.count : 0;
  stats.avgReviewCount = totalReviews.count > 0 ? totalReviews.sum / totalReviews.count : 0;

  return { tenants, apiRequests, rawPlaces, stats };
}

/**
 * Run the test — 1 query (plumbers in Houston, TX), up to 5 records.
 * Outputs test-5.sql + raw JSON for inspection.
 */
async function runTest(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  TEST RUN — 5 records, 1 query (plumbers in Houston, TX)     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Direct 1-query test — bypass seedCountry's city iteration so we know
  // EXACTLY what query ran (avoids the "label says Houston, ran New York" bug).
  const textQuery = 'plumber in Houston, TX';
  console.log(`[fetch] "${textQuery}"`);

  let result_raw;
  try {
    result_raw = await searchTextAllPages(textQuery, 'us', 'en', 1); // 1 page = up to 20 results
  } catch (err) {
    console.error('Test query failed:', err);
    process.exit(1);
  }

  const apiRequests = result_raw.requests;
  const seenPlaceIds = new Set<string>();
  const newPlaces = result_raw.places.filter((p) => {
    if (seenPlaceIds.has(p.id)) return false;
    if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') return false;
    if (!p.location) return false;
    return true;
  });

  console.log(`  → ${result_raw.places.length} results, ${newPlaces.length} after dedup/filter`);
  console.log(`  → scraping websites for first 5...`);

  // Take first 5 only
  const slice = newPlaces.slice(0, 5);

  const tenants: MappedTenant[] = [];
  const rawPlaces: GooglePlace[] = [];
  const stats = {
    withWebsite: 0,
    withEmail: 0,
    withScrapedDescription: 0,
    withGeneratedDescription: 0,
    avgRating: 0,
    avgReviewCount: 0,
    byCity: {} as Record<string, number>,
    byIndustry: {} as Record<string, number>,
  };
  const totalRating: { sum: number; count: number } = { sum: 0, count: 0 };
  const totalReviews: { sum: number; count: number } = { sum: 0, count: 0 };

  for (const place of slice) {
    let scrapedEmail: string | null = null;
    let scrapedDescription: string | null = null;

    if (place.websiteUri) {
      stats.withWebsite++;
      try {
        const scraped = await scrapeWebsite(place.websiteUri);
        if (scraped.email) {
          scrapedEmail = scraped.email;
          stats.withEmail++;
        }
        if (scraped.description) {
          scrapedDescription = scraped.description;
          stats.withScrapedDescription++;
        } else {
          stats.withGeneratedDescription++;
        }
      } catch {
        stats.withGeneratedDescription++;
      }
    } else {
      stats.withGeneratedDescription++;
    }

    const tenant = mapPlaceToTenant(place, {
      countryCode: 'US',
      scrapedEmail,
      scrapedDescription,
    });

    tenants.push(tenant);
    rawPlaces.push(place);

    if (tenant.rating > 0) {
      totalRating.sum += tenant.rating;
      totalRating.count++;
    }
    totalReviews.sum += tenant.reviewCount;
    totalReviews.count++;

    const cityKey = tenant.city || 'Unknown';
    stats.byCity[cityKey] = (stats.byCity[cityKey] || 0) + 1;
    stats.byIndustry[tenant.industry] = (stats.byIndustry[tenant.industry] || 0) + 1;
  }

  stats.avgRating = totalRating.count > 0 ? totalRating.sum / totalRating.count : 0;
  stats.avgReviewCount = totalReviews.count > 0 ? totalReviews.sum / totalReviews.count : 0;

  const result: SeedResult = { tenants, apiRequests, rawPlaces, stats };

  // Generate SQL
  await mkdir(OUTPUT_DIR, { recursive: true });
  const sql = buildSqlFile(result.tenants, 'TEST — 5 records (Houston, TX plumbers)');
  const sqlPath = path.join(OUTPUT_DIR, 'test-5.sql');
  await writeFile(sqlPath, sql, 'utf-8');

  // Save raw JSON for inspection
  const jsonPath = path.join(OUTPUT_DIR, 'test-5-raw.json');
  await writeFile(jsonPath, JSON.stringify(result.rawPlaces, null, 2), 'utf-8');

  // Update quota
  const quota = await loadQuota();
  quota.totalRequests += result.apiRequests;
  quota.totalRecords += result.tenants.length;
  quota.totalCost = (quota.totalRequests / 1000) * PRICE_PER_1000;
  await saveQuota(quota);

  // Print summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  TEST COMPLETE                                                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('📁 Files generated:');
  console.log(`   • ${sqlPath}`);
  console.log(`   • ${jsonPath}\n`);

  console.log('📊 Stats:');
  console.log(`   • Records: ${result.tenants.length}`);
  console.log(`   • API requests: ${result.apiRequests}`);
  console.log(`   • With website: ${result.stats.withWebsite}/${result.tenants.length}`);
  console.log(`   • With scraped email: ${result.stats.withEmail}/${result.tenants.length}`);
  console.log(`   • Scraped description: ${result.stats.withScrapedDescription}`);
  console.log(`   • Generated description: ${result.stats.withGeneratedDescription}`);
  console.log(`   • Avg rating: ${result.stats.avgRating.toFixed(2)}`);
  console.log(`   • Avg review count: ${result.stats.avgReviewCount.toFixed(0)}\n`);

  console.log('💰 Quota:');
  console.log(`   • Cumulative API requests: ${quota.totalRequests}`);
  console.log(`   • Cumulative cost: $${quota.totalCost.toFixed(2)}`);
  console.log(`   • Free credit remaining: $${(FREE_CREDIT - quota.totalCost).toFixed(2)}\n`);

  console.log('📋 Side-by-side table:\n');
  console.log(
    'Name'.padEnd(35) +
    'Phone'.padEnd(20) +
    'Email'.padEnd(35) +
    'Website'.padEnd(30) +
    'Rating'.padEnd(8) +
    'Reviews'.padEnd(8) +
    'Description Source',
  );
  console.log('-'.repeat(160));
  for (const t of result.tenants) {
    const descSource = t.settingsJson.includes('website_scrape') &&
      t.settingsJson.includes('"descriptionSource":"website_scrape"')
      ? 'scraped'
      : 'generated';
    console.log(
      (t.name || '').slice(0, 34).padEnd(35) +
      (t.phone || 'NULL').slice(0, 19).padEnd(20) +
      (t.email || 'NULL').slice(0, 34).padEnd(35) +
      (t.website || 'NULL').slice(0, 29).padEnd(30) +
      String(t.rating).padEnd(8) +
      String(t.reviewCount).padEnd(8) +
      descSource,
    );
  }

  console.log('\n✅ Next: paste test-5.sql into Supabase SQL Editor and verify the 5 rows.');
  console.log('   Then say "go" to run Batch 1 (US, 1000 records).');
}

/**
 * Run a numbered batch.
 */
async function runBatch(batchNum: number): Promise<void> {
  const country = BATCH_TO_COUNTRY[batchNum];
  if (!country) {
    console.error(`Unknown batch ${batchNum}. Valid: 1-5`);
    process.exit(1);
  }

  const limit = 1000;
  const label = `Batch ${batchNum} — ${country} (${limit} records)`;

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  ${label.padEnd(60)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const progress = await loadProgress();
  const result = await seedCountry(country, limit, progress, label);

  if (result.tenants.length === 0) {
    console.log('⚠️  No new records fetched (all queries exhausted or rate-limited).');
    return;
  }

  // Generate SQL
  await mkdir(OUTPUT_DIR, { recursive: true });
  const paddedBatch = String(batchNum).padStart(2, '0');
  const paddedCount = String(result.tenants.length).padStart(4, '0');
  const filename = `${paddedBatch}-${country.toLowerCase()}-${paddedCount}.sql`;
  const sql = buildSqlFile(result.tenants, `${label} — ${result.tenants.length} records`);
  const sqlPath = path.join(OUTPUT_DIR, filename);
  await writeFile(sqlPath, sql, 'utf-8');

  // Update quota
  const quota = await loadQuota();
  const prevBatchRequests = quota.byBatch[batchNum]?.requests || 0;
  const prevBatchRecords = quota.byBatch[batchNum]?.records || 0;
  quota.byBatch[batchNum] = {
    requests: prevBatchRequests + result.apiRequests,
    records: prevBatchRecords + result.tenants.length,
    cost: ((prevBatchRequests + result.apiRequests) / 1000) * PRICE_PER_1000,
  };
  // Recompute totals from all batches (in case of re-runs)
  quota.totalRequests = Object.values(quota.byBatch).reduce((s, b) => s + b.requests, 0);
  quota.totalRecords = Object.values(quota.byBatch).reduce((s, b) => s + b.records, 0);
  quota.totalCost = (quota.totalRequests / 1000) * PRICE_PER_1000;
  await saveQuota(quota);

  // Print summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  BATCH ${batchNum} COMPLETE                                          ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('📁 File generated:');
  console.log(`   • ${sqlPath}\n`);

  console.log('📊 Quota report:');
  console.log(`   • API requests this batch: ${result.apiRequests}`);
  console.log(`   • API requests cumulative: ${quota.totalRequests}`);
  console.log(`   • Estimated cost this batch: $${((result.apiRequests / 1000) * PRICE_PER_1000).toFixed(2)}`);
  console.log(`   • Estimated cost cumulative: $${quota.totalCost.toFixed(2)}`);
  console.log(`   • Free credit remaining: $${(FREE_CREDIT - quota.totalCost).toFixed(2)} / $${FREE_CREDIT}\n`);

  console.log('📈 Data stats:');
  console.log(`   • Records: ${result.tenants.length}`);
  console.log(`   • With website: ${result.stats.withWebsite} (${((result.stats.withWebsite / result.tenants.length) * 100).toFixed(1)}%)`);
  console.log(`   • With email (scraped): ${result.stats.withEmail} (${((result.stats.withEmail / result.tenants.length) * 100).toFixed(1)}%)`);
  console.log(`   • Scraped description: ${result.stats.withScrapedDescription} (${((result.stats.withScrapedDescription / result.tenants.length) * 100).toFixed(1)}%)`);
  console.log(`   • Generated description: ${result.stats.withGeneratedDescription} (${((result.stats.withGeneratedDescription / result.tenants.length) * 100).toFixed(1)}%)`);
  console.log(`   • Avg rating: ${result.stats.avgRating.toFixed(2)}`);
  console.log(`   • Avg review count: ${result.stats.avgReviewCount.toFixed(0)}\n`);

  const topCities = Object.entries(result.stats.byCity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c, n]) => `${c} (${n})`)
    .join(', ');
  console.log(`   • Top cities: ${topCities}\n`);

  const topIndustries = Object.entries(result.stats.byIndustry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c, n]) => `${c} (${n})`)
    .join(', ');
  console.log(`   • Top industries: ${topIndustries}\n`);

  console.log(`⚠️  Next: paste ${filename} into Supabase SQL Editor, then say "go" for Batch ${batchNum + 1}.`);
}

/**
 * Run ad-hoc — single country + limit.
 */
async function runAdhoc(country: string, limit: number): Promise<void> {
  const label = `Adhoc — ${country} (${limit} records)`;
  console.log(`\n${label}\n`);

  const progress = await loadProgress();
  const result = await seedCountry(country, limit, progress, label);

  if (result.tenants.length === 0) {
    console.log('⚠️  No new records fetched.');
    return;
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const filename = `adhoc-${country.toLowerCase()}-${result.tenants.length}.sql`;
  const sql = buildSqlFile(result.tenants, label);
  const sqlPath = path.join(OUTPUT_DIR, filename);
  await writeFile(sqlPath, sql, 'utf-8');

  console.log(`\n✅ Generated ${sqlPath} (${result.tenants.length} records, ${result.apiRequests} API requests)`);
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

async function main() {
  // Verify API key
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY is not set in .env');
    process.exit(1);
  }

  const opts = parseArgs();

  if (opts.test) {
    await runTest();
  } else if (opts.batch) {
    await runBatch(opts.batch);
  } else if (opts.country) {
    await runAdhoc(opts.country, opts.limit || 100);
  } else {
    console.log('Usage:');
    console.log('  bun run scripts/google-places-seed.ts --test          # 5 records (verification)');
    console.log('  bun run scripts/google-places-seed.ts --batch 1        # US, 1000 records');
    console.log('  bun run scripts/google-places-seed.ts --country US --limit 500');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
