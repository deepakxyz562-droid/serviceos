import { getAllTemplates, getTemplateSync } from '../src/lib/forms/templates';

async function testPrerenderAllTemplates() {
  console.log('=== Simulating SSR / Static Prerender for All Templates ===');
  const all = getAllTemplates();
  console.log(`Checking ${all.length} canonical templates...`);

  let errorCount = 0;

  for (const t of all) {
    try {
      const template = getTemplateSync(t.id);
      if (!template) {
        throw new Error(`Template not found: ${t.id}`);
      }

      // Simulate the exact checks performed in /templates/[category]/[slug]/page.tsx
      const fieldCount = template.schema.fields?.length || 0;
      const stepCount = template.schema.steps?.length || 1;
      const categoriesCount = template.categories.length;
      const industriesCount = template.industries.filter((i) => i !== 'general').length;

      if (fieldCount === 0) {
        console.warn(`[Warning] ${t.id} has 0 fields`);
      }

      // Validate JSON-LD generation
      const faqJsonLd = template.seo?.faq && template.seo.faq.length > 0
        ? {
            mainEntity: template.seo.faq.map((f) => ({ question: f.question, answer: f.answer })),
          }
        : null;

    } catch (err: any) {
      console.error(`❌ Error rendering template ${t.id}:`, err.message);
      errorCount++;
    }
  }

  if (errorCount === 0) {
    console.log(`✅ All ${all.length} templates passed prerender simulation with 0 errors!`);
  } else {
    console.error(`❌ Found ${errorCount} errors during prerendering!`);
    process.exit(1);
  }
}

testPrerenderAllTemplates().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
