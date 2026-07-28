/**
 * Seed Stock Photos — category-based stock photo URLs + download/upload utility
 * for marketplace seed listings.
 *
 * PROBLEM: When businesses are seeded (from OpenStreetMap or demo data), each
 * Tenant gets a random rating + review count but NO cover image. The
 * marketplace ProviderCard shows a plain gradient banner when coverImage is
 * null — visually flat and indistinguishable across businesses.
 *
 * SOLUTION: Map each industry category to 1-3 stock photo URLs (Unsplash
 * direct hotlinks — no API key required). The seed script calls
 * downloadAndUploadCover() which downloads one (round-robin by index),
 * uploads it to S3 / local filesystem, and returns a durable URL to store
 * as tenant.coverImage.
 *
 * WHY DOWNLOAD+UPLOAD INSTEAD OF DIRECT HOTLINK?
 *   Direct Unsplash hotlinks are fragile — photo IDs can be deprecated or
 *   rate-limited. Downloading once and storing durably (S3 or local FS)
 *   means the URL survives even if the Unsplash photo is later removed.
 *
 * GRACEFUL FAILURE: If a download fails (404, timeout, network error),
 * downloadAndUploadCover() returns null — the caller leaves coverImage null
 * and the ProviderCard falls back to its gradient banner. No crash.
 *
 * LOGO FIELD: Intentionally NOT touched — per user instruction. Only
 * coverImage is populated by this module.
 */

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ─── Verified real Unsplash photo IDs ────────────────────────────────────────
// All 15 photo IDs below are verified working (HTTP 200) via smoke test.
// 3 IDs from an older version (HVAC, ELECTRICAL, AUTOMOTIVE) were found to
// be broken (HTTP 404) and have been removed.
const PLUMBING = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=1200&h=600&fit=crop&q=80';
const TOOLS = 'https://images.unsplash.com/photo-1572025442646-866d16c84a54?w=1200&h=600&fit=crop&q=80';
const CLEANING = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&h=600&fit=crop&q=80';
const LANDSCAPING = 'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1200&h=600&fit=crop&q=80';
const PAINTING = 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=1200&h=600&fit=crop&q=80';
const APPLIANCE = 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=1200&h=600&fit=crop&q=80';
const POOL = 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&h=600&fit=crop&q=80';

// ─── Additional Unsplash photos for broader category coverage ───────────────
// All verified working (HTTP 200) via smoke test.
const CONSTRUCTION = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&h=600&fit=crop&q=80';
const OFFICE = 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&h=600&fit=crop&q=80';
const COMPUTER = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=600&fit=crop&q=80';
const SOLAR = 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=600&fit=crop&q=80';
const WELLNESS = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&h=600&fit=crop&q=80';
const RETAIL = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop&q=80';
const TRUCK = 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&h=600&fit=crop&q=80';
const SECURITY = 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1200&h=600&fit=crop&q=80';

// ─── Category → stock photo URL map ─────────────────────────────────────────
//
// Each industry ID maps to 1-3 photo URLs. The seed script picks one
// (round-robin by business index) so consecutive businesses in the same
// category get different covers where possible.
//
// Categories without a dedicated photo reuse the closest thematic match.
export const SEED_STOCK_PHOTOS: Record<string, string[]> = {
  // ── Trades ───────────────────────────────────────────────────────────────
  plumbing: [PLUMBING, TOOLS],
  hvac: [TOOLS, CONSTRUCTION],
  electrical: [TOOLS, CONSTRUCTION],
  cleaning: [CLEANING],
  landscaping: [LANDSCAPING],
  painting: [PAINTING],
  'appliance-repair': [APPLIANCE, TOOLS],
  'pool-spa': [POOL, CLEANING],

  // ── Construction-adjacent ────────────────────────────────────────────────
  construction: [CONSTRUCTION, TOOLS],
  roofing: [CONSTRUCTION, TOOLS],
  flooring: [PAINTING, CONSTRUCTION],

  // ── Home & property services ─────────────────────────────────────────────
  'home-services': [CLEANING, TOOLS],
  handyman: [TOOLS, CONSTRUCTION],
  'window-cleaning': [CLEANING],
  'junk-removal': [TRUCK, LANDSCAPING],
  moving: [TRUCK],
  'pest-control': [CLEANING, TOOLS],
  locksmith: [SECURITY, TOOLS],
  security: [SECURITY],

  // ── Professional & tech ──────────────────────────────────────────────────
  'it-services': [COMPUTER, OFFICE],
  'professional-services': [OFFICE],
  solar: [SOLAR, TOOLS],

  // ── Other categories ─────────────────────────────────────────────────────
  automotive: [TRUCK, TOOLS],
  'health-wellness': [WELLNESS, CLEANING],
  retail: [RETAIL, OFFICE],
  'fabric-textile': [PAINTING, RETAIL],
  others: [OFFICE, CLEANING, TOOLS],
};

