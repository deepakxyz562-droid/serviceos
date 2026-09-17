/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Icon verification for maps widgets — ensures every named import
 * pulled from 'lucide-react' in src/features/forms/components/runtime/widgets/maps/
 * actually exists in the installed lucide-react package.
 *
 * Usage: node scripts/verify-maps-icons.cjs
 */
const fs = require('fs');
const path = require('path');
const L = require('lucide-react');

const dir = path.resolve(
  __dirname,
  '..',
  'src',
  'features',
  'forms',
  'components',
  'runtime',
  'widgets',
  'maps',
);

const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => path.join(dir, f));

// Match: import { A, B as C, D } from 'lucide-react';
const importRe = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;

const missing = new Set();
const used = new Set();
let scanned = 0;

for (const file of files) {
  scanned++;
  const src = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = importRe.exec(src)) !== null) {
    const names = m[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (let n of names) {
      // Handle `Foo as Bar` — check `Foo` (the source name).
      const srcName = n.split(/\s+as\s+/)[0].trim();
      used.add(srcName);
      if (!(srcName in L)) {
        missing.add(`${path.basename(file)} → ${srcName}`);
      }
    }
  }
}

console.log(`Scanned ${scanned} files in maps/.`);
console.log(`Distinct lucide-react icons referenced: ${used.size}`);
if (missing.size === 0) {
  console.log('PASS: all icons exist in lucide-react.');
  process.exit(0);
} else {
  console.log(`MISSING ${missing.size} icon(s):`);
  for (const x of missing) console.log('  - ' + x);
  process.exit(1);
}
