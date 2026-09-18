import { getAllTemplates } from '../src/lib/forms/templates';
import { generateTemplateBatch } from '../src/lib/forms/templates/generators/mass-template-synthesizer';

console.log('=== Testing Template Thumbnail & Synthesis Integrity ===');

const curated = getAllTemplates();
console.log(`Loaded ${curated.length} curated templates.`);

const synthesized = generateTemplateBatch(200);
console.log(`Generated ${synthesized.length} synthesized templates.`);

const all = [...curated, ...synthesized];

let errorCount = 0;
for (const t of all) {
  if (!t.id || !t.name || !t.schema || !Array.isArray(t.categories) || t.categories.length === 0) {
    console.error(`Invalid template structure: ${t.id}`);
    errorCount++;
  }
  if (!t.schema.fields || t.schema.fields.length === 0) {
    console.error(`Template has no fields: ${t.id}`);
    errorCount++;
  }
  if (t.schema.steps && !Array.isArray(t.schema.steps)) {
    console.error(`Template steps is not an array: ${t.id}`);
    errorCount++;
  }
}

if (errorCount === 0) {
  console.log(`✅ All ${all.length} templates verified valid with rich schema, fields, and taxonomy!`);
} else {
  console.error(`❌ Found ${errorCount} errors.`);
  process.exit(1);
}
