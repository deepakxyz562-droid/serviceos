/**
 * Patch Next.js 16 metadata workStore bug & memory management
 * 
 * 1. resolve-metadata.js: Next.js 16.3.8 bug where workAsyncStorage.getStore()
 *    is called after `await resolveMetadataItems(...)` instead of capturing it before.
 * 2. lib/worker.js: Constrain child worker heap to 1024MB and enable --expose-gc.
 * 3. build/worker.js: Periodic GC inside the static worker during page inspection.
 * 4. build/index.js: Post-Webpack GC in parent process + concurrency limiter on
 *    staticWorker.isPageStatic (max 4 concurrent tasks instead of all 1,266 at once)
 *    to prevent Linux OOM Killer on memory-constrained VPS instances during deployment.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Patch 1: resolve-metadata workStore bug
// ---------------------------------------------------------------------------
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
      console.log(`[Patch-Next] Successfully patched metadata workStore in ${filePath}`);
    } else if (content.includes(esmTarget)) {
      content = content.replace(esmTarget, esmReplacement);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[Patch-Next] Successfully patched metadata workStore in ${filePath}`);
    } else {
      console.log(`[Patch-Next] Metadata workStore already patched or pattern not found: ${filePath}`);
    }
  } catch (err) {
    console.warn(`[Patch-Next] Could not patch ${filePath}:`, err.message);
  }
}

// ---------------------------------------------------------------------------
// Patch 2: Forward constrained memory (1024MB) and --expose-gc to child workers
// ---------------------------------------------------------------------------
const workerFile = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'lib', 'worker.js');
if (fs.existsSync(workerFile)) {
  try {
    let content = fs.readFileSync(workerFile, 'utf8');
    // Remove any previous versions of this patch
    content = content.replace(/\s*nodeOptions\['max-old-space-size'\] = ['"]\d+['"];\s*nodeOptions\['expose-gc'\] = true;/g, '');
    content = content.replace(/\s*if \(!nodeOptions\['max-old-space-size'\] && !nodeOptions\['max_old_space_size'\]\) \{\s*nodeOptions\['max-old-space-size'\] = ['"]\d+['"];\s*\}/g, '');

    const workerTarget = `if (isolatedMemory) {
            delete nodeOptions['max-old-space-size'];
            delete nodeOptions['max_old_space_size'];
        }`;
    const workerReplacement = `if (isolatedMemory) {
            delete nodeOptions['max-old-space-size'];
            delete nodeOptions['max_old_space_size'];
        }
        nodeOptions['max-old-space-size'] = '1024';
        nodeOptions['expose-gc'] = true;`;

    if (content.includes(workerTarget)) {
      content = content.replace(workerTarget, workerReplacement);
      fs.writeFileSync(workerFile, content, 'utf8');
      console.log(`[Patch-Next] Successfully patched worker memory & expose-gc in ${workerFile}`);
    } else {
      console.log(`[Patch-Next] Worker file already patched or target not found: ${workerFile}`);
    }
  } catch (err) {
    console.warn(`[Patch-Next] Could not patch worker memory:`, err.message);
  }
}

// ---------------------------------------------------------------------------
// Patch 3: Periodic GC in static worker during page inspection
// ---------------------------------------------------------------------------
const buildWorkerFile = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'build', 'worker.js');
if (fs.existsSync(buildWorkerFile)) {
  try {
    let content = fs.readFileSync(buildWorkerFile, 'utf8');
    const staticWorkerTarget = `const isPageStatic = async (params)=>{
    await (0, _installbindings.installBindings)();
    (0, _installcodeframe.installCodeFrameSupport)();
    return (0, _utils.isPageStatic)(params);
};`;
    const staticWorkerReplacement = `let _pageDataCount = 0;
const isPageStatic = async (params)=>{
    await (0, _installbindings.installBindings)();
    (0, _installcodeframe.installCodeFrameSupport)();
    const result = await (0, _utils.isPageStatic)(params);
    _pageDataCount++;
    if (_pageDataCount % 25 === 0 && typeof global.gc === 'function') {
        try { global.gc(); } catch (e) {}
    }
    return result;
};`;

    if (content.includes(staticWorkerTarget)) {
      content = content.replace(staticWorkerTarget, staticWorkerReplacement);
      fs.writeFileSync(buildWorkerFile, content, 'utf8');
      console.log(`[Patch-Next] Successfully patched static worker periodic GC in ${buildWorkerFile}`);
    } else {
      console.log(`[Patch-Next] Build worker already patched or target not found: ${buildWorkerFile}`);
    }
  } catch (err) {
    console.warn(`[Patch-Next] Could not patch build worker:`, err.message);
  }
}

// ---------------------------------------------------------------------------
// Patch 4: Post-Webpack GC & Page Data Concurrency Limiter in index.js
// ---------------------------------------------------------------------------
const buildIndexFile = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'build', 'index.js');
if (fs.existsSync(buildIndexFile)) {
  try {
    let content = fs.readFileSync(buildIndexFile, 'utf8');

    // 4A: Post-Webpack GC
    const postWebpackTarget = `            await writeRequiredServerFilesManifest(distDir, requiredServerFilesManifest);
            // #endregion`;
    const postWebpackReplacement = `            await writeRequiredServerFilesManifest(distDir, requiredServerFilesManifest);
            if (typeof global.gc === 'function') {
                try {
                    global.gc();
                    const mem = process.memoryUsage();
                    console.log(\`[Build-GC] Post-Webpack GC complete: heapUsed=\${Math.round(mem.heapUsed / 1024 / 1024)}MB, rss=\${Math.round(mem.rss / 1024 / 1024)}MB\`);
                } catch (e) {}
            }
            // #endregion`;

    if (content.includes(postWebpackTarget)) {
      content = content.replace(postWebpackTarget, postWebpackReplacement);
      console.log(`[Patch-Next] Successfully patched post-Webpack GC in ${buildIndexFile}`);
    }

    // 4B: Concurrency limiter on staticWorker.isPageStatic (max 4 concurrent tasks)
    const staticWorkerThrottleTarget = `            staticWorker = createStaticWorker(config, {
                numberOfWorkers,
                debuggerPortOffset: (0, _worker.getNextBuildDebuggerPortOffset)({
                    kind: 'export-page'
                })
            });`;
    const staticWorkerThrottleReplacement = `            staticWorker = createStaticWorker(config, {
                numberOfWorkers,
                debuggerPortOffset: (0, _worker.getNextBuildDebuggerPortOffset)({
                    kind: 'export-page'
                })
            });
            {
                const origIsPageStatic = staticWorker.isPageStatic.bind(staticWorker);
                let active = 0;
                const queue = [];
                const maxConcurrent = 4;
                let processed = 0;
                function pumpQueue() {
                    while (active < maxConcurrent && queue.length > 0) {
                        active++;
                        const item = queue.shift();
                        item.fn().then(
                            (res) => {
                                active--;
                                processed++;
                                if (processed % 50 === 0 && typeof global.gc === 'function') {
                                    try { global.gc(); } catch (e) {}
                                }
                                pumpQueue();
                                item.resolve(res);
                            },
                            (err) => {
                                active--;
                                pumpQueue();
                                item.reject(err);
                            }
                        );
                    }
                }
                staticWorker.isPageStatic = function(params) {
                    return new Promise((resolve, reject) => {
                        queue.push({ fn: () => origIsPageStatic(params), resolve, reject });
                        pumpQueue();
                    });
                };
            }`;

    if (content.includes(staticWorkerThrottleTarget)) {
      content = content.replace(staticWorkerThrottleTarget, staticWorkerThrottleReplacement);
      console.log(`[Patch-Next] Successfully patched static worker concurrency limiter in ${buildIndexFile}`);
    }

    fs.writeFileSync(buildIndexFile, content, 'utf8');
  } catch (err) {
    console.warn(`[Patch-Next] Could not patch build index:`, err.message);
  }
}
