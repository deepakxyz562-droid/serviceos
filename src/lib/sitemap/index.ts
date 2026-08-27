/**
 * Sitemap lib — barrel export + event-driven dirty marking.
 *
 * Usage:
 *   import { markSitemapDirtyForTenant, regenerateSitemaps } from '@/lib/sitemap';
 */
export { getSitemapFileNumber, getAllBusinessFileNumbers, BUSINESS_FILE_COUNT, TOTAL_SITEMAP_FILES } from './hash';
export { uploadSitemapFile, fetchSitemapFile, ensureSitemapBucket } from './storage';
export {
  getSitemapState,
  getDirtyFiles,
  markSitemapFileDirty,
  markAllBusinessFilesDirty,
  clearDirtyFiles,
  acquireSitemapLock,
  releaseSitemapLock,
  needsFullRegen,
} from './state';
export {
  generateStaticSitemapFile,
  generateSitemapForBucket,
  generateSitemapIndex,
  generateAllSitemaps,
  invalidateBusinessUrlCache,
} from './generate';
export { regenerateSitemaps, forceFullRegeneration, type SitemapCronResult } from './cron';

// ── Event-driven dirty marking ──────────────────────────────────────────
import { getSitemapFileNumber } from './hash';
import { markSitemapFileDirty } from './state';
import { db } from '@/lib/db';

/**
 * Mark the sitemap file for a specific tenant as dirty.
 *
 * Call this when a tenant is:
 *   - Created (new marketplace listing)
 *   - Claimed (ownership transferred)
 *   - Updated (profile changes: name, description, industry, city, etc.)
 *   - Suspended (removes them from the index)
 *   - Deleted
 *   - publicProfileEnabled toggled
 *
 * This computes the tenant's sitemap file number via SHA-256(tenantId) % 10
 * and adds it to the SitemapState.dirtyFilesJson array. The daily cron
 * will regenerate that file on the next run.
 *
 * This function is fire-and-forget — it never throws. If the DB is down,
 * the 7-day safety net will catch the missed update.
 */
export async function markSitemapDirtyForTenant(tenantId: string): Promise<void> {
  try {
    const fileNumber = getSitemapFileNumber(tenantId);
    await markSitemapFileDirty(fileNumber);
  } catch (err) {
    console.error('[sitemap] markSitemapDirtyForTenant error:', err);
    // Non-fatal — the 7-day safety net will catch missed updates
  }
}

/**
 * Mark the static sitemap file (0.xml) as dirty.
 * Call this when static pages change (rare — e.g. new service page added).
 */
export async function markStaticSitemapDirty(): Promise<void> {
  try {
    await markSitemapFileDirty(0);
  } catch (err) {
    console.error('[sitemap] markStaticSitemapDirty error:', err);
  }
}

/**
 * Mark sitemap dirty for a tenant by slug (when you don't have the ID handy).
 * Loads the tenant ID from the DB, then calls markSitemapDirtyForTenant.
 */
export async function markSitemapDirtyForTenantBySlug(slug: string): Promise<void> {
  try {
    const tenant = await db.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (tenant) {
      await markSitemapDirtyForTenant(tenant.id);
    }
  } catch (err) {
    console.error('[sitemap] markSitemapDirtyForTenantBySlug error:', err);
  }
}
