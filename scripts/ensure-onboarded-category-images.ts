#!/usr/bin/env bun
/**
 * Onboarded Users Category Image Generator
 *
 * Scans all existing onboarded tenants/merchants in ServiceOS/BGOS,
 * identifies their categories, and ensures that S3 category folders
 * and images are generated and populated.
 *
 * Usage:
 *   bun run scripts/ensure-onboarded-category-images.ts
 */

import { ensureImagesForExistingOnboardedUsers } from '../src/lib/designs/business-image-resolver';

async function main() {
  console.log('=====================================================');
  console.log('  BGOS On-Demand Category Image Generator (S3/Cloudflare)');
  console.log('=====================================================');
  console.log('Scanning database for existing onboarded merchants...');

  const startTime = Date.now();
  const result = await ensureImagesForExistingOnboardedUsers();

  console.log('\n--- Completion Summary ---');
  console.log(`Categories checked/ensured: ${result.processedCategories.length}`);
  console.log(`Categories: ${result.processedCategories.join(', ')}`);
  console.log(`Total images verified/available in pool: ${result.totalImagesEnsured}`);
  console.log(`Execution time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
  console.log('=====================================================\n');
}

main()
  .catch((err) => {
    console.error('[Error] Category generation failed:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
