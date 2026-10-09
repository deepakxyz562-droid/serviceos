/**
 * Patch Next.js 16 metadata workStore bug
 * 
 * Next.js 16.3.8 has a bug in resolve-metadata.js where workAsyncStorage.getStore()
 * is called after `await resolveMetadataItems(...)` instead of capturing it before the await.
 * During static prerender / SSG generation, this throws:
 * "InvariantError: Expected workStore to be initialized. This is a bug in Next.js."
 * 
 * This patch captures workStore before the await so that prerendering succeeds cleanly.
 */

const fs = require('fs');
const path = require('path');

const filesToPatch = [
  path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'lib', 'metadata', 'resolve-metadata.js'),
  path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'esm', 'lib', 'metadata', 'resolve-metadata.js'),
];

for (const filePath of filesToPatch) {
  if (!fs.existsSync(filePath)) continue;

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // CommonJS pattern
    const cjsTarget = 'async function resolveMetadata(tree, pathname, searchParams, errorConvention, interpolatedParams, metadataContext) {\n    const metadataItems = await resolveMetadataItems(tree, searchParams, errorConvention, interpolatedParams);\n    const workStore = _workasyncstorageexternal.workAsyncStorage.getStore();';
    const cjsReplacement = 'async function resolveMetadata(tree, pathname, searchParams, errorConvention, interpolatedParams, metadataContext) {\n    const initialWorkStore = _workasyncstorageexternal.workAsyncStorage.getStore();\n    const metadataItems = await resolveMetadataItems(tree, searchParams, errorConvention, interpolatedParams);\n    const workStore = _workasyncstorageexternal.workAsyncStorage.getStore() || initialWorkStore;';

    // ESM pattern
    const esmTarget = 'export async function resolveMetadata(tree, pathname, searchParams, errorConvention, interpolatedParams, metadataContext) {\n    const metadataItems = await resolveMetadataItems(tree, searchParams, errorConvention, interpolatedParams);\n    const workStore = workAsyncStorage.getStore();';
    const esmReplacement = 'export async function resolveMetadata(tree, pathname, searchParams, errorConvention, interpolatedParams, metadataContext) {\n    const initialWorkStore = workAsyncStorage.getStore();\n    const metadataItems = await resolveMetadataItems(tree, searchParams, errorConvention, interpolatedParams);\n    const workStore = workAsyncStorage.getStore() || initialWorkStore;';

    if (content.includes(cjsTarget)) {
      content = content.replace(cjsTarget, cjsReplacement);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[Patch-Next] Successfully patched ${filePath}`);
    } else if (content.includes(esmTarget)) {
      content = content.replace(esmTarget, esmReplacement);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[Patch-Next] Successfully patched ${filePath}`);
    } else {
      console.log(`[Patch-Next] File already patched or pattern not found: ${filePath}`);
    }
  } catch (err) {
    console.warn(`[Patch-Next] Could not patch ${filePath}:`, err.message);
  }
}
