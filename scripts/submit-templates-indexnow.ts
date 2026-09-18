/**
 * Script to collect and submit all AI Form Template URLs to IndexNow.
 *
 * Usage:
 *   bun run scripts/submit-templates-indexnow.ts
 */

import {
  getCatalogIndex,
  TEMPLATE_CATEGORIES,
  TEMPLATE_INDUSTRIES,
} from '../src/lib/forms/templates';
import { INDEXNOW_KEY, INDEXNOW_KEY_LOCATION } from '../src/lib/indexnow';

const BASE_URL = 'https://fieseros.com';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const BATCH_SIZE = 1000;

async function main() {
  console.log('🚀 Gathering all 20,000+ AI Form Template URLs for IndexNow...');

  const index = getCatalogIndex();
  const urls: string[] = [
    `${BASE_URL}/templates`,
    `${BASE_URL}/gptform`,
  ];

  for (const cat of TEMPLATE_CATEGORIES) {
    urls.push(`${BASE_URL}/templates/${cat.id}`);
  }

  for (const ind of TEMPLATE_INDUSTRIES) {
    if (ind.id === 'general') continue;
    urls.push(`${BASE_URL}/templates/industries/${ind.id}`);
  }

  for (const t of index) {
    urls.push(`${BASE_URL}/templates/${t.categoryId}/${t.id}`);
  }

  console.log(`📦 Found ${urls.length} total template URLs to submit.`);

  const batches = [];
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    batches.push(urls.slice(i, i + BATCH_SIZE));
  }

  console.log(`📡 Sending ${batches.length} batches of up to ${BATCH_SIZE} URLs each to IndexNow...`);

  let successful = 0;
  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const payload = {
      host: 'fieseros.com',
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList: batch,
    };

    try {
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
      });

      if (res.status === 200 || res.status === 202) {
        successful += batch.length;
        console.log(`  [Batch ${b + 1}/${batches.length}] ✅ Submitted ${batch.length} URLs (Status ${res.status})`);
      } else {
        const text = await res.text();
        console.warn(`  [Batch ${b + 1}/${batches.length}] ⚠️ Status ${res.status}: ${text}`);
      }
    } catch (err) {
      console.error(`  [Batch ${b + 1}/${batches.length}] ❌ Network error:`, err);
    }

    // Rate-limit grace period
    if (b < batches.length - 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  console.log(`\n🎉 IndexNow submission completed: ${successful} / ${urls.length} URLs submitted successfully!`);
}

main().catch(console.error);
