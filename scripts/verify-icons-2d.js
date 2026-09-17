// Verify all lucide-react icons used in embed/ and social/ widgets exist.
const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'node_modules', 'lucide-react', 'dist', 'esm', 'icons');
const WIDGET_DIRS = [
  path.join(__dirname, '..', 'src', 'features', 'forms', 'components', 'runtime', 'widgets', 'embed'),
  path.join(__dirname, '..', 'src', 'features', 'forms', 'components', 'runtime', 'widgets', 'social'),
];

const ICON_RE = /(?:from 'lucide-react'|from "lucide-react")/g;
const NAMED_RE = /\{\s*([^}]+)\s*\}/g;

const availableIcons = new Set(
  fs.readdirSync(ICONS_DIR)
    .filter(f => f.endsWith('.js'))
    .map(f => f.replace(/\.js$/, ''))
);

// Convert PascalCase to kebab-case for matching against file names.
const toKebab = (name) => name
  .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
  .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
  .replace(/([a-zA-Z])(\d)/g, '$1-$2')
  .toLowerCase();

function extractIcons(fileContent) {
  // Match `import { X, Y as Z } from 'lucide-react'`
  const icons = new Set();
  const re = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;
  let m;
  while ((m = re.exec(fileContent)) !== null) {
    const names = m[1].split(',').map(s => s.trim()).filter(Boolean);
    for (const name of names) {
      // Handle "X as Y" — only check the original name (X)
      const orig = name.split(/\s+as\s+/)[0].trim();
      if (orig) icons.add(orig);
    }
  }
  return icons;
}

let totalFiles = 0;
let totalIcons = 0;
const missing = {};
const allUsed = new Set();

for (const dir of WIDGET_DIRS) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const icons = extractIcons(content);
    if (icons.size === 0) continue;
    totalFiles++;
    const relPath = path.relative(path.join(__dirname, '..'), filePath);
    for (const icon of icons) {
      totalIcons++;
      allUsed.add(icon);
      const kebab = toKebab(icon);
      if (!availableIcons.has(kebab)) {
        if (!missing[relPath]) missing[relPath] = [];
        missing[relPath].push(`${icon} (looked for ${kebab}.js)`);
      }
    }
  }
}

console.log(`Scanned ${totalFiles} widget files`);
console.log(`Total icon imports: ${totalIcons} (unique: ${allUsed.size})`);
console.log('');

const missingFiles = Object.keys(missing);
if (missingFiles.length === 0) {
  console.log('PASS: All lucide-react icons used exist.');
} else {
  console.log(`FAIL: ${missingFiles.length} files have missing icons:`);
  for (const file of missingFiles) {
    console.log(`  ${file}: ${missing[file].join(', ')}`);
  }
  process.exit(1);
}
