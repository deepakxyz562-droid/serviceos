/**
 * verify-marketplace-rpc.ts — Application-level regression test for the
 * marketplace RPC migration (Phase A + Phase B).
 *
 * Tests the FULL backend chain:
 *   getAdminClient().rpc() → PostgREST → Postgres FUNCTION → Index Only Scan
 *   → response transformation (same logic as supabase-rpc.ts)
 *
 * NOTE: This script bypasses the `import 'server-only'` guard in
 * supabase-rpc.ts (which is a Next.js build-time guard, not runtime logic).
 * It replicates the exact same RPC calls + response transformation so we
 * test the actual PostgREST behavior + transformation logic.
 *
 * The `server-only` guard itself is not testable in a standalone script —
 * it only throws when imported from a Next.js Client Component bundle.
 *
 * TEST SCENARIOS (per user checklist points 5-7):
 *   Counts:
 *     1. US + null city
 *     2. US + Austin (real city)
 *     3. US + Dallas (tests serviceAreasJson filter)
 *     4. US + nonexistent city
 *     5. NULL country (all countries)
 *   Cities:
 *     6. US
 *     7. GB
 *     8. IN
 *     9. Country with no providers (ZZ)
 *
 * VERIFIES:
 *   - Response shapes match TypeScript interfaces (MarketplaceCity[], MarketplaceCounts)
 *   - Vertical rollup logic (industry → vertical via VERTICAL_MAP)
 *   - total includes NULL-industry tenants
 *   - byIndustry only contains catalog IDs with count > 0
 *   - Cities are sorted alphabetically
 *   - Cities have no duplicates (case-insensitive city+state key)
 *   - lat/lng are numbers (not null/undefined)
 *
 * USAGE:
 *   bun run scripts/verify-marketplace-rpc.ts
 *
 * Requires .env with USE_SUPABASE_DB=true + Supabase credentials.
 */

import 'dotenv/config';
import { getAdminClient } from '../src/lib/supabase-db';
import { INDUSTRY_CATALOG, VERTICAL_MAP } from '../src/lib/industry-catalog';

// ── Types (mirrors supabase-rpc.ts) ─────────────────────────────────────────

interface MarketplaceCity {
  city: string;
  region: string;
  lat: number;
  lng: number;
}

interface MarketplaceCounts {
  byVertical: Record<string, number>;
  byIndustry: Record<string, number>;
  total: number;
}

interface RawMarketplaceCity {
  city: string;
  region: string | null;
  lat: number | null;
  lng: number | null;
}

interface RawMarketplaceCounts {
  industry_counts: Record<string, number> | null;
  total: number | string | null;
}

// ── RPC functions (exact replicas of supabase-rpc.ts logic) ─────────────────

async function getMarketplaceCities(country: string): Promise<MarketplaceCity[]> {
  const client = getAdminClient();
  const { data, error } = await client.rpc('get_marketplace_cities', {
    p_country: country,
  });

  if (error) {
    throw new Error(
      `[supabase-rpc] get_marketplace_cities failed: ${error.message} (code: ${error.code ?? 'n/a'})`,
    );
  }

  if (!data || !Array.isArray(data)) return [];

  return (data as RawMarketplaceCity[]).map((row) => ({
    city: row.city,
    region: row.region ?? '',
    lat: Number(row.lat) || 0,
    lng: Number(row.lng) || 0,
  }));
}

async function getMarketplaceCounts(
  country: string | null,
  city: string | null,
): Promise<MarketplaceCounts> {
  const client = getAdminClient();
  const { data, error } = await client.rpc('get_marketplace_counts', {
    p_country: country,
    p_city: city,
  });

  if (error) {
    throw new Error(
      `[supabase-rpc] get_marketplace_counts failed: ${error.message} (code: ${error.code ?? 'n/a'})`,
    );
  }

  const row: RawMarketplaceCounts | undefined = Array.isArray(data)
    ? (data[0] as RawMarketplaceCounts | undefined)
    : (data as RawMarketplaceCounts | undefined);

  const industryCountsRaw: Record<string, number> = row?.industry_counts ?? {};
  const total: number = Number(row?.total) || 0;

  const byIndustry: Record<string, number> = {};
  const byVertical: Record<string, number> = {};

  for (const catalogEntry of INDUSTRY_CATALOG) {
    const id = catalogEntry.id;
    const count = Number(industryCountsRaw[id]) || 0;
    if (count > 0) {
      byIndustry[id] = count;
      const verticalId = VERTICAL_MAP[id] ?? catalogEntry.vertical;
      if (verticalId) {
        byVertical[verticalId] = (byVertical[verticalId] ?? 0) + count;
      }
    }
  }

  return { byVertical, byIndustry, total };
}

