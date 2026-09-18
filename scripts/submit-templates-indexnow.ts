/**
 * Script to collect and submit all AI Form Template URLs to IndexNow.
 *
 * Usage:
 *   bun run scripts/submit-templates-indexnow.ts
 */

import { getAllTemplates } from '../src/lib/forms/templates';
import { INDEXNOW_KEY, INDEXNOW_KEY_LOCATION } from '../src/lib/indexnow';

const BASE_URL = 'https://fieseros.com';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

async function main() {
  console.log('🚀 Gathering all AI Form Template URLs for IndexNow...');

  const templates = getAllTemplates();
  const categorySet = new Set<string>();
  const industrySet = new Set<string>();

  const urls: string[] = [
    `${BASE_URL}/templates`,
    `${BASE_URL}/gptform`,
  ];

  for (const t of templates) {
    for (const c of t.categories || []) categorySet.add(c);
    for (const i of t.industries || []) industrySet.add(i);
  }

  for (const cat of categorySet) {
    urls.push(`${BASE_URL}/templates/${cat}`);
  }

  for (const ind of industrySet) {
    if (ind === 'general') continue;
    urls.push(`${BASE_URL}/templates/industries/${ind}`);
  }

  for (const t of templates) {
    const cat = t.categories?.[0] || 'general';
    urls.push(`${BASE_URL}/templates/${cat}/${t.id}`);
  }

  console.log(`📦 Found ${urls.length} template URLs to submit.`);

  const payload = {
    host: 'fieseros.com',
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: urls,
  };

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });

    console.log(`📡 IndexNow API response status: ${res.status} (${res.statusText})`);

    if (res.status === 200 || res.status === 202) {
      console.log(`✅ Successfully submitted ${urls.length} URLs to IndexNow!`);
    } else {
      const text = await res.text();
      console.warn(`⚠️ IndexNow response: ${text}`);
    }
  } catch (err) {
    console.error('❌ Network error submitting to IndexNow:', err);
  }
}

main().catch(console.error);
