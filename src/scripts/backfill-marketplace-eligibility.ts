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
import { recomputeMarketplaceEligibility } from '@/lib/verification/verification-engine';
import { db } from '@/lib/db';

async function main() {
  console.log('=== Marketplace Eligibility Backfill ===\n');

  let beforeCount = 0;
  try {
    beforeCount = await db.tenant.count({
      where: { marketplaceEligible: true },
    });
    console.log(`Before: ${beforeCount} tenants with marketplaceEligible=true\n`);
  } catch {
    console.log('Before: marketplaceEligible column not yet active in DB.\n');
  }

  // Priority 1: All claimed or opted-in tenants (the real businesses)
  const priorityTenants = await db.tenant.findMany({
    where: {
      OR: [
        { claimed: true },
        { marketplaceOptIn: true },
      ],
    },
    select: { id: true, name: true, claimed: true, marketplaceOptIn: true },
  });

  console.log(`Found ${priorityTenants.length} priority (claimed / opted-in) tenants to evaluate...\n`);

  let processed = 0;
  let eligible = 0;
  let ineligible = 0;
  let errors = 0;

  for (const tenant of priorityTenants) {
    try {
      const isEligible = await recomputeMarketplaceEligibility(tenant.id);
      if (isEligible) {
        eligible++;
        console.log(`  ✅ [ELIGIBLE] ${tenant.name} (${tenant.id})`);
      } else {
        ineligible++;
        console.log(`  ⚪ [INELIGIBLE] ${tenant.name} (${tenant.id})`);
      }
    } catch (err) {
      errors++;
      console.error(`  ✗ [ERROR] ${tenant.name} (${tenant.id}):`, err instanceof Error ? err.message : err);
    }
    processed++;
  }

  // Count after
  let afterCount = eligible;
  try {
    afterCount = await db.tenant.count({
      where: { marketplaceEligible: true },
    });
  } catch {}

  console.log('\n=== Results ===');
  console.log(`Before: ${beforeCount} eligible`);
  console.log(`After: ${afterCount} eligible`);
  console.log(`Priority Tenants Evaluated: ${processed}`);
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
