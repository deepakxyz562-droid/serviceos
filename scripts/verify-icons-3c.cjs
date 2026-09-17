const fs = require('fs');
const path = require('path');
const lr = require('lucide-react');

const dirs = [
  'src/features/forms/components/runtime/widgets/ecommerce',
  'src/features/forms/components/runtime/widgets/finance',
  'src/features/forms/components/runtime/widgets/marketing',
];

const iconRe = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g;
const files = [];
for (const d of dirs) {
  for (const f of fs.readdirSync(d)) if (f.endsWith('.tsx')) files.push(path.join(d, f));
}

const unique = new Set();
let totalImports = 0;
const perFile = {};
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  perFile[file] = [];
  let m;
  while ((m = iconRe.exec(src)) !== null) {
    const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    for (const n of names) { unique.add(n); totalImports++; perFile[file].push(n); }
  }
}

const missing = [...unique].filter((n) => !(n in lr));
console.log('files scanned:', files.length);
console.log('total icon imports:', totalImports);
console.log('unique icons:', unique.size);
console.log('missing:', missing);
if (missing.length === 0) console.log('PASS: all icons exist in lucide-react');
