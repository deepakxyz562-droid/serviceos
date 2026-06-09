#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Post-build cleanup: Remove unnecessary large files from standalone output
 * to reduce deployment package size.
 */
const fs = require('fs');
const path = require('path');

const standaloneModules = path.join(__dirname, '..', '.next', 'standalone', 'node_modules');

if (!fs.existsSync(standaloneModules)) {
  console.log('No standalone output found, skipping cleanup');
  process.exit(0);
}

function rm(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`  Removed: ${path.relative(standaloneModules, target)}`);
  }
}

console.log('Cleaning up standalone output...');

// Remove sharp/image processing (not needed - images.unoptimized = true)
rm(path.join(standaloneModules, 'typescript'));
rm(path.join(standaloneModules, '@img'));

// Remove Prisma engines for platforms we don't deploy to
// KEEP: libquery_engine-debian-openssl-3.0.x.so.node (needed for production)
// KEEP: libquery_engine-linux-musl.so.node (needed for Alpine/Docker)
rm(path.join(standaloneModules, '.prisma', 'client', 'libquery_engine-debian-openssl-1.1.x.so.node'));
rm(path.join(standaloneModules, '.prisma', 'client', 'libquery_engine-rhel-openssl-3.0-x64.so.node'));

// Remove Prisma WASM compilers for databases we don't use (only need sqlite)
const nonSqliteDbs = ['mysql', 'postgresql', 'sqlserver', 'cockroachdb'];
nonSqliteDbs.forEach(db => {
  ['query_compiler_bg', 'query_engine_bg'].forEach(prefix => {
    rm(path.join(standaloneModules, '@prisma', 'client', 'runtime', `${prefix}.${db}.wasm-base64.js`));
    rm(path.join(standaloneModules, '@prisma', 'client', 'runtime', `${prefix}.${db}.wasm-base64.mjs`));
  });
  rm(path.join(standaloneModules, '.prisma', 'client', `query_engine_bg.${db}.wasm`));
});

// Remove esbuild (not needed at runtime)
rm(path.join(standaloneModules, 'esbuild'));
rm(path.join(standaloneModules, '@esbuild'));

console.log('Cleanup complete!');
