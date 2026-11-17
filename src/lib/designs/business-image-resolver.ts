/**
 * Central BGOS Business Image Resolver & On-Demand S3 Category Library
 *
 * Architecture:
 * 1. Trade Isolation:
 *    Images are organized strictly into S3 category directories:
 *    `bgos-business-images/<category-slug>/`
 * 2. Instant Zero-Cost Reuse:
 *    When a business of the same type comes, existing S3 images are reused immediately (0 AI cost, <5ms).
 * 3. 5-Quick Onboarding + 200 Background:
 *    Powered by Cloudflare Workers AI FLUX and stored in AWS S3.
 * 4. 100% Unsplash-Free:
 *    No Unsplash dependencies or presets.
 */

import { db } from '@/lib/db';
import { normalizeCategoryContext } from './category-taxonomy';
import {
  getCategoryStorageFolder,
  getCategoryImagesFromS3,
  ensureOnboardingCategoryPack,
  startBackgroundCategoryGeneration,
  buildCategorySceneBlueprints,
} from './category-image-engine';

export {
  getCategoryStorageFolder,
  getCategoryImagesFromS3,
  ensureOnboardingCategoryPack,
  startBackgroundCategoryGeneration,
  buildCategorySceneBlueprints,
};

export interface ResolvedBusinessImage {
  url: string;
  source: 'owner_upload' | 'google_photo' | 's3_category_library' | 'curated_fallback';
  categoryKey: string;
  categoryFolder: string;
  sceneType?: string;
  isAiGenerated: boolean;
}

export interface EnsureCategoryOptions {
  forceRegenerate?: boolean;
  targetCount?: number;
  businessName?: string;
  city?: string;
}

/**
 * 32-bit FNV-1a non-cryptographic stable hash for deterministic slot assignment
 */
export function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash);
}

/**
 * Checks S3 / DB cache for existing category images
 */
export async function getExistingCategoryImages(categoryFolder: string): Promise<string[]> {
  return getCategoryImagesFromS3(categoryFolder, 200);
}

/**
 * Ensures category images are present:
 * 1. Checks if S3 / DB already has images for this category.
 * 2. If YES (>= 5): Returns them immediately (cache hit, <5ms).
 * 3. If NO (< 5): Generates 5 quick images via Cloudflare AI FLUX and queues background worker.
 */
export async function ensureCategoryImages(
  categoryText: string,
  options: EnsureCategoryOptions = {},
): Promise<string[]> {
  return ensureOnboardingCategoryPack({
    category: categoryText,
    businessName: options.businessName || 'Commercial Enterprise',
    city: options.city || 'India',
    targetCount: options.targetCount || 5,
  });
}

/**
 * Smart Deterministic Business Image Selector
 * Assigns a stable, consistent photo to a business without flicker or neighbor collision.
 */
export async function selectBusinessImage(params: {
  businessId: string;
  categoryText: string;
  slotType?: string;
  userPhotos?: string[];
}): Promise<ResolvedBusinessImage> {
  const { businessId, categoryText, slotType = 'cover', userPhotos = [] } = params;
  const folder = getCategoryStorageFolder(categoryText);

  // Priority 1: Merchant's own photos (brand library / GBP upload)
  if (userPhotos.length > 0) {
    const userIndex = fnv1aHash(`${businessId}::user::${slotType}`) % userPhotos.length;
    return {
      url: userPhotos[userIndex],
      source: 'owner_upload',
      categoryKey: normalizeCategoryContext(categoryText).verticalKey,
      categoryFolder: folder,
      sceneType: slotType,
      isAiGenerated: false,
    };
  }

  // Priority 2: On-Demand S3 Category Library (Instant reuse if already exists)
  const pool = await getCategoryImagesFromS3(folder, 200);
  if (pool.length > 0) {
    const slotIndex = fnv1aHash(`${businessId}::${folder}::${slotType}`) % pool.length;
    return {
      url: pool[slotIndex],
      source: 's3_category_library',
      categoryKey: normalizeCategoryContext(categoryText).verticalKey,
      categoryFolder: folder,
      sceneType: slotType,
      isAiGenerated: true,
    };
  }

  // Priority 3: Quick Onboarding Generation via Cloudflare AI
  const generated = await ensureOnboardingCategoryPack({
    category: categoryText,
    businessName: 'Business',
    city: 'India',
    targetCount: 5,
  });

  const slotIndex = fnv1aHash(`${businessId}::${folder}::${slotType}`) % Math.max(1, generated.length);
  const selectedUrl = generated[slotIndex] || `/images/bgos/templates/${folder}-001.webp`;

  return {
    url: selectedUrl,
    source: 's3_category_library',
    categoryKey: normalizeCategoryContext(categoryText).verticalKey,
    categoryFolder: folder,
    sceneType: slotType,
    isAiGenerated: true,
  };
}

/**
 * Scans existing onboarded businesses and ensures their category S3 libraries are populated.
 */
export async function ensureImagesForExistingOnboardedUsers(): Promise<{
  processedCategories: string[];
  totalImagesEnsured: number;
}> {
  const categoriesToEnsure = new Set<string>();

  try {
    const tenants = await db.tenant?.findMany({
      select: { industry: true, settingsJson: true },
      take: 200,
    });

    for (const t of tenants || []) {
      if (t.industry && !/retail & local services|services|^other$/i.test(t.industry)) {
        categoriesToEnsure.add(t.industry);
      }
      if (t.settingsJson) {
        try {
          const parsed = JSON.parse(t.settingsJson);
          if (parsed.activeGbpCategory) categoriesToEnsure.add(parsed.activeGbpCategory);
        } catch {}
      }
    }

    const gbpAccounts = await db.socialAccount?.findMany({
      where: { platform: 'googlebusiness', isActive: true },
      select: { metadata: true },
      take: 100,
    });

    for (const acc of gbpAccounts || []) {
      if (acc.metadata) {
        try {
          const meta = typeof acc.metadata === 'string' ? JSON.parse(acc.metadata) : acc.metadata;
          const cat = meta.primaryCategory || meta.category || meta.categoryName;
          if (cat) categoriesToEnsure.add(cat);
        } catch {}
      }
    }
  } catch (err) {
    console.warn('[business-image-resolver] Error scanning onboarded tenants:', err);
  }

  // Default core business trades
  categoriesToEnsure.add('Software company');
  categoriesToEnsure.add('Plumbing service');
  categoriesToEnsure.add('Dental clinic');
  categoriesToEnsure.add('Beauty salon');
  categoriesToEnsure.add('Auto repair garage');

  const processed: string[] = [];
  let totalEnsured = 0;

  for (const cat of categoriesToEnsure) {
    try {
      const urls = await ensureOnboardingCategoryPack({
        category: cat,
        businessName: cat,
        city: 'India',
        targetCount: 5,
      });
      processed.push(cat);
      totalEnsured += urls.length;
    } catch (e) {
      console.warn(`[business-image-resolver] Could not ensure category ${cat}:`, e);
    }
  }

  return {
    processedCategories: processed,
    totalImagesEnsured: totalEnsured,
  };
}
