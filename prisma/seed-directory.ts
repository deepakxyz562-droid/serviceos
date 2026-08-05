/**
 * seed-directory.ts
 *
 * CLI wrapper around the shared `seedDirectory()` logic in
 * `src/lib/directory-seed.ts`. Seeds the DirectoryLocation table with
 * ~350 major European cities across 40+ countries.
 *
 * The actual data + upsert logic live in `src/lib/directory-seed.ts` so they
 * can be shared with the production cron-style API route
 * (`/api/cron/seed-directory`) — which is how you seed a production server
 * that can't run this script directly:
 *
 *   curl 'https://fieseros.com/api/cron/seed-directory?secret=$CRON_SECRET'
 *
 * Idempotent: every row is upserted on the composite unique key
 * (countryCode, citySlug). Re-running refreshes population/lat/lng/timezone/
 * currency/locale and re-activates any row that had been soft-deleted
 * (isActive=false) but will NOT change the row id, so existing
 * FeaturedLocation foreign keys keep resolving.
 *
 * Usage:  bun run prisma/seed-directory.ts
 *
 * No package.json script entry is added — the user runs this directly.
 */

import { db } from '../src/lib/db';
import { seedDirectory } from '../src/lib/directory-seed';

async function main() {
  const result = await seedDirectory((countryCode, processed, totalCountries) => {
    console.log(`   ✓ ${countryCode} (running total: ${processed} cities, ${totalCountries} countries)`);
  });

  console.log(`\n✅ DirectoryLocation seed complete`);
  console.log(`   Total rows: ${result.total}`);
  console.log(`   Countries:  ${result.countries}`);
  console.log(`   Per country (descending):`);
  Object.entries(result.perCountry)
    .sort((a, b) => b[1] - a[1])
    .forEach(([code, n]) => console.log(`     ${code}: ${n}`));
  console.log(`   Took: ${result.durationMs}ms\n`);
}

main()
  .catch((err) => {
    console.error('Directory seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
