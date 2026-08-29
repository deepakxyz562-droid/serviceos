/**
 * generate-sitemaps.ts — build-time sitemap generation.
 *
 * Architecture (see src/lib/sitemap/):
 *   - 4 sitemap files with simple URLs (no index):
 *     sitemap.xml, sitemap1.xml, sitemap2.xml, sitemap3.xml
 *   - Each file contains ~23,500 businesses (hash-based bucketing)
 *   - sitemap.xml also includes static URLs (services, blog, legal, etc.)
 *
 * Source of truth: Supabase Storage bucket "sitemaps" (persistent across
 * container redeployments — runtime route handlers fetch from there).
 *
 * This script:
 *   1. Calls forceFullRegeneration() which generates all 4 XML files
 *      and uploads them to Supabase Storage + /tmp.
 *   2. ALSO writes the just-uploaded files to public/sitemap/ as build-time
 *      fallbacks (baked into the Docker image).
 *
 * Graceful degradation: this script runs during `next build` AND inside the
 * Docker image build. The DB/Supabase is typically NOT reachable during
 * Docker image build, so any failure is logged + the script exits 0 to
 * avoid breaking the build. The daily cron will regenerate the files.
 */
import fs from 'fs';
import path from 'path';
import { forceFullRegeneration } from '../src/lib/sitemap';
import { fetchSitemapFile } from '../src/lib/sitemap/storage';
import { getSitemapFileName, getAllBusinessFileNumbers } from '../src/lib/sitemap/hash';
import { extractAllStaticDates } from './extract-git-lastmod';

async function generate() {
  console.log('🏁 Starting sitemap generation (4-file hash-based split)...');

  try {
    console.log('🔍 Extracting Git commit dates for static routes...');
    extractAllStaticDates();
  } catch (err) {
    console.warn('⚠️  Could not extract Git dates, using existing static-page-dates.json fallback:', err);
  }

  const publicDir = path.resolve(__dirname, '../public');
  const sitemapDir = path.join(publicDir, 'sitemap');

  // Ensure directory exists
  if (!fs.existsSync(sitemapDir)) {
    fs.mkdirSync(sitemapDir, { recursive: true });
  }

  try {
    // ── 1. Upload all 4 files to Supabase Storage + /tmp ───────────────────
    console.log('📤 Generating + uploading 4 sitemap files...');
    const result = await forceFullRegeneration();
    console.log('  Files:');
    for (const r of result.results) {
      console.log(`    ${r.fileName}: ${r.ok ? '✅' : '❌'}`);
    }

    // ── 2. Write build-time fallback files to public/sitemap/ ──────────────
    // These get baked into the Docker image and serve as a cold-start
    // fallback before the cron runs.
    console.log('📁 Writing build-time fallback files to public/sitemap/...');

    for (const fileNumber of getAllBusinessFileNumbers()) {
      const fileName = getSitemapFileName(fileNumber);
      const xml = await fetchSitemapFile(fileName);
      if (xml) {
        fs.writeFileSync(path.join(sitemapDir, fileName), xml, 'utf-8');
        console.log(`  ✅ public/sitemap/${fileName}`);
      } else {
        console.warn(`  ⚠️  Could not fetch ${fileName} — skipping fallback write`);
      }
    }

    console.log('🎉 Sitemap generation completed successfully!');
    process.exit(0);
  } catch (error) {
    // Non-fatal: during Docker image build, neither DB nor Supabase Storage
    // is reachable. The daily cron will regenerate the files after deployment.
    console.warn(
      '⚠️ Sitemap generation skipped during build phase (DB/Storage not reachable during image build):',
      error,
    );
    process.exit(0);
  }
}

generate();
