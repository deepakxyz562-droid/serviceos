#!/usr/bin/env node
/**
 * Rebrand script: ServiceOS → Fieseros
 * =====================================
 *
 * Performs a coordinated find-replace across the entire codebase
 * (excluding node_modules, .next, .git, standalone which is handled
 * separately, and this script itself).
 *
 * Replacement order matters:
 *   1. "serviceos.cc" → "fieseros.com"  (domain — BEFORE generic serviceos)
 *   2. "ServiceOS"    → "Fieseros"       (PascalCase brand name)
 *   3. "SERVICEOS"    → "FIESEROS"       (all-caps if any)
 *   4. "serviceos"    → "fieseros"       (remaining lowercase: emails, cache, identifiers)
 *
 * This script does NOT touch:
 *   - node_modules/, .next/, .git/
 *   - standalone/ (handled separately — it's a build artifact copy)
 *   - This script file itself
 *   - brand.ts (already correct)
 *   - Binary files (images, fonts, .db)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'standalone',
  'dev.log',
]);
const SKIP_FILES = new Set(['rebrand.js', 'brand.ts']);
const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.db', '.sqlite', '.db-journal',
  '.zip', '.gz', '.tar',
  '.pdf', '.doc', '.docx',
]);

const replacements = [
  ['serviceos.cc', 'fieseros.com'],
  ['ServiceOS', 'Fieseros'],
  ['SERVICEOS', 'FIESEROS'],
  ['serviceos', 'fieseros'],
];

let filesChanged = 0;
let totalReplacements = 0;
const changedFiles = [];

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXT.has(ext)) return false;
  return true;
}

function processFile(filePath) {
  if (!isTextFile(filePath)) return;

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return; // skip unreadable
  }

  let newContent = content;
  let fileReplacements = 0;

  for (const [from, to] of replacements) {
    // Count occurrences
    const count = newContent.split(from).length - 1;
    if (count > 0) {
      newContent = newContent.split(from).join(to);
      fileReplacements += count;
    }
  }

  if (fileReplacements > 0) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    filesChanged++;
    totalReplacements += fileReplacements;
    changedFiles.push(path.relative(ROOT, filePath));
  }
}

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(entry.name)) continue;
      processFile(fullPath);
    }
  }
}

console.log('🔄 Starting rebrand: ServiceOS → Fieseros\n');
console.log(`   Root: ${ROOT}\n`);

walk(ROOT);

console.log(`\n✅ Rebrand complete!\n`);
console.log(`   Files changed: ${filesChanged}`);
console.log(`   Total replacements: ${totalReplacements}`);
console.log(`\n📝 Changed files:`);
changedFiles.sort().forEach((f) => console.log(`   ${f}`));
