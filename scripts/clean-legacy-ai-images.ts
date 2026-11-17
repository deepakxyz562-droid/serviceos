import { listFiles, deleteFile, isS3Configured } from '../src/lib/supabase-storage';
import fs from 'fs';
import path from 'path';

/**
 * Cleanup script to remove previous uncompressed / incorrect AI generated images
 * from S3 bucket bgos-business-images (under bgos_merchants/), local uploads,
 * and database ImageLibrary entries.
 * PRESERVES all authentic festival photography under 'festivals/'.
 */
export async function cleanLegacyAiImages() {
  console.log('[cleanLegacyAiImages] Starting cleanup...');

  let deletedS3Count = 0;
  if (isS3Configured()) {
    try {
      const files = await listFiles('bgos-business-images', 'bgos_merchants');
      console.log(`[cleanLegacyAiImages] Found ${files.length} files under bgos_merchants in S3.`);
      for (const file of files) {
        // Do not touch festivals!
        if (file.path.includes('festivals/')) continue;
        const ok = await deleteFile('bgos-business-images', file.path);
        if (ok) deletedS3Count++;
      }
      console.log(`[cleanLegacyAiImages] Successfully deleted ${deletedS3Count} legacy AI images from S3.`);
    } catch (err) {
      console.warn('[cleanLegacyAiImages] S3 cleanup error:', err);
    }
  } else {
    console.log('[cleanLegacyAiImages] S3 not configured in local environment.');
  }

  // Clean local upload copies if any
  let deletedLocalCount = 0;
  const localUploadDir = path.join(process.cwd(), 'public', 'uploads', 'bgos-business-images', 'bgos_merchants');
  if (fs.existsSync(localUploadDir)) {
    try {
      fs.rmSync(localUploadDir, { recursive: true, force: true });
      deletedLocalCount++;
      console.log(`[cleanLegacyAiImages] Removed local folder: ${localUploadDir}`);
    } catch (err) {
      console.warn('[cleanLegacyAiImages] Local cleanup error:', err);
    }
  }

  // Clean DB ImageLibrary entries for bgos_ai_photos
  let deletedDbCount = 0;
  try {
    const { db } = await import('../src/lib/db');
    if (db && db.imageLibrary) {
      const res = await db.imageLibrary.deleteMany({
        where: {
          OR: [
            { folder: 'bgos_ai_photos' },
            { name: { contains: 'AI Commercial Photo' } },
          ],
        },
      });
      deletedDbCount = res.count;
      console.log(`[cleanLegacyAiImages] Deleted ${deletedDbCount} database entries from ImageLibrary.`);
    }
  } catch (err) {
    console.log('[cleanLegacyAiImages] DB ImageLibrary cleanup skipped or no DB connection in CLI.');
  }

  return { deletedS3Count, deletedLocalCount, deletedDbCount };
}

if (require.main === module) {
  cleanLegacyAiImages().then((res) => {
    console.log('[cleanLegacyAiImages] Finished:', res);
    process.exit(0);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