// ── Test utilities ──────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string, context?: unknown) {
  if (condition) {
    passCount++;
    console.log(`  ✅ ${message}`);
  } else {
    failCount++;
    failures.push(message);
    console.log(`  ❌ ${message}`);
    if (context !== undefined) {
      console.log(`     Context: ${JSON.stringify(context).substring(0, 300)}`);
    }
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    passCount++;
    console.log(`  ✅ ${message}`);
  } else {
    failCount++;
    failures.push(message);
    console.log(`  ❌ ${message}`);
    console.log(`     Expected: ${expectedStr.substring(0, 300)}`);
    console.log(`     Actual:   ${actualStr.substring(0, 300)}`);
  }
}

function section(title: string) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(70));
}

// ── Shape validators ────────────────────────────────────────────────────────

function validateMarketplaceCounts(result: unknown): result is MarketplaceCounts {
  if (typeof result !== 'object' || result === null) return false;
  const r = result as Record<string, unknown>;
  if (typeof r.total !== 'number') return false;
  if (typeof r.byIndustry !== 'object' || r.byIndustry === null) return false;
  if (typeof r.byVertical !== 'object' || r.byVertical === null) return false;
  for (const [k, v] of Object.entries(r.byIndustry)) {
    if (typeof k !== 'string' || typeof v !== 'number') return false;
  }
  for (const [k, v] of Object.entries(r.byVertical)) {
    if (typeof k !== 'string' || typeof v !== 'number') return false;
  }
  return true;
}

function validateMarketplaceCities(result: unknown): result is MarketplaceCity[] {
  if (!Array.isArray(result)) return false;
  for (const item of result) {
    if (typeof item !== 'object' || item === null) return false;
    const c = item as Record<string, unknown>;
    if (typeof c.city !== 'string') return false;
    if (typeof c.region !== 'string') return false;
    if (typeof c.lat !== 'number') return false;
    if (typeof c.lng !== 'number') return false;
  }
  return true;
}

// ── Tests ───────────────────────────────────────────────────────────────────

