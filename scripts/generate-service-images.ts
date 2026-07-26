/**
 * scripts/generate-service-images.ts
 *
 * Generates 12 industry images using the Image Generation skill (z-ai-web-dev-sdk)
 * and saves them to public/images/services/.
 *
 * These images are used for:
 *   - Tenant.coverImage (marketplace provider cards + profile banners)
 *   - Service.image (service thumbnails on provider profile pages)
 *
 * Images are mapped by industry so every service in the same industry shares
 * the industry hero image (keeps the marketplace visually consistent without
 * needing 76 individual API calls).
 *
 * Run: bun run scripts/generate-service-images.ts
 */

import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

interface IndustryImage {
  industry: string;
  filename: string;
  prompt: string;
}

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'images', 'services');

// 12 industries — one hero image each. Prompts are crafted for professional,
// marketplace-quality photography with consistent lighting + composition.
const INDUSTRY_IMAGES: IndustryImage[] = [
  {
    industry: 'hvac',
    filename: 'hvac.jpg',
    prompt: 'Professional HVAC technician in clean uniform servicing a modern air conditioning outdoor unit, bright daylight, suburban home background, professional service photography, high quality, sharp focus, clean composition',
  },
  {
    industry: 'plumbing',
    filename: 'plumbing.jpg',
    prompt: 'Professional plumber in uniform fixing copper pipes under a modern kitchen sink, tools visible, clean bright bathroom lighting, professional service photography, high quality, sharp focus',
  },
  {
    industry: 'electrical',
    filename: 'electrical.jpg',
    prompt: 'Professional electrician in uniform working on a residential electrical panel box, modern home, bright lighting, professional service photography, high quality, sharp focus, clean composition',
  },
  {
    industry: 'cleaning',
    filename: 'cleaning.jpg',
    prompt: 'Professional house cleaning team in uniforms cleaning a bright modern living room, cleaning supplies visible, fresh and spotless, professional service photography, high quality, sharp focus',
  },
  {
    industry: 'landscaping',
    filename: 'landscaping.jpg',
    prompt: 'Beautifully landscaped suburban backyard with manicured green lawn, stone pathway, garden beds with colorful flowers, golden hour lighting, professional photography, high quality, sharp focus',
  },
  {
    industry: 'pest-control',
    filename: 'pest-control.jpg',
    prompt: 'Professional pest control technician in protective uniform spraying exterior of suburban home, equipment visible, bright daylight, professional service photography, high quality, sharp focus',
  },
  {
    industry: 'roofing',
    filename: 'roofing.jpg',
    prompt: 'Professional roofer in safety gear installing asphalt shingles on a residential roof, clear blue sky, bright daylight, professional service photography, high quality, sharp focus, clean composition',
  },
  {
    industry: 'painting',
    filename: 'painting.jpg',
    prompt: 'Professional house painter in white uniform rolling fresh paint on a modern interior wall, paint tray and supplies visible, bright natural lighting, professional service photography, high quality, sharp focus',
  },
  {
    industry: 'locksmith',
    filename: 'locksmith.jpg',
    prompt: 'Professional locksmith in uniform working on a modern door lock with professional tools, close-up shot, bright lighting, professional service photography, high quality, sharp focus, clean composition',
  },
  {
    industry: 'appliance-repair',
    filename: 'appliance-repair.jpg',
    prompt: 'Professional appliance repair technician in uniform diagnosing a modern stainless steel refrigerator, tools and multimeter visible, modern kitchen, bright lighting, professional service photography, high quality, sharp focus',
  },
  {
    industry: 'pool-spa',
    filename: 'pool-spa.jpg',
    prompt: 'Beautiful clean residential swimming pool with crystal clear blue water, modern backyard with lounge chairs, sunny day, professional photography, high quality, sharp focus, vibrant colors',
  },
  {
    industry: 'automotive',
    filename: 'automotive.jpg',
    prompt: 'Professional mechanic in clean uniform inspecting a car engine in a modern auto repair garage, tools visible, bright lighting, professional service photography, high quality, sharp focus, clean composition',
  },
];

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`Generating ${INDUSTRY_IMAGES.length} industry images...`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('');

  const zai = await ZAI.create();
  const results: { industry: string; path: string; success: boolean; error?: string }[] = [];

  for (let i = 0; i < INDUSTRY_IMAGES.length; i++) {
    const { industry, filename, prompt } = INDUSTRY_IMAGES[i];
    const outputPath = path.join(OUTPUT_DIR, filename);

    // Skip if already exists (idempotent — re-runs don't regenerate)
    if (fs.existsSync(outputPath)) {
      console.log(`[${i + 1}/${INDUSTRY_IMAGES.length}] SKIP ${industry} (already exists)`);
      results.push({ industry, path: outputPath, success: true });
      continue;
    }

    console.log(`[${i + 1}/${INDUSTRY_IMAGES.length}] Generating ${industry}...`);
    try {
      const response = await zai.images.generations.create({
        prompt,
        size: '1344x768', // landscape — good for cover images + cards
      });

      if (!response.data?.[0]?.base64) {
        throw new Error('No image data in response');
      }

      const buffer = Buffer.from(response.data[0].base64, 'base64');
      fs.writeFileSync(outputPath, buffer);

      const sizeKB = (buffer.length / 1024).toFixed(1);
      console.log(`  ✓ Saved ${filename} (${sizeKB} KB)`);
      results.push({ industry, path: outputPath, success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ Failed ${industry}: ${msg}`);
      results.push({ industry, path: outputPath, success: false, error: msg });
    }

    // Small delay between calls to be gentle on the API
    if (i < INDUSTRY_IMAGES.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log('');
  console.log('=== Summary ===');
  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  console.log(`✓ Succeeded: ${succeeded.length}/${results.length}`);
  if (failed.length > 0) {
    console.log(`✗ Failed: ${failed.length}`);
    for (const f of failed) console.log(`  - ${f.industry}: ${f.error}`);
  }
  console.log('');
  console.log('Generated images:');
  for (const r of succeeded) {
    console.log(`  /images/services/${path.basename(r.path)}  (${r.industry})`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
