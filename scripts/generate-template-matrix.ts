/**
 * CLI Script: Mass Form Template Matrix Generator
 * -----------------------------------------------
 * Usage:
 *   bun run scripts/generate-template-matrix.ts --count=1000
 *   bun run scripts/generate-template-matrix.ts --count=20000
 */

import { generateTemplateBatch, synthesizeTemplate } from '../src/lib/forms/templates/generators/mass-template-synthesizer';
import { TEMPLATE_CATEGORIES } from '../src/lib/forms/templates/taxonomy/categories';
import { TEMPLATE_INDUSTRIES } from '../src/lib/forms/templates/taxonomy/industries';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const args = process.argv.slice(2);
  const countArg = args.find((a) => a.startsWith('--count='));
  const targetCount = countArg ? parseInt(countArg.split('=')[1], 10) : 1000;

  console.log('===========================================================');
  console.log(`🚀 Fieseros Template Matrix Synthesizer (Target: ${targetCount} templates)`);
  console.log('===========================================================');
  console.log(`[Matrix Info] Available Categories: ${TEMPLATE_CATEGORIES.length}`);
  console.log(`[Matrix Info] Available Industries: ${TEMPLATE_INDUSTRIES.length}`);

  const startTime = Date.now();
  const templates = generateTemplateBatch(targetCount);
  const elapsedMs = Date.now() - startTime;

  console.log(`\n✅ Successfully generated ${templates.length} unique form templates in ${elapsedMs}ms!`);

  // Verification checks
  const uniqueSlugs = new Set(templates.map((t) => t.id));
  console.log(`[Integrity] Unique Slugs: ${uniqueSlugs.size} / ${templates.length}`);

  const avgFields = Math.round(
    templates.reduce((sum, t) => sum + (t.schema.fields?.length || 0), 0) / templates.length
  );
  console.log(`[Integrity] Average Fields Per Template: ${avgFields} fields`);

  // Sample snapshot preview
  console.log('\n--- Sample Generated Templates ---');
  templates.slice(0, 5).forEach((t, i) => {
    console.log(`${i + 1}. [${t.categories[0].toUpperCase()} | ${t.industries[0].toUpperCase()}] ${t.name}`);
    console.log(`   Slug: /templates/${t.categories[0]}/${t.id}`);
    console.log(`   Fields (${t.schema.fields.length}): ${t.schema.fields.map((f) => f.label).join(', ')}`);
    console.log(`   SEO Title: ${t.seo.seoTitle}`);
    console.log('');
  });

  // Write snapshot stats
  const outputDir = path.join(__dirname, '../scratch');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'generated_templates_sample.json');
  fs.writeFileSync(outputPath, JSON.stringify(templates.slice(0, 50), null, 2), 'utf-8');
  console.log(`💾 Saved 50 sample schemas to ${outputPath}`);
}

run().catch((err) => {
  console.error('Error generating template matrix:', err);
  process.exit(1);
});