async function testCountsScenarios() {
  section('COUNTS RPC — Scenario Tests');

  // ── Scenario 1: US + null city ──────────────────────────────────────────
  console.log('\n  Test 1: US + null city');
  const t1Start = Date.now();
  const counts1 = await getMarketplaceCounts('US', null);
  const t1Ms = Date.now() - t1Start;
  console.log(`     ⏱ ${t1Ms}ms`);

  assert(validateMarketplaceCounts(counts1), 'Response shape matches MarketplaceCounts interface', counts1);
  assert(counts1.total > 0, `total > 0 (got ${counts1.total})`);
  assert(Object.keys(counts1.byIndustry).length > 0, `byIndustry has entries (got ${Object.keys(counts1.byIndustry).length})`);
  assert(Object.keys(counts1.byVertical).length > 0, `byVertical has entries (got ${Object.keys(counts1.byVertical).length})`);

  // Verify all industry IDs in byIndustry are valid catalog IDs
  const catalogIds = new Set(INDUSTRY_CATALOG.map((i) => i.id));
  const unknownIndustries = Object.keys(counts1.byIndustry).filter((id) => !catalogIds.has(id));
  assert(unknownIndustries.length === 0, `All byIndustry IDs are in catalog (unknown: ${unknownIndustries.join(',') || 'none'})`);

  // Verify all vertical IDs are valid
  const catalogVerticals = new Set(Object.values(VERTICAL_MAP));
  const unknownVerticals = Object.keys(counts1.byVertical).filter((v) => !catalogVerticals.has(v));
  assert(unknownVerticals.length === 0, `All byVertical IDs are valid (unknown: ${unknownVerticals.join(',') || 'none'})`);

  // Verify vertical rollup: sum of industries in each vertical should equal byVertical[vertical]
  const expectedVerticals: Record<string, number> = {};
  for (const [industryId, count] of Object.entries(counts1.byIndustry)) {
    const verticalId = VERTICAL_MAP[industryId];
    if (verticalId) {
      expectedVerticals[verticalId] = (expectedVerticals[verticalId] ?? 0) + count;
    }
  }
  assertEqual(counts1.byVertical, expectedVerticals, 'Vertical rollup matches VERTICAL_MAP sum');

  // Verify total >= sum(byIndustry) — total includes NULL-industry tenants
  const industrySum = Object.values(counts1.byIndustry).reduce((a, b) => a + b, 0);
  assert(counts1.total >= industrySum, `total (${counts1.total}) >= sum(byIndustry) (${industrySum}) — NULL industries counted in total`);

  // Print actual data for visual inspection
  console.log(`     📊 total: ${counts1.total}`);
  console.log(`     📊 byIndustry: ${JSON.stringify(counts1.byIndustry)}`);
  console.log(`     📊 byVertical: ${JSON.stringify(counts1.byVertical)}`);

  // ── Scenario 2: US + Austin ────────────────────────────────────────────
  console.log('\n  Test 2: US + Austin');
  const t2Start = Date.now();
  const counts2 = await getMarketplaceCounts('US', 'Austin');
  const t2Ms = Date.now() - t2Start;
  console.log(`     ⏱ ${t2Ms}ms`);

  assert(validateMarketplaceCounts(counts2), 'Response shape matches MarketplaceCounts interface');
  assert(counts2.total <= counts1.total, `Austin-filtered total (${counts2.total}) <= unfiltered (${counts1.total})`);
  console.log(`     📊 Austin total: ${counts2.total}`);

  // ── Scenario 3: US + Dallas (tests serviceAreasJson filter) ────────────
  console.log('\n  Test 3: US + "Dallas" (tests serviceAreasJson filter)');
  const t3Start = Date.now();
  const counts3 = await getMarketplaceCounts('US', 'Dallas');
  const t3Ms = Date.now() - t3Start;
  console.log(`     ⏱ ${t3Ms}ms`);

  assert(validateMarketplaceCounts(counts3), 'Response shape matches MarketplaceCounts interface');
  assert(counts3.total > 0, `Dallas-filtered total > 0 (got ${counts3.total}) — serviceAreasJson filter working`);
  assert(counts3.total <= counts1.total, `Dallas total (${counts3.total}) <= unfiltered (${counts1.total})`);
  console.log(`     📊 Dallas total: ${counts3.total}`);

  // ── Scenario 4: US + nonexistent city ──────────────────────────────────
  console.log('\n  Test 4: US + nonexistent city (ZzzzNonexistentCity12345)');
  const t4Start = Date.now();
  const counts4 = await getMarketplaceCounts('US', 'ZzzzNonexistentCity12345');
  const t4Ms = Date.now() - t4Start;
  console.log(`     ⏱ ${t4Ms}ms`);

  assert(validateMarketplaceCounts(counts4), 'Response shape matches MarketplaceCounts interface');
  assertEqual(counts4.total, 0, 'Nonexistent city → total = 0');
  assertEqual(Object.keys(counts4.byIndustry).length, 0, 'Nonexistent city → byIndustry empty');
  assertEqual(Object.keys(counts4.byVertical).length, 0, 'Nonexistent city → byVertical empty');

  // ── Scenario 5: NULL country (all countries) ───────────────────────────
  console.log('\n  Test 5: NULL country (all countries)');
  const t5Start = Date.now();
  const counts5 = await getMarketplaceCounts(null, null);
  const t5Ms = Date.now() - t5Start;
  console.log(`     ⏱ ${t5Ms}ms`);

  assert(validateMarketplaceCounts(counts5), 'Response shape matches MarketplaceCounts interface');
  assert(counts5.total >= counts1.total, `All-countries total (${counts5.total}) >= US-only (${counts1.total})`);
  console.log(`     📊 All-countries total: ${counts5.total}`);
}

