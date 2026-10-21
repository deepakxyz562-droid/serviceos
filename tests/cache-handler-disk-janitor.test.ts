import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { runDiskJanitorCycle } from '../src/lib/server/disk-janitor';

// Import cache handler
// @ts-ignore
const InMemoryLRUCacheHandler = require('../cache-handler.js');

describe('InMemoryLRUCacheHandler', () => {
  beforeEach(() => {
    InMemoryLRUCacheHandler.cache.clear();
  });

  it('stores and retrieves cache entries with lastModified and age', async () => {
    const handler = new InMemoryLRUCacheHandler();
    const data = { kind: 'APP_PAGE', html: '<html><body>Hello World</body></html>' };

    await handler.set('route-1', data, { tags: ['page-tag'] });
    const result = await handler.get('route-1');

    expect(result).not.toBeNull();
    expect(result?.value).toEqual(data);
    expect(result?.lastModified).toBeTypeOf('number');
    expect(result?.age).toBeGreaterThanOrEqual(0);
  });

  it('returns null for missing keys', async () => {
    const handler = new InMemoryLRUCacheHandler();
    const result = await handler.get('non-existent');
    expect(result).toBeNull();
  });

  it('maintains LRU order when accessing existing keys', async () => {
    const handler = new InMemoryLRUCacheHandler();
    await handler.set('k1', { val: 1 });
    await handler.set('k2', { val: 2 });
    await handler.set('k3', { val: 3 });

    // Initial order of keys in Map: k1, k2, k3
    expect(Array.from(InMemoryLRUCacheHandler.cache.keys())).toEqual(['k1', 'k2', 'k3']);

    // Access k1 -> should move k1 to the end: k2, k3, k1
    await handler.get('k1');
    expect(Array.from(InMemoryLRUCacheHandler.cache.keys())).toEqual(['k2', 'k3', 'k1']);
  });

  it('revalidates and purges entries by tag', async () => {
    const handler = new InMemoryLRUCacheHandler();
    await handler.set('/blog/post-1', { title: 'Post 1' }, { tags: ['blog', 'post-1'] });
    await handler.set('/blog/post-2', { title: 'Post 2' }, { tags: ['blog', 'post-2'] });
    await handler.set('/about', { title: 'About' }, { tags: ['static'] });

    expect(InMemoryLRUCacheHandler.cache.size).toBe(3);

    // Invalidate 'post-1'
    await handler.revalidateTag('post-1');
    expect(InMemoryLRUCacheHandler.cache.has('/blog/post-1')).toBe(false);
    expect(InMemoryLRUCacheHandler.cache.has('/blog/post-2')).toBe(true);
    expect(InMemoryLRUCacheHandler.cache.has('/about')).toBe(true);

    // Invalidate 'blog' (should delete remaining blog post)
    await handler.revalidateTag(['blog']);
    expect(InMemoryLRUCacheHandler.cache.has('/blog/post-2')).toBe(false);
    expect(InMemoryLRUCacheHandler.cache.has('/about')).toBe(true);
  });

  it('evicts oldest entries when MAX_ENTRIES is exceeded', async () => {
    const handler = new InMemoryLRUCacheHandler();
    for (let i = 0; i < 505; i++) {
      await handler.set(`key-${i}`, { num: i });
    }

    // Size must never exceed 500
    expect(InMemoryLRUCacheHandler.cache.size).toBe(500);

    // Keys 0 to 4 should have been evicted
    expect(InMemoryLRUCacheHandler.cache.has('key-0')).toBe(false);
    expect(InMemoryLRUCacheHandler.cache.has('key-1')).toBe(false);
    expect(InMemoryLRUCacheHandler.cache.has('key-4')).toBe(false);

    // Recent keys must still exist
    expect(InMemoryLRUCacheHandler.cache.has('key-504')).toBe(true);
    expect(InMemoryLRUCacheHandler.cache.has('key-5')).toBe(true);
  });
});

describe('Disk Janitor Worker', () => {
  it('runs runDiskJanitorCycle cleanly on default dirs', async () => {
    const result = await runDiskJanitorCycle();
    expect(result).toHaveProperty('prunedCount');
    expect(result).toHaveProperty('freedBytes');
  });

  it('prunes stale files older than 2 hours in custom test directory', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'janitor-test-'));
    const oldFile = path.join(tempDir, 'old-cache.html');
    const newFile = path.join(tempDir, 'new-cache.html');

    fs.writeFileSync(oldFile, '<h1>Old</h1>');
    fs.writeFileSync(newFile, '<h1>New</h1>');

    // Backdate oldFile mtime by 3 hours
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    fs.utimesSync(oldFile, threeHoursAgo, threeHoursAgo);

    const result = await runDiskJanitorCycle([tempDir]);
    expect(result.prunedCount).toBe(1);
    expect(fs.existsSync(oldFile)).toBe(false);
    expect(fs.existsSync(newFile)).toBe(true);

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
