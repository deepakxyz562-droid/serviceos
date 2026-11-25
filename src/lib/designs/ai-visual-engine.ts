import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { listGoogleBusinessMedia } from '@/lib/social/adapters/googlebusiness';
import { getCategoryImagesFromS3, getCategoryStorageFolder } from './category-image-engine';
import { generateDesignImage, type ImageProvider } from './image-provider';
import { saveDesignAsset } from './assets';
import { optimizeAndCompressImage } from './image-compressor';
import { uploadFile } from '@/lib/supabase-storage';
import crypto from 'crypto';

export type VisualSourceKind =
  | 'gbp_photo'
  | 'uploaded_photo'
  | 'ai_cached'
  | 'ai_generated'
  | 'stock_library';

export interface ResolvedVisualAsset {
  url: string;
  thumbnailUrl?: string;
  source: VisualSourceKind;
  title?: string;
  category?: string;
  mediaName?: string;
}

export interface ResolveTenantVisualsParams {
  tenantId: string;
  industry?: string;
  businessName?: string;
  city?: string;
  topic?: string;
  limit?: number;
  forceRefreshGbp?: boolean;
  /** Optional explicit AI prompt if generation is requested when owned/GBP photos are empty. */
  allowAiGeneration?: boolean;
  aiPrompt?: string;
  actorId?: string;
  preferredProvider?: ImageProvider;
}

const VALID_URL_RE = /^(https?:\/\/|\/)/i;

function isUsableUrl(url: unknown): url is string {
  return typeof url === 'string' && VALID_URL_RE.test(url.trim());
}

/**
 * Fetch authentic Google Business Profile photos for a tenant (using the 5m adapter cache).
 * Filters out videos and duplicates while preserving GBP resource names & thumbnails.
 */
export async function getTenantGbpPhotos(
  tenantId: string,
  options?: { pageSize?: number; forceRefresh?: boolean },
): Promise<ResolvedVisualAsset[]> {
  try {
    const googleAccount = await prepareGoogleAccount(tenantId).catch(() => null);
    if (!googleAccount) return [];

    const mediaRes = await Promise.race([
      listGoogleBusinessMedia(googleAccount, {
        pageSize: options?.pageSize || 30,
        forceRefresh: options?.forceRefresh,
      }),
      new Promise<{ mediaItems: [] }>((resolve) =>
        setTimeout(() => resolve({ mediaItems: [] }), 4500),
      ),
    ]).catch(() => ({ mediaItems: [] }));

    const seen = new Set<string>();
    const results: ResolvedVisualAsset[] = [];

    for (const item of mediaRes.mediaItems || []) {
      const url = item.googleUrl || item.thumbnailUrl;
      if (!isUsableUrl(url)) continue;
      if (item.mediaFormat === 'VIDEO') continue;
      if (seen.has(url)) continue;
      seen.add(url);
      results.push({
        url,
        thumbnailUrl: isUsableUrl(item.thumbnailUrl) ? item.thumbnailUrl : url,
        source: 'gbp_photo',
        category: item.category || 'ADDITIONAL',
        mediaName: item.name || undefined,
      });
    }

    return results;
  } catch (err) {
    console.warn('[ai-visual-engine] getTenantGbpPhotos warning:', err);
    return [];
  }
}

/**
 * Retrieve tenant-owned ImageLibrary photos split cleanly between manual uploads and cached AI outputs.
 */
