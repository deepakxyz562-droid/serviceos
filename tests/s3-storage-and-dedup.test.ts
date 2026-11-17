import { describe, it, expect, vi } from 'vitest';
import { optimizeAndCompressImage } from '@/lib/designs/image-compressor';
import { uploadFile, STORAGE_BUCKETS, purgeSupabaseStorageBucket } from '@/lib/supabase-storage';

describe('S3-Only Storage Policy & Image Resilience', () => {
  it('gracefully optimizes and compresses an image buffer without crashing even if sharp fails', async () => {
    const rawBuffer = Buffer.from('mock-raw-image-bytes-from-flux-diffusion');
    const result = await optimizeAndCompressImage(rawBuffer, {
      aspectRatio: '4:5',
      quality: 80,
    });

    expect(result).toBeDefined();
    expect(result.buffer).toBeDefined();
    expect(result.size).toBeGreaterThan(0);
    expect(result.contentType).toBe('image/webp');
  });

  it('strictly rejects saving business images to Supabase and requires AWS S3', async () => {
    // Attempt upload to bgos-business-images when S3 is mocked as unconfigured
    const originalEnv = { ...process.env };
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_S3_BUCKET;

    try {
      await expect(
        uploadFile({
          bucket: 'bgos-business-images',
          companyId: 'bgos_merchants',
          folder: 'software',
          fileName: 'test-photo.webp',
          file: Buffer.from('dummy-image'),
          contentType: 'image/webp',
        })
      ).rejects.toThrow(/Business images must be stored strictly in AWS S3/i);
    } finally {
      process.env = originalEnv;
    }
  });

  it('purgeSupabaseStorageBucket handles unconfigured or empty environments safely', async () => {
    const res = await purgeSupabaseStorageBucket('bgos-business-images');
    expect(res).toBeDefined();
    expect(typeof res.deleted).toBe('number');
    expect(Array.isArray(res.errors)).toBe(true);
  });
});
