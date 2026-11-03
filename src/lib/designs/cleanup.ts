import { db } from '@/lib/db';
import { deleteFile } from '@/lib/supabase-storage';

/**
 * 30-Day Rolling Storage Retention & Image Cleanup Engine:
 * 1. Future & Active Scheduled Posts: ALWAYS PROTECTED (never deleted while pending/scheduled/queued).
 * 2. Published Posts (> 30 days old): Binary images purged from S3/R2 storage while preserving post metadata/analytics.
 * 3. Abandoned Draft Uploads (> 7 days old): Deleted from S3/R2 storage if never scheduled, published, or saved to templates.
 * 4. User Custom Templates ("⭐ My Templates"): Always protected.
 */
export async function cleanupDesignAssets(dryRun = true) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const assets = await db.imageLibrary.findMany({
    where: {
      folder: { in: ['bgos-design', 'bgos-design-retired', 'bgos-design-export', 'bgos-design-export-retired'] },
      createdAt: { lt: sevenDaysAgo },
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  const result = { scanned: assets.length, retired: 0, deleted: 0, protected: 0 };

  for (const asset of assets) {
    if (!asset.tenantId) continue;

    // 1. Check if asset belongs to an active, future scheduled, or recent draft post
    const activeOrScheduledPost = await db.socialPost.findFirst({
      where: {
        tenantId: asset.tenantId,
        status: { in: ['scheduled', 'queued', 'publishing', 'draft'] },
        OR: [
          { designJson: { contains: asset.id } },
          { designJson: { contains: asset.url } },
          { mediaUrls: { contains: asset.url } },
        ],
      },
      select: { id: true, status: true },
    });

    if (activeOrScheduledPost) {
      result.protected++;
      continue;
    }

    // 2. Check if asset belongs to a recent published post (within 30 days)
    const recentPublishedPost = await db.socialPost.findFirst({
      where: {
        tenantId: asset.tenantId,
        status: 'published',
        createdAt: { gte: thirtyDaysAgo },
        OR: [
          { designJson: { contains: asset.id } },
          { designJson: { contains: asset.url } },
          { mediaUrls: { contains: asset.url } },
        ],
      },
      select: { id: true },
    });

    if (recentPublishedPost) {
      result.protected++;
      continue;
    }

    // 3. Check if asset is part of an active generation job
    const activeJob = await db.designGenerationJob.findFirst({
      where: {
        tenantId: asset.tenantId,
        resultJson: { contains: asset.id },
        status: { in: ['queued', 'running', 'uncertain'] },
      },
      select: { id: true },
    });

    if (activeJob) {
      result.protected++;
      continue;
    }

    // 4. Retire first if in primary folder (grace period), or delete if already retired or abandoned
    const isOldAbandonedDraft = asset.createdAt < sevenDaysAgo && !asset.folder.includes('retired');
    const isPastPublishedMedia = asset.createdAt < thirtyDaysAgo;

    if (asset.folder === 'bgos-design' || asset.folder === 'bgos-design-export') {
      if (!isPastPublishedMedia && !isOldAbandonedDraft) {
        result.protected++;
        continue;
      }
      if (!dryRun) {
        await db.imageLibrary.updateMany({
          where: { id: asset.id, folder: asset.folder },
          data: { folder: `${asset.folder}-retired`, createdAt: new Date() },
        });
      }
      result.retired++;
      continue;
    }

    // 5. Delete binary from storage
    const isExport = asset.folder === 'bgos-design-export-retired';
    const urlMatch = /\/design-assets\/([^?#]+)/.exec(asset.url);
    const fileName = urlMatch ? urlMatch[1] : `${asset.id}.png`;
    const storagePath = isExport
      ? `${asset.tenantId}/designs/${asset.name}.png`
      : `${asset.tenantId}/design-assets/${fileName}`;

    if (!dryRun) {
      const removed = await deleteFile('campaign-assets', storagePath).catch(() => false);
      if (removed) {
        await db.imageLibrary.deleteMany({ where: { id: asset.id, tenantId: asset.tenantId, folder: asset.folder } });
      }
    }
    result.deleted++;
  }

  return result;
}
