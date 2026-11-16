import fs from 'fs';
import path from 'path';
import { uploadFile, isS3Configured } from '../src/lib/supabase-storage';
import { FESTIVAL_PHOTOS_CATALOG } from '../shared/festival-catalog';

/**
 * Background / CLI script to upload the 242 festival images to S3
 * under bgos-business-images/festivals/<festivalKey>/<fileName>.
 */
export async function syncFestivalsToS3(options: { maxConcurrent?: number } = {}) {
  const isConfigured = isS3Configured();
  if (!isConfigured) {
    console.log('[syncFestivalsToS3] S3 credentials not configured; local assets remain active in /images/bgos/festivals/.');
    return { uploaded: 0, total: FESTIVAL_PHOTOS_CATALOG.length, skipped: true };
  }

  console.log(`[syncFestivalsToS3] Starting upload of ${FESTIVAL_PHOTOS_CATALOG.length} festival images to S3...`);
  let uploaded = 0;
  let failed = 0;

  for (const item of FESTIVAL_PHOTOS_CATALOG) {
    const localFilePath = path.join(process.cwd(), 'public', item.url);
    if (!fs.existsSync(localFilePath)) {
      continue;
    }

    try {
      const fileBuffer = fs.readFileSync(localFilePath);
      const res = await uploadFile({
        bucket: 'bgos-business-images',
        companyId: 'festivals',
        folder: item.festivalKey,
        fileName: item.fileName,
        file: fileBuffer,
        contentType: 'image/jpeg',
        requirePublicUrl: true,
      });

      if (res?.url) {
        uploaded++;
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
    }
  }

  console.log(`[syncFestivalsToS3] Finished. Uploaded: ${uploaded}, Failed/Skipped: ${failed}`);
  return { uploaded, failed, total: FESTIVAL_PHOTOS_CATALOG.length };
}

if (require.main === module) {
  syncFestivalsToS3().catch(console.error);
}
