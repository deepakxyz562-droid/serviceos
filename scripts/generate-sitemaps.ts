/**
 * generate-sitemaps.ts — build-time sitemap generation.
 *
 * Architecture (see src/lib/sitemap/):
 *   - 10 business sitemap files (1-10) assigned by SHA-256(tenantId)[0] % 10
 *   - 1 static file (0.xml) for non-business URLs
 *   - 1 sitemap index (sitemap.xml) listing all 11 files
 *
 * Source of truth: Supabase Storage bucket "sitemaps" (persistent across
 * container redeployments — runtime route handlers fetch from there).
 *
 * This script:
 *   1. Calls forceFullRegeneration() which generates all 11 XML files
 *      and uploads them to Supabase Storage.
 *   2. ALSO writes the just-uploaded files to public/sitemap/ + public/sitemap.xml
 *      as build-time fallbacks (baked into the Docker image, used during
 *      cold starts before the runtime route can fetch from Storage).
 *
 * Graceful degradation: this script runs during `next build` AND inside the
 * Docker image build. The DB/Supabase is typically NOT reachable during
 * Docker image build, so any failure is logged + the script exits 0 to
 * avoid breaking the build. The runtime sitemap route handlers will
 * regenerate the files on first request via the daily cron.
 */
import fs from 'fs';
import path from 'path';
import { forceFullRegeneration } from '../src/lib/sitemap';
import { fetchSitemapFile } from '../src/lib/sitemap/storage';
import { TOTAL_SITEMAP_FILES } from '../src/lib/sitemap/hash';

async function generate() {
  console.log('🏁 Starting sitemap generation (10-file hash-based split)...');

  const publicDir = path.resolve(__dirname, '../public');
  const sitemapDir = path.join(publicDir, 'sitemap');

  // Ensure directories exist
  if (!fs.existsSync(sitemapDir)) {
    fs.mkdirSync(sitemapDir, { recursive: true });
  }

  try {
    // ── 1. Upload all files to Supabase Storage (source of truth) ──────────
    console.log('📤 Uploading to Supabase Storage...');
    const result = await forceFullRegeneration();
    console.log(`  Static (0.xml): ${result.staticOk ? '✅' : '❌'}`);
    console.log('  Business files:');
    for (const r of result.businessResults) {
      console.log(`    ${r.fileNumber}.xml: ${r.ok ? '✅' : '❌'}`);
    }
    console.log(`  Index (sitemap.xml): ${result.indexOk ? '✅' : '❌'}`);

    // ── 2. Write build-time fallback files to public/sitemap/ ──────────────
    // These get baked into the Docker image and serve as a cold-start
    // fallback before the runtime route handler can fetch from Storage.
    console.log('📁 Writing build-time fallback files to public/sitemap/...');

    // Write all files 0..10 (0 = static, 1-10 = business)
    for (let i = 0; i < TOTAL_SITEMAP_FILES; i++) {
      const xml = await fetchSitemapFile(i);
      if (xml) {
        fs.writeFileSync(path.join(sitemapDir, `${i}.xml`), xml, 'utf-8');
        console.log(`  ✅ public/sitemap/${i}.xml`);
      } else {
        console.warn(`  ⚠️  Could not fetch sitemap/${i}.xml from Storage — skipping fallback write`);
      }
    }

    // Write the sitemap index to public/sitemap.xml
    const indexXml = await fetchSitemapFile('index');
    if (indexXml) {
      fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), indexXml, 'utf-8');
      console.log('  ✅ public/sitemap.xml');
    } else {
      console.warn('  ⚠️  Could not fetch sitemap index from Storage — skipping fallback write');
    }

    console.log('🎉 Sitemap generation completed successfully!');
    process.exit(0);
  } catch (error) {
    // Non-fatal: during Docker image build, neither DB nor Supabase Storage
    // is reachable. The runtime sitemap route handlers + daily cron will
    // regenerate the files on the first request after deployment.
    console.warn(
      '⚠️ Sitemap generation skipped during build phase (DB/Storage not reachable during image build):',
      error,
    );
    process.exit(0);
  }
}

generate();
