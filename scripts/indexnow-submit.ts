#!/usr/bin/env node
/**
 * scripts/indexnow-submit.ts
 * ==========================
 * Post-deploy script: submit all indexable URLs to IndexNow.
 *
 * Run this after every deploy that adds or meaningfully changes public
 * content (blog posts, SEO cornerstone pages, legal pages, business profiles).
 *
 * Usage:
 *   bun run scripts/indexnow-submit.ts           # submit entire sitemap
 *   bun run scripts/indexnow-submit.ts --blog    # submit only /blog/* URLs
 *
 * What it does:
 *   1. Fetches https://fieseros.com/sitemap.xml (or $NEXT_PUBLIC_APP_URL)
 *   2. Extracts every <loc> URL
 *   3. POSTs them to api.indexnow.org/indexnow in batches of 1000
 *   4. Prints a summary
 *
 * This complements the automatic per-tenant submissions wired into the
 * /api/tenants/* PATCH endpoints (which fire in real time when a business
 * profile changes). This script covers everything else — especially blog
 * posts, which are MDX files and change via git deploy, not via an API call.
 *
 * Exit codes:
 *   0 — all submissions accepted (HTTP 200/202)
 *   1 — at least one submission failed or was rejected
 *   2 — sitemap fetch failed
 */

import { INDEXNOW_KEY, INDEXNOW_KEY_LOCATION } from '../src/lib/indexnow';

const ENDPOINT = 'https://api.indexnow.org/indexnow';
const BATCH = 1000;

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com';
}

async function fetchSitemapUrls(): Promise<string[]> {
  const url = `${siteUrl()}/sitemap.xml`;
  console.log(`→ Fetching sitemap: ${url}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) {
    console.error(`✗ Sitemap fetch failed: HTTP ${res.status}`);
    process.exit(2);
  }
  const xml = await res.text();
  const locMatches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
  return locMatches
    .map((m) => m.replace(/<\/?loc>/g, '').trim())
    .filter((u) => u.startsWith('http'));
}

async function submitBatch(urls: string[]): Promise<{ ok: boolean; status: number }> {
  const payload = {
    host: new URL(siteUrl()).hostname,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: urls,
  };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  return { ok: res.status === 200 || res.status === 202, status: res.status };
}

async function main() {
  const onlyBlog = process.argv.includes('--blog');

  // IndexNow is pointless in non-production — skip to avoid pinging from
  // localhost/staging URLs.
  if (process.env.NODE_ENV !== 'production' && !process.argv.includes('--force')) {
    console.log('⚠ NODE_ENV is not "production" — IndexNow submissions are skipped.');
    console.log('  To force a submission anyway, pass --force.');
    process.exit(0);
  }

  let urls = await fetchSitemapUrls();
  console.log(`→ Found ${urls.length} URLs in sitemap`);

  if (onlyBlog) {
    urls = urls.filter((u) => u.includes('/blog/'));
    console.log(`→ Filtered to ${urls.length} blog URLs (--blog flag)`);
  }

  if (urls.length === 0) {
    console.log('ℹ No URLs to submit.');
    process.exit(0);
  }

  let totalSubmitted = 0;
  let allOk = true;
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    console.log(`→ Submitting batch ${Math.floor(i / BATCH) + 1} (${batch.length} URLs)...`);
    try {
      const result = await submitBatch(batch);
      totalSubmitted += batch.length;
      if (result.ok) {
        console.log(`  ✓ Accepted (HTTP ${result.status})`);
      } else {
        allOk = false;
        console.log(`  ✗ Rejected (HTTP ${result.status})`);
      }
    } catch (err) {
      allOk = false;
      console.error(`  ✗ Network error:`, err instanceof Error ? err.message : err);
    }
  }

  console.log('');
  console.log(`═══ IndexNow submission summary ═══`);
  console.log(`  Total URLs: ${urls.length}`);
  console.log(`  Submitted:  ${totalSubmitted}`);
  console.log(`  Result:     ${allOk ? '✓ All accepted' : '✗ Some failed'}`);
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
