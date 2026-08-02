/**
 * backfill-tenant-cover-images.ts
 *
 * One-time backfill script (Concern #2 SEO fix).
 *
 * Problem: Existing tenants in the database have `coverImage = null` (and no
 * logo, and empty galleries) because they were seeded before the
 * `defaultCoverImageForIndustry()` fallback was added to seed-marketplace.ts.
 * This causes the public business hub page to render `robots: { index: false }`
 * (the "rich enough" isIndexable gate fails on `hasImage`), excluding them
 * from Google's index AND omitting them from the sitemap.
 *
 * Fix: For every tenant where `coverImage IS NULL AND logo IS NULL AND
 * galleryJson IS empty`, set `coverImage` to the industry-appropriate default.
 * This makes them pass the isIndexable gate without changing any tenant that
 * already has a real image.
 *
 * Safe to run multiple times — only touches rows that still need backfilling.
 * Idempotent: skips tenants that already have a coverImage, logo, or gallery.
 *
 * Usage:  bun run scripts/backfill-tenant-cover-images.ts
 */

import { db } from '../src/lib/db';

/**
 * Map an industry string to a default cover image. MUST stay in sync with
 * the same function in src/lib/public-business.ts and prisma/seed-marketplace.ts.
 */
function defaultCoverImageForIndustry(industry: string | null): string {
  const i = (industry || '').toLowerCase();
  if (i.includes('plumb')) return '/images/landing/industries.webp';
  if (i.includes('hvac') || i.includes('air cond') || i.includes('heating') || i.includes('cooling'))
    return '/images/landing/industries.webp';
  if (i.includes('electric')) return '/images/landing/industries.webp';
  if (i.includes('clean')) return '/images/landing/pillar-communication.png';
  if (i.includes('pest')) return '/images/landing/industries.webp';
  if (i.includes('mov')) return '/images/landing/industries.webp';
  if (i.includes('landscape') || i.includes('lawn') || i.includes('garden'))
    return '/images/landing/industries.webp';
  if (i.includes('roof')) return '/images/landing/industries.webp';
  if (i.includes('paint')) return '/images/landing/industries.webp';
  if (i.includes('auto') || i.includes('car') || i.includes('mechanic'))
    return '/images/landing/industries.webp';
  if (i.includes('locksmith')) return '/images/landing/industries.webp';
  if (i.includes('appliance')) return '/images/landing/industries.webp';
  if (i.includes('pool') || i.includes('spa')) return '/images/landing/industries.webp';
  if (i.includes('salon') || i.includes('spa') || i.includes('beauty'))
    return '/images/landing/pillar-crm.png';
  if (i.includes('pet') || i.includes('vet') || i.includes('groom'))
    return '/images/landing/pillar-crm.png';
  if (i.includes('food') || i.includes('restaurant') || i.includes('cater'))
    return '/images/landing/pillar-finance.png';
  if (i.includes('photo')) return '/images/landing/pillar-crm.png';
  if (i.includes('tutor') || i.includes('education') || i.includes('teach'))
    return '/images/landing/pillar-crm.png';
  if (i.includes('handyman') || i.includes('handy')) return '/images/landing/industries.webp';
  return '/images/landing/industries.webp';
}

function isGalleryEmpty(galleryJson: string | null): boolean {
  if (!galleryJson) return true;
  try {
    const parsed = JSON.parse(galleryJson);
    return !Array.isArray(parsed) || parsed.length === 0;
  } catch {
    return true;
  }
}

async function main() {
  console.log('=== Backfill Tenant Cover Images (SEO fix) ===\n');

  // Find all tenants that are missing all three image sources.
  // These are the ones failing the isIndexable `hasImage` gate.
  const tenants = await db.tenant.findMany({
    where: {
      publicProfileEnabled: true,
      coverImage: null,
      logo: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      industry: true,
      coverImage: true,
      logo: true,
      galleryJson: true,
    },
  });

  console.log(`Found ${tenants.length} tenant(s) with no coverImage, no logo.`);

  let backfilled = 0;
  let skippedHasGallery = 0;

  for (const t of tenants) {
    // Skip tenants that have a gallery (they already pass hasImage).
    if (!isGalleryEmpty(t.galleryJson)) {
      skippedHasGallery++;
      continue;
    }

    const coverImage = defaultCoverImageForIndustry(t.industry);
    try {
      await db.tenant.update({
        where: { id: t.id },
        data: { coverImage },
      });
      backfilled++;
      console.log(`  ✓ ${t.name} (${t.industry || 'unknown'}) → ${coverImage}`);
    } catch (err) {
      console.error(`  ✗ Failed to update ${t.name} (${t.id}):`, err);
    }
  }

  console.log('\n=== Backfill Complete ===');
  console.log(`Total candidates:    ${tenants.length}`);
  console.log(`Backfilled:          ${backfilled}`);
  console.log(`Skipped (has gallery): ${skippedHasGallery}`);

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error('Backfill failed:', e);
  await db.$disconnect();
  process.exit(1);
});
