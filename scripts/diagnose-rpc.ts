/**
 * Quick diagnostic — test both RPCs with timing, retry logic, and
 * individual error handling so we can see which one fails and why.
 */

import 'dotenv/config';
import { getAdminClient } from '../src/lib/supabase-db';

async function testRpc(name: string, params: Record<string, unknown>, retries = 2): Promise<void> {
  console.log(`\n  Testing ${name} with params: ${JSON.stringify(params)}`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    const start = Date.now();
    try {
      const client = getAdminClient();
      const { data, error } = await client.rpc(name, params);
      const elapsed = Date.now() - start;

      if (error) {
        console.log(`    Attempt ${attempt}: ❌ ERROR in ${elapsed}ms — ${error.message} (code: ${error.code})`);
      } else {
        const resultStr = JSON.stringify(data).substring(0, 300);
        const arrLen = Array.isArray(data) ? ` (array, ${data.length} items)` : '';
        console.log(`    Attempt ${attempt}: ✅ SUCCESS in ${elapsed}ms${arrLen}`);
        console.log(`    Result: ${resultStr}`);
        return;
      }
    } catch (err) {
      const elapsed = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`    Attempt ${attempt}: 💥 THROW in ${elapsed}ms — ${msg}`);
    }

    if (attempt < retries) {
      console.log(`    Retrying in 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function main() {
  console.log('═'.repeat(70));
  console.log('  RPC Diagnostic Test');
  console.log('═'.repeat(70));
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log(`  SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

  // Test cities first (was faster in EXPLAIN: ~150-400ms)
  await testRpc('get_marketplace_cities', { p_country: 'US' });

  // Test counts (was 16ms in EXPLAIN but timed out via PostgREST)
  await testRpc('get_marketplace_counts', { p_country: 'US', p_city: null });

  // Test counts with NULL country
  await testRpc('get_marketplace_counts', { p_country: null, p_city: null });

  // Test counts with city filter
  await testRpc('get_marketplace_counts', { p_country: 'US', p_city: 'Austin' });

  console.log('\n═'.repeat(70));
  console.log('  Diagnostic complete');
  console.log('═'.repeat(70));
}

main();
