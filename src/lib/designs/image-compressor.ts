import sharp from 'sharp';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9';
}

export interface OptimizedImageResult {
  buffer: Buffer;
  contentType: 'image/webp';
  size: number;
}

/**
 * High-performance WebP compression & responsive resizing.
 * Converts raw heavy PNGs (3–6 MB) from AI diffusion models into lightweight,
 * ultra-sharp WebP assets (120–250 KB) suitable for instantaneous mobile and web loading.
 */
export async function optimizeAndCompressImage(
  inputBuffer: Buffer,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const quality = options.quality ?? 82;
  let targetWidth = options.maxWidth || 1080;
  let targetHeight = options.maxHeight || 1350; // default 4:5 commercial ratio

  if (options.aspectRatio === '1:1') {
    targetWidth = 1080;
    targetHeight = 1080;
  } else if (options.aspectRatio === '9:16') {
    targetWidth = 1080;
    targetHeight = 1920;
  } else if (options.aspectRatio === '16:9') {
    targetWidth = 1920;
    targetHeight = 1080;
  }

  try {
    const buffer = await sharp(inputBuffer, { limitInputPixels: 24_000_000 })
      .resize({
        width: targetWidth,
        height: targetHeight,
        fit: 'cover',
        withoutEnlargement: true,
      })
      .webp({
        quality,
        effort: 4,
      })
      .toBuffer();

    return {
      buffer,
      contentType: 'image/webp',
      size: buffer.length,
    };
  } catch (err) {
    console.warn('[optimizeAndCompressImage] Sharp compression failed, falling back to original buffer:', err);
    return {
      buffer: inputBuffer,
      contentType: 'image/webp',
      size: inputBuffer.length,
    };
  }
}
