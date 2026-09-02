/**
 * Backfill: marketplaceEligible for existing tenants.
 *
 * Gate H safety: after adding the `marketplaceEligible` boolean (default false),
 * ALL existing tenants start as ineligible. This script recomputes eligibility
 * for every tenant using the SAME `recomputeMarketplaceEligibility()` function
 * that the verification engine uses — so the backfill uses identical rules to
 * production, not a manual SQL approximation.
 *
 * Run this AFTER `bun run db:push` (which creates the new column) and BEFORE
 * enabling the cached eligibility enforcement in instant booking.
 *
 * Usage:
 *   bun run src/scripts/backfill-marketplace-eligibility.ts
 *
 * Output:
 *   Before: X tenants with marketplaceEligible=true
 *   After: Y tenants with marketplaceEligible=true
 *   Delta: Z tenants (investigate if unexpected)
 *
 * ⚠️ DO NOT run the production db:push without running this backfill first.
 */
import { recomputeMarketplaceEligibility } from '../src/lib/verification/verification-engine';
import { db } from '../src/lib/db';

async function main() {
  console.log('=== Marketplace Eligibility Backfill ===\n');

  // Count before
  const beforeCount = await db.tenant.count({
    where: { marketplaceEligible: true },
  });
  console.log(`Before: ${beforeCount} tenants with marketplaceEligible=true\n`);

  // Fetch all tenants (process in batches of 100)
  const total = await db.tenant.count();
  console.log(`Processing ${total} tenants...\n`);

  let processed = 0;
  let eligible = 0;
  let ineligible = 0;
  let errors = 0;

  const batchSize = 100;
  let skip = 0;

  while (skip < total) {
    const tenants = await db.tenant.findMany({
      skip,
      take: batchSize,
      select: { id: true, name: true },
    });

    for (const tenant of tenants) {
      try {
        const isEligible = await recomputeMarketplaceEligibility(tenant.id);
        if (isEligible) {
          eligible++;
        } else {
          ineligible++;
        }
      } catch (err) {
        errors++;
        console.error(`  ✗ ${tenant.name} (${tenant.id}):`, err instanceof Error ? err.message : err);
      }
      processed++;
      if (processed % 100 === 0) {
        console.log(`  Processed ${processed}/${total}...`);
      }
    }

    skip += batchSize;
  }

  // Count after
  const afterCount = await db.tenant.count({
    where: { marketplaceEligible: true },
  });

  console.log('\n=== Results ===');
  console.log(`Before: ${beforeCount} eligible`);
  console.log(`After: ${afterCount} eligible`);
  console.log(`Processed: ${processed}`);
  console.log(`Eligible: ${eligible}`);
  console.log(`Ineligible: ${ineligible}`);
  console.log(`Errors: ${errors}`);
  console.log(`Delta: ${afterCount - beforeCount}`);

  if (errors > 0) {
    console.log('\n⚠️ Some tenants failed to recompute. Check errors above.');
  }

  await db.$disconnect();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