// ─── Fallback (used if industry ID is not in the map at all) ────────────────
const FALLBACK_PHOTOS = [OFFICE, CLEANING, TOOLS];

/**
 * Pick a stock photo URL for a given industry, rotating by index so
 * consecutive businesses in the same category get different covers.
 *
 * @param industry  Industry ID (e.g. "plumbing", "hvac", "others")
 * @param index     Business index within the seed run (0-based). Used for
 *                  round-robin selection when a category has multiple photos.
 * @returns         A direct Unsplash photo URL.
 */
export function pickStockPhotoUrl(industry: string, index: number): string {
  const photos = SEED_STOCK_PHOTOS[industry];
  if (photos && photos.length > 0) {
    return photos[index % photos.length];
  }
  return FALLBACK_PHOTOS[index % FALLBACK_PHOTOS.length];
}

/**
 * Check whether S3 is configured (all 3 env vars present).
 * Used to decide between S3 upload vs. local file save.
 */
export function isS3ConfiguredForSeed(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
}

// ─── S3 Client (lazy-init) ──────────────────────────────────────────────────

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (_s3Client) return _s3Client;
  if (!isS3ConfiguredForSeed()) return null;
  _s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  return _s3Client;
}

// ─── Download + Upload utility ──────────────────────────────────────────────

/**
 * Download a category-relevant stock photo from Unsplash and upload it to
 * S3 (if configured) or save to the local filesystem.
 *
 * @param industry  Industry ID (used to pick the photo)
 * @param index     Business index (for round-robin selection)
 * @param slug      Tenant slug (used as the filename)
 * @param userAgent User-Agent header for the Unsplash request
 * @returns         The durable URL of the stored image, or null on failure.
 */
export async function downloadAndUploadCover(
  industry: string,
  index: number,
  slug: string,
  userAgent = 'ServiceOS-Seed/1.0',
): Promise<string | null> {
  const sourceUrl = pickStockPhotoUrl(industry, index);
  const fileName = `${slug}.jpg`;

  // ── Download from Unsplash ─────────────────────────────────────────────
  let buffer: Buffer;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch(sourceUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': userAgent,
          Accept: 'image/*',
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      buffer = Buffer.from(await res.arrayBuffer());
    } finally {
      clearTimeout(t);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`    ⚠ Cover download failed: ${msg}`);
    return null;
  }

  // ── Priority 1: Upload to S3 ───────────────────────────────────────────
  const s3 = getS3Client();
  if (s3 && process.env.AWS_S3_BUCKET) {
    try {
      const key = `marketplace-covers/${fileName}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: 'image/jpeg',
          ACL: 'public-read',
        }),
      );
      const region = process.env.AWS_REGION || 'us-east-1';
      const url = `https://${process.env.AWS_S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;
      return url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`    ⚠ S3 upload failed, falling back to local: ${msg}`);
      // Fall through to local
    }
  }

  // ── Priority 2: Local filesystem fallback ──────────────────────────────
  try {
    const localDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'marketplace-covers',
    );
    await mkdir(localDir, { recursive: true });
    const localPath = path.join(localDir, fileName);
    await writeFile(localPath, buffer);
    return `/uploads/marketplace-covers/${fileName}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`    ⚠ Local save failed: ${msg}`);
    return null;
  }
}
