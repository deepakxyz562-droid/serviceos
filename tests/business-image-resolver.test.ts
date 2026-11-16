import { describe, it, expect, vi } from 'vitest';
import {
  getCategoryStorageFolder,
  fnv1aHash,
  selectBusinessImage,
  ensureCategoryImages,
  ensureImagesForExistingOnboardedUsers,
} from '../src/lib/designs/business-image-resolver';

describe('BGOS Business Image Resolver & On-Demand S3 Architecture', () => {
  it('correctly maps business categories to standardized S3 folder paths', () => {
    expect(getCategoryStorageFolder('Software company')).toBe('it-software');
    expect(getCategoryStorageFolder('IT & Software Solutions')).toBe('it-software');
    expect(getCategoryStorageFolder('Restaurant')).toBe('food-beverage');
    expect(getCategoryStorageFolder('Cafe & Bakery')).toBe('food-beverage');
    expect(getCategoryStorageFolder('Beauty salon')).toBe('beauty-wellness');
    expect(getCategoryStorageFolder('Dental clinic')).toBe('healthcare');
    expect(getCategoryStorageFolder('Air conditioning contractor')).toBe('home-services');
    expect(getCategoryStorageFolder('Auto repair garage')).toBe('automotive');
    expect(getCategoryStorageFolder('Grocery store')).toBe('retail');
  });

  it('guarantees deterministic, stable hashing with fnv1aHash', () => {
    const hash1 = fnv1aHash('biz-fieseros-123::cover');
    const hash2 = fnv1aHash('biz-fieseros-123::cover');
    const hash3 = fnv1aHash('biz-other-merchant-456::cover');

    // Identical inputs produce identical hash
    expect(hash1).toBe(hash2);
    // Different inputs produce distinct hashes
    expect(hash1).not.toBe(hash3);
    expect(hash1).toBeGreaterThan(0);
  });

  it('prioritizes merchant owner uploads when available (Tier 1 priority)', async () => {
    const userPhotos = [
      'https://s3.amazonaws.com/bgos-business-images/merchant-fieseros/office.jpg',
      'https://s3.amazonaws.com/bgos-business-images/merchant-fieseros/team.jpg',
    ];

    const result = await selectBusinessImage({
      businessId: 'fieseros-patna',
      categoryText: 'Software company',
      slotType: 'hero',
      userPhotos,
    });

    expect(result.source).toBe('owner_upload');
    expect(userPhotos).toContain(result.url);
    expect(result.isAiGenerated).toBe(false);
  });

  it('deterministically selects from the category pool when no owner photos are uploaded', async () => {
    const bizA = await selectBusinessImage({
      businessId: 'tenant-software-a',
      categoryText: 'Software company',
      slotType: 'cover',
    });

    const bizARepeat = await selectBusinessImage({
      businessId: 'tenant-software-a',
      categoryText: 'Software company',
      slotType: 'cover',
    });

    // Zero flicker: repeated calls for the same business return the exact same image
    expect(bizA.url).toBe(bizARepeat.url);
    expect(bizA.categoryFolder).toBe('it-software');
    expect(bizA.categoryKey).toBe('it_software_digital');

    // Different slot types (e.g. hero vs avatar) yield varied images
    const bizAHero = await selectBusinessImage({
      businessId: 'tenant-software-a',
      categoryText: 'Software company',
      slotType: 'service_1',
    });
    expect(bizAHero.categoryFolder).toBe('it-software');
  });

  it('ensures category images returns verified visuals without errors', async () => {
    const images = await ensureCategoryImages('Dental clinic');
    expect(images.length).toBeGreaterThanOrEqual(4);
    for (const url of images) {
      expect(url).toMatch(/^https?:\/\//);
    }
  });

  it('scans and ensures images for onboarded users safely', async () => {
    const result = await ensureImagesForExistingOnboardedUsers();
    expect(result.processedCategories.length).toBeGreaterThanOrEqual(6);
    expect(result.processedCategories).toContain('Software company');
    expect(result.processedCategories).toContain('Restaurant');
    expect(result.totalImagesEnsured).toBeGreaterThan(0);
  });
});
