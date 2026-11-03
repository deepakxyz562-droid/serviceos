import { describe, it, expect, vi, beforeEach } from 'vitest';
import sharp from 'sharp';
import { cleanupDesignAssets } from '@/lib/designs/cleanup';
import { db } from '@/lib/db';

describe('Image Resizing & Compression for Instagram/Facebook', () => {
  it('resizes a 2000x2000 image down to max 1080x1350 in WebP format', async () => {
    // Generate a test 2000x2000 image buffer
    const testImage = await sharp({
      create: {
        width: 2000,
        height: 2000,
        channels: 3,
        background: { r: 0, g: 159, b: 80 },
      },
    })
      .jpeg()
      .toBuffer();

    expect(testImage.length).toBeGreaterThan(0);

    // Apply the social image optimization pipeline
    const optimized = await sharp(testImage)
      .rotate()
      .resize({ width: 1080, height: 1350, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    expect(optimized.info.width).toBeLessThanOrEqual(1080);
    expect(optimized.info.height).toBeLessThanOrEqual(1350);
    expect(optimized.info.format).toBe('webp');
    // Verify file size is small and web-optimized (under 50KB for uniform color)
    expect(optimized.data.length).toBeLessThan(50_000);
  });

  it('resizes an extreme portrait image (1200x3000) within 1080x1350 bounds', async () => {
    const portraitImage = await sharp({
      create: {
        width: 1200,
        height: 3000,
        channels: 3,
        background: { r: 15, g: 23, b: 42 },
      },
    })
      .jpeg()
      .toBuffer();

    const optimized = await sharp(portraitImage)
      .rotate()
      .resize({ width: 1080, height: 1350, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    expect(optimized.info.width).toBeLessThanOrEqual(1080);
    expect(optimized.info.height).toBe(1350);
    expect(optimized.info.format).toBe('webp');
  });
});

describe('30-Day Storage Lifecycle & Retention Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('protects active and scheduled posts from asset cleanup', async () => {
    const mockAsset = {
      id: 'asset_future_123',
      tenantId: 'tenant_test',
      folder: 'bgos-design',
      url: 'https://example.com/asset_future_123.webp',
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // created 40d ago
    };

    vi.spyOn(db.imageLibrary, 'findMany').mockResolvedValueOnce([mockAsset as any]);
    vi.spyOn(db.socialPost, 'findFirst').mockResolvedValueOnce({
      id: 'post_scheduled_1',
      status: 'scheduled',
    } as any);

    const result = await cleanupDesignAssets(true);

    expect(result.scanned).toBe(1);
    expect(result.protected).toBe(1);
    expect(result.deleted).toBe(0);
    expect(result.retired).toBe(0);
  });

  it('protects recent published posts within 30 days', async () => {
    const mockAsset = {
      id: 'asset_recent_456',
      tenantId: 'tenant_test',
      folder: 'bgos-design',
      url: 'https://example.com/asset_recent_456.webp',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // created 15d ago
    };

    vi.spyOn(db.imageLibrary, 'findMany').mockResolvedValueOnce([mockAsset as any]);
    // No active/scheduled post
    vi.spyOn(db.socialPost, 'findFirst')
      .mockResolvedValueOnce(null) // activeOrScheduledPost
      .mockResolvedValueOnce({ id: 'post_published_recent' } as any); // recentPublishedPost

    const result = await cleanupDesignAssets(true);

    expect(result.scanned).toBe(1);
    expect(result.protected).toBe(1);
    expect(result.deleted).toBe(0);
  });

  it('retires old published posts older than 30 days', async () => {
    const mockAsset = {
      id: 'asset_old_789',
      tenantId: 'tenant_test',
      folder: 'bgos-design',
      url: 'https://example.com/asset_old_789.webp',
      createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // created 35d ago
    };

    vi.spyOn(db.imageLibrary, 'findMany').mockResolvedValueOnce([mockAsset as any]);
    vi.spyOn(db.socialPost, 'findFirst')
      .mockResolvedValueOnce(null) // no scheduled post
      .mockResolvedValueOnce(null); // no recent published post
    vi.spyOn(db.designGenerationJob, 'findFirst').mockResolvedValueOnce(null);

    const result = await cleanupDesignAssets(true);

    expect(result.scanned).toBe(1);
    expect(result.retired).toBe(1);
    expect(result.protected).toBe(0);
  });
});
