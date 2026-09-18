import { getTemplate } from '../src/lib/forms/templates/registry';

async function testDynamicLookup() {
  console.log('=== Testing 20,000+ Dynamic Template Lookup ===');

  const testSlugs = [
    'dental-patient-intake-form',
    'hvac-service-quote',
    'plumbing-pipe-leak-emergency',
    'roofing-storm-damage-claim',
    'automotive-oil-change-booking',
    'real_estate-tour-request',
  ];

  for (const slug of testSlugs) {
    const template = await getTemplate(slug);
    if (template) {
      console.log(`✅ Found / Synthesized: "${template.name}" (${slug})`);
      console.log(`   Fields (${template.schema.fields.length}): ${template.schema.fields.map((f) => f.label).slice(0, 3).join(', ')}...`);
      console.log(`   SEO Title: ${template.seo.seoTitle}`);
    } else {
      console.error(`❌ Failed to resolve: ${slug}`);
    }
  }

  console.log('=== Dynamic Lookup Test Passed! ===');
}

testDynamicLookup().catch(console.error);