async function testCitiesScenarios() {
  section('CITIES RPC — Scenario Tests');

  // ── Scenario 6: US ─────────────────────────────────────────────────────
  console.log('\n  Test 6: US cities');
  const t6Start = Date.now();
  const citiesUS = await getMarketplaceCities('US');
  const t6Ms = Date.now() - t6Start;
  console.log(`     ⏱ ${t6Ms}ms`);

  assert(validateMarketplaceCities(citiesUS), 'Response shape matches MarketplaceCity[] interface');
  assert(citiesUS.length > 0, `US has cities (got ${citiesUS.length})`);

  // Verify alphabetical sorting
  const sorted = [...citiesUS].sort((a, b) => a.city.localeCompare(b.city));
  assertEqual(citiesUS.map((c) => c.city), sorted.map((c) => c.city), 'Cities sorted alphabetically by city');

  // Verify no duplicates (case-insensitive city+state key)
  const seenKeys = new Set<string>();
  let dupCount = 0;
  for (const c of citiesUS) {
    const key = `${c.city.toLowerCase()}|${c.region.toLowerCase()}`;
    if (seenKeys.has(key)) dupCount++;
    seenKeys.add(key);
  }
  assert(dupCount === 0, `No duplicate cities (found ${dupCount} duplicates)`);

  // Verify lat/lng are numbers (not null/undefined/NaN)
  const badCoords = citiesUS.filter((c) => !Number.isFinite(c.lat) || !Number.isFinite(c.lng));
  assert(badCoords.length === 0, `All cities have finite lat/lng (${badCoords.length} bad)`);

  // Print sample for visual inspection
  console.log(`     📊 Total US cities: ${citiesUS.length}`);
  console.log(`     📊 First 5: ${JSON.stringify(citiesUS.slice(0, 5))}`);

  // ── Scenario 7: GB ─────────────────────────────────────────────────────
  console.log('\n  Test 7: GB cities');
  const t7Start = Date.now();
  const citiesGB = await getMarketplaceCities('GB');
  const t7Ms = Date.now() - t7Start;
  console.log(`     ⏱ ${t7Ms}ms`);

  assert(validateMarketplaceCities(citiesGB), 'Response shape matches MarketplaceCity[] interface');
  console.log(`     📊 GB has ${citiesGB.length} cities`);
  if (citiesGB.length > 0) {
    console.log(`     📊 First 3: ${JSON.stringify(citiesGB.slice(0, 3))}`);
  }

  // ── Scenario 8: IN ─────────────────────────────────────────────────────
  console.log('\n  Test 8: IN cities');
  const t8Start = Date.now();
  const citiesIN = await getMarketplaceCities('IN');
  const t8Ms = Date.now() - t8Start;
  console.log(`     ⏱ ${t8Ms}ms`);

  assert(validateMarketplaceCities(citiesIN), 'Response shape matches MarketplaceCity[] interface');
  console.log(`     📊 IN has ${citiesIN.length} cities`);
  if (citiesIN.length > 0) {
    console.log(`     📊 First 3: ${JSON.stringify(citiesIN.slice(0, 3))}`);
  }

  // ── Scenario 9: Country with no providers ──────────────────────────────
  console.log('\n  Test 9: Country with no providers (ZZ)');
  const t9Start = Date.now();
  const citiesZZ = await getMarketplaceCities('ZZ');
  const t9Ms = Date.now() - t9Start;
  console.log(`     ⏱ ${t9Ms}ms`);

  assert(validateMarketplaceCities(citiesZZ), 'Response shape matches MarketplaceCity[] interface (empty array)');
  assertEqual(citiesZZ.length, 0, 'Country with no providers returns empty array');
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(70));
  console.log('  Marketplace RPC Verification — Phase A + Phase B Regression Test');
  console.log('═'.repeat(70));
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log(`  USE_SUPABASE_DB: ${process.env.USE_SUPABASE_DB}`);
  console.log(`  SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

  try {
    await testCountsScenarios();
    await testCitiesScenarios();
  } catch (err) {
    console.log(`\n💥 FATAL ERROR: ${err instanceof Error ? err.message : String(err)}`);
    if (err instanceof Error && err.stack) {
      console.log(err.stack);
    }
    process.exit(1);
  }

  // ── Summary ────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(70)}`);
  console.log('  SUMMARY');
  console.log('═'.repeat(70));
  console.log(`  ✅ Passed: ${passCount}`);
  console.log(`  ❌ Failed: ${failCount}`);

  if (failures.length > 0) {
    console.log('\n  Failures:');
    for (const f of failures) {
      console.log(`    • ${f}`);
    }
    process.exit(1);
  } else {
    console.log('\n  🎉 All tests passed — RPC migration is working correctly.');
    process.exit(0);
  }
}

main();