export async function getTenantLibraryPhotos(tenantId: string): Promise<{
  uploaded: ResolvedVisualAsset[];
  aiCached: ResolvedVisualAsset[];
}> {
  try {
    const rows = await (
      db.imageLibrary?.findMany?.({
        where: {
          tenantId,
          NOT: [{ folder: { contains: 'retired' } }, { mediaType: { startsWith: 'video/' } }],
        },
        orderBy: { createdAt: 'desc' },
        take: 60,
        select: { name: true, url: true, folder: true },
      }) ?? Promise.resolve([])
    ).catch(() => []);

    const uploaded: ResolvedVisualAsset[] = [];
    const aiCached: ResolvedVisualAsset[] = [];
    const seen = new Set<string>();

    for (const row of rows || []) {
      if (!isUsableUrl(row.url) || seen.has(row.url)) continue;
      seen.add(row.url);
      const isAi = row.folder === 'bgos_ai_photos' || row.folder === 'ai_generated';
      const entry: ResolvedVisualAsset = {
        url: row.url,
        thumbnailUrl: row.url,
        source: isAi ? 'ai_cached' : 'uploaded_photo',
        title: row.name || undefined,
      };
      if (isAi) aiCached.push(entry);
      else uploaded.push(entry);
    }

    return { uploaded, aiCached };
  } catch (err) {
    console.warn('[ai-visual-engine] getTenantLibraryPhotos warning:', err);
    return { uploaded: [], aiCached: [] };
  }
}

/**
 * Single Source of Truth for BGOS Visual Selection:
 * Priority 1: Connected Google Business Profile photos
 * Priority 2: Uploaded / Brand-owned photos
 * Priority 3: Previously generated AI commercial photos
 * Priority 4: On-demand AI generation (only when explicitly requested via allowAiGeneration)
 * Priority 5: Dynamic category S3 assets (zero hardcoded industry presets)
 */
export async function resolveTenantVisuals(
  params: ResolveTenantVisualsParams,
): Promise<ResolvedVisualAsset[]> {
  const limit = Math.max(1, params.limit || 20);
  const [gbpPhotos, libraryPhotos] = await Promise.all([
    getTenantGbpPhotos(params.tenantId, {
      pageSize: Math.max(20, limit),
      forceRefresh: params.forceRefreshGbp,
    }),
    getTenantLibraryPhotos(params.tenantId),
  ]);

  const ordered: ResolvedVisualAsset[] = [];
  const seen = new Set<string>();

  const pushUnique = (items: ResolvedVisualAsset[]) => {
    for (const item of items) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      ordered.push(item);
      if (ordered.length >= limit) break;
    }
  };

  pushUnique(gbpPhotos);
  if (ordered.length < limit) pushUnique(libraryPhotos.uploaded);
  if (ordered.length < limit) pushUnique(libraryPhotos.aiCached);

  // Optional on-demand AI generation (Recraft V4.1 Flash V2 first, NVIDIA Flux Schnell second)
  if (ordered.length === 0 && params.allowAiGeneration && params.aiPrompt) {
    try {
      const provider: ImageProvider = params.preferredProvider || 'openrouter';
      const generated = await generateDesignImage(
        params.aiPrompt,
        provider,
        AbortSignal.timeout(30_000),
        false,
        {
          businessName: params.businessName,
          category: params.industry,
          city: params.city,
        },
      );
      if (generated?.bytes?.length) {
        const saved = await saveDesignAsset(
          generated.bytes,
          params.tenantId,
          params.actorId || 'ai-visual-engine',
          { format: 'jpeg' },
        );
        if (isUsableUrl(saved.url)) {
          ordered.push({
            url: saved.url,
            thumbnailUrl: saved.url,
            source: 'ai_generated',
            title: params.topic || params.businessName,
          });
          seen.add(saved.url);
        }
      }
    } catch (aiErr) {
      console.warn('[ai-visual-engine] On-demand AI generation warning:', aiErr);
    }
  }

  // Dynamic category S3 lookup as final fallback if tenant has zero owned/GBP media
  if (ordered.length < limit && params.industry) {
    try {
      const s3Folder = getCategoryStorageFolder(params.industry);
      const s3Urls = await getCategoryImagesFromS3(s3Folder, limit - ordered.length);
      for (const url of s3Urls) {
        if (!isUsableUrl(url) || seen.has(url)) continue;
        seen.add(url);
        ordered.push({
          url,
          thumbnailUrl: url,
          source: 'stock_library',
          category: s3Folder,
        });
        if (ordered.length >= limit) break;
      }
    } catch (s3Err) {
      console.warn('[ai-visual-engine] S3 lookup warning:', s3Err);
    }
  }

  return ordered;
}

