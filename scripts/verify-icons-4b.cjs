// Verify every lucide-react icon used in the new Phase 4 builder .tsx files exists.
const fs = require('fs');
const path = require('path');
const Lucide = require('lucide-react');

const dir = '/home/z/my-project/src/features/forms/components/builder';
const files = [
  'theme-marketplace.tsx',
  'template-gallery.tsx',
  'pdf-report-builder.tsx',
  'webhook-builder.tsx',
  'submission-inbox.tsx',
  'submission-pdf-download.tsx',
  'submission-assignment.tsx',
  'submission-internal-notes.tsx',
  'form-password-protection.tsx',
  'form-expiration.tsx',
  'form-ab-testing.tsx',
  'form-embed-snippet.tsx',
];

const iconImportRe = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;
const allIcons = new Set();
let totalRefs = 0;

for (const file of files) {
  const full = path.join(dir, file);
  if (!fs.existsSync(full)) {
    console.log(`MISSING FILE: ${file}`);
    continue;
  }
  const src = fs.readFileSync(full, 'utf8');
  let m;
  while ((m = iconImportRe.exec(src)) !== null) {
    const icons = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    for (const icon of icons) {
      // Handle `Name as Alias` syntax — check the original name, not the alias.
      const base = icon.split(/\s+as\s+/)[0].trim();
      if (base) allIcons.add(base);
    }
  }
}

const missing = [];
for (const name of allIcons) {
  totalRefs++;
  if (!(name in Lucide)) missing.push(name);
}

console.log(`Checked ${allIcons.size} unique icons across ${files.length} files.`);
if (missing.length === 0) {
  console.log('ALL_OK');
} else {
  console.log('MISSING: ' + missing.join(', '));
}
