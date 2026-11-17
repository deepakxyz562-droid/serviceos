#!/usr/bin/env tsx
/**
 * BGOS Business Image Engine — Existing Subscribed Merchant Pre-Warmer
 * 
 * Usage:
 *   npx tsx scripts/prewarm-subscribed-merchants.ts
 * 
 * Scans all active subscribed merchants from DB, resolves their unique trade specializations,
 * and ensures each has a high-resolution commercial photography pack in S3.
 * Zero-downtime, non-blocking, throttled execution.
 */

import { prewarmAllActiveSubscribers } from '../src/lib/designs/category-image-engine';

async function main() {
  console.log('[BGOS Pre-Warmer] Starting subscribed merchant S3 category scan...');
  const startTime = Date.now();
  
  const result = await prewarmAllActiveSubscribers();
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[BGOS Pre-Warmer] Completed in ${duration}s.`);
  console.log(`[BGOS Pre-Warmer] Total unique trades processed: ${result.processed}`);
  console.log(`[BGOS Pre-Warmer] Newly seeded trade libraries in S3: ${result.seeded}`);
  if (result.categories.length > 0) {
    console.log('[BGOS Pre-Warmer] Seeded specializations:', result.categories);
  }
}

main().catch((err) => {
  console.error('[BGOS Pre-Warmer] Fatal error:', err);
  process.exit(1);
});