/**
 * Convenience helper to pick a single visual URL for a post or campaign slot,
 * cycling cleanly through owned GBP / Brand assets by index before touching AI/stock.
 */
export async function pickPostVisualUrl(params: {
  tenantId: string;
  industry?: string;
  businessName?: string;
  city?: string;
  topic?: string;
  slotIndex?: number;
  preloadedPool?: ResolvedVisualAsset[];
  allowAiGeneration?: boolean;
  aiPrompt?: string;
}): Promise<ResolvedVisualAsset | null> {
  const pool =
    params.preloadedPool && params.preloadedPool.length > 0
      ? params.preloadedPool
      : await resolveTenantVisuals({
          tenantId: params.tenantId,
          industry: params.industry,
          businessName: params.businessName,
          city: params.city,
          topic: params.topic,
          limit: 30,
          allowAiGeneration: params.allowAiGeneration,
          aiPrompt: params.aiPrompt,
        });

  if (pool.length === 0) return null;

  // Strongly prioritize owned media (GBP -> uploaded -> ai_cached -> ai_generated) over stock fallback
  const owned = pool.filter((item) => item.source !== 'stock_library');
  const candidates = owned.length > 0 ? owned : pool;
  const idx = Math.abs(params.slotIndex ?? 0) % candidates.length;
  return candidates[idx];
}

/**
 * Generate & store one optimized commercial WebP image in bgos_ai_photos using Recraft V4.1 Flash V2 first
 * (with automatic NVIDIA Flux Schnell failover).
 */
export async function generateAndStoreCommercialImage(params: {
  tenantId: string;
  businessName: string;
  category: string;
  city?: string;
  services?: string[];
  prompt: string;
  title?: string;
  aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9';
  preferredProvider?: ImageProvider;
  timeoutMs?: number;
}): Promise<{
  url: string;
  model: string;
  providerFallbackReason?: string;
  size: number;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs || 25_000);

  try {
    const result = await generateDesignImage(
      params.prompt,
      params.preferredProvider || 'openrouter',
      controller.signal,
      false,
      {
        businessName: params.businessName,
        category: params.category,
        city: params.city,
        searchTerms: params.services,
      },
      { aspectRatio: params.aspectRatio || '4:5' },
    );

    if (!result.bytes || result.bytes.length === 0) {
      throw new Error('AI image provider returned empty image bytes.');
    }

    const optimized = await optimizeAndCompressImage(result.bytes, {
      aspectRatio: params.aspectRatio || '4:5',
      quality: 82,
    });

    const folder = getCategoryStorageFolder(params.category);
    const hash = crypto.randomBytes(4).toString('hex');
    const fileName = `${folder}-ai-${Date.now()}-${hash}.webp`;

    const upload = await uploadFile({
      bucket: 'bgos-business-images',
      companyId: 'bgos_merchants',
      folder,
      fileName,
      file: optimized.buffer,
      contentType: 'image/webp',
      requirePublicUrl: false,
    });

    if (!upload.url) {
      throw new Error('Storage upload failed to produce a public image URL.');
    }

    await db.imageLibrary
      ?.create?.({
        data: {
          tenantId: params.tenantId,
          name: params.title || `${params.businessName} AI Commercial Photo`,
          url: upload.url,
          folder: 'bgos_ai_photos',
          mediaType: 'image/webp',
          size: optimized.size,
        },
      })
      .catch(() => null);

    return {
      url: upload.url,
      model: result.model,
      providerFallbackReason: result.fallbackReason,
      size: optimized.size,
    };
  } finally {
    clearTimeout(timeout);
  }
}
