import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Compresses all 242 festival images in public/images/bgos/festivals/ into ultra-sharp,
 * lightweight WebP images (~50–120 KB each) and deletes the old heavy JPEGs.
 * Also updates shared/festival-catalog.ts to reference .webp.
 */
async function compressAllFestivalImages() {
  const baseDir = path.join(process.cwd(), 'public', 'images', 'bgos', 'festivals');
  if (!fs.existsSync(baseDir)) {
    console.error('Festivals directory not found:', baseDir);
    return;
  }

  const subdirs = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let totalOriginalBytes = 0;
  let totalCompressedBytes = 0;
  let processedCount = 0;

  for (const subdir of subdirs) {
    const dirPath = path.join(baseDir, subdir);
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      if (!file.toLowerCase().endsWith('.jpg') && !file.toLowerCase().endsWith('.jpeg')) {
        continue;
      }

      const originalPath = path.join(dirPath, file);
      const baseName = file.replace(/\.(jpe?g)$/i, '');
      const webpFileName = `${baseName}.webp`;
      const webpPath = path.join(dirPath, webpFileName);

      const stat = fs.statSync(originalPath);
      totalOriginalBytes += stat.size;

      // Compress and resize with Sharp
      const buffer = fs.readFileSync(originalPath);
      const compressedBuffer = await sharp(buffer, { limitInputPixels: 30_000_000 })
        .resize({
          width: 1080,
          height: 1350,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({
          quality: 80,
          effort: 4,
        })
        .toBuffer();

      fs.writeFileSync(webpPath, compressedBuffer);
      totalCompressedBytes += compressedBuffer.length;
      processedCount++;

      // Delete the old heavy JPEG
      fs.unlinkSync(originalPath);
    }
  }

  console.log(`[compressAllFestivalImages] Converted and deleted ${processedCount} JPEG files.`);
  console.log(`Original total size: ${(totalOriginalBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Optimized WebP size: ${(totalCompressedBytes / (1024 * 1024)).toFixed(2)} MB`);
  const savingsPct = (((totalOriginalBytes - totalCompressedBytes) / totalOriginalBytes) * 100).toFixed(1);
  console.log(`Total bandwidth saved: ${savingsPct}% reduction!`);

  // Update shared/festival-catalog.ts to reference .webp instead of .jpg
  const catalogPath = path.join(process.cwd(), 'shared', 'festival-catalog.ts');
  if (fs.existsSync(catalogPath)) {
    let catalogContent = fs.readFileSync(catalogPath, 'utf8');
    catalogContent = catalogContent.replace(/\.jpg"/g, '.webp"');
    catalogContent = catalogContent.replace(/\.jpeg"/g, '.webp"');
    fs.writeFileSync(catalogPath, catalogContent, 'utf8');
    console.log('[compressAllFestivalImages] Updated shared/festival-catalog.ts references to .webp');
  }
}

compressAllFestivalImages().catch(console.error);
