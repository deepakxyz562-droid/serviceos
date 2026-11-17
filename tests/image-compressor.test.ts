import { describe, it, expect } from 'vitest';
import { optimizeAndCompressImage } from '../src/lib/designs/image-compressor';
import sharp from 'sharp';

describe('Image Compressor & WebP Optimizer', () => {
  it('converts a raw buffer into optimized WebP with substantial size compression', async () => {
    // Generate a 1200x1200 raw uncompressed test image
    const rawBuffer = await sharp({
      create: {
        width: 1200,
        height: 1200,
        channels: 4,
        background: { r: 50, g: 120, b: 240, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    expect(rawBuffer.length).toBeGreaterThan(0);

    const optimized = await optimizeAndCompressImage(rawBuffer, {
      aspectRatio: '1:1',
      quality: 82,
    });

    expect(optimized.contentType).toBe('image/webp');
    expect(optimized.buffer).toBeInstanceOf(Buffer);
    expect(optimized.size).toBeLessThanOrEqual(rawBuffer.length);

    // Verify metadata of optimized image
    const meta = await sharp(optimized.buffer).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1080);
  });
});
