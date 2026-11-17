// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  uploadFile: vi.fn(),
  listFiles: vi.fn(),
  isS3Configured: vi.fn().mockReturnValue(true),
  generateDesignImage: vi.fn(),
  optimizeAndCompressImage: vi.fn(),
  imageLibraryFindMany: vi.fn(),
  imageLibraryCreate: vi.fn(),
}));

vi.mock('@/lib/supabase-storage', () => ({
  uploadFile: mocks.uploadFile,
  listFiles: mocks.listFiles,
  isS3Configured: mocks.isS3Configured,
}));

vi.mock('@/lib/designs/image-provider', () => ({
  generateDesignImage: mocks.generateDesignImage,
}));

vi.mock('@/lib/designs/image-compressor', () => ({
  optimizeAndCompressImage: mocks.optimizeAndCompressImage,
}));

vi.mock('@/lib/db', () => ({
  db: {
    imageLibrary: {
      findMany: mocks.imageLibraryFindMany,
      create: mocks.imageLibraryCreate,
    },
  },
}));

import {
  getCategoryStorageFolder,
  getCategoryImagesFromS3,
  ensureOnboardingCategoryPack,
  buildCategorySceneBlueprints,
} from '@/lib/designs/category-image-engine';
import { POSTER_TEMPLATES } from '../../shared/poster-templates';
import { CURATED_TEMPLATES } from '../../shared/curated-photo-templates';

describe('Dedicated S3 Category Engine & Strict Trade Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Trade Canonical Folder Mapping', () => {
    it('maps tech, SaaS, and Fieseros OS businesses to it_software', () => {
      expect(getCategoryStorageFolder('Fieseros OS')).toBe('it_software');
      expect(getCategoryStorageFolder('ServiceOS')).toBe('it_software');
      expect(getCategoryStorageFolder('Cloud Software Solutions')).toBe('it_software');
      expect(getCategoryStorageFolder('Mobile App & Web Development')).toBe('it_software');
    });

    it('maps diverse service trades to their respective isolated folders', () => {
      expect(getCategoryStorageFolder('Plumbing and Sanitary Work')).toBe('plumbing');
      expect(getCategoryStorageFolder('Dentist & Orthodontic Clinic')).toBe('dental_clinic');
      expect(getCategoryStorageFolder('Luxury Beauty Salon & Spa')).toBe('salon_spa');
      expect(getCategoryStorageFolder('Auto Repair & Multi-brand Car Garage')).toBe('auto_repair');
      expect(getCategoryStorageFolder('Plywood & Hardware Mart')).toBe('plywood_timber');
      expect(getCategoryStorageFolder('Desi Ghee Sweets and Namkeen')).toBe('indian_sweets');
    });
  });

  describe('Instant Zero-Cost Reuse (Cache Hit)', () => {
    it('returns existing cached images immediately without calling AI generation when >= 5 exist', async () => {
      const existingUrls = [
        'https://serviceos-assets-prod.s3.ap-south-1.amazonaws.com/bgos-business-images/category_library/it_software/it_software-001.webp',
        'https://serviceos-assets-prod.s3.ap-south-1.amazonaws.com/bgos-business-images/category_library/it_software/it_software-002.webp',
        'https://serviceos-assets-prod.s3.ap-south-1.amazonaws.com/bgos-business-images/category_library/it_software/it_software-003.webp',
        'https://serviceos-assets-prod.s3.ap-south-1.amazonaws.com/bgos-business-images/category_library/it_software/it_software-004.webp',
        'https://serviceos-assets-prod.s3.ap-south-1.amazonaws.com/bgos-business-images/category_library/it_software/it_software-005.webp',
      ];

      mocks.imageLibraryFindMany.mockResolvedValueOnce(
        existingUrls.map((url) => ({ url }))
      );

      const result = await ensureOnboardingCategoryPack({
        category: 'it_software',
        businessName: 'Fieseros Tech',
        city: 'Patna',
      });

      expect(result).toHaveLength(5);
      expect(result).toEqual(existingUrls);
      // AI generation must NOT be called on a cache hit
      expect(mocks.generateDesignImage).not.toHaveBeenCalled();
      expect(mocks.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('Fast 5-Image Onboarding Generation Pack', () => {
    it('generates 5 images quickly and saves to S3 when cold (< 5 images exist)', async () => {
      mocks.imageLibraryFindMany.mockResolvedValueOnce([]); // cold DB
      mocks.listFiles.mockResolvedValueOnce([]); // cold S3

      mocks.generateDesignImage.mockResolvedValue({
        bytes: Buffer.from('fake-raw-image-bytes'),
        model: 'cloudflare-flux',
        cost: 0,
      });

      mocks.optimizeAndCompressImage.mockResolvedValue({
        buffer: Buffer.from('fake-optimized-webp'),
        contentType: 'image/webp',
        width: 1080,
        height: 1350,
      });

      mocks.uploadFile.mockImplementation((params: any) =>
        Promise.resolve({
          path: `${params.companyId}/${params.folder}/${params.fileName}`,
          url: `https://serviceos-assets-prod.s3.ap-south-1.amazonaws.com/${params.bucket}/${params.companyId}/${params.folder}/${params.fileName}`,
        })
      );

      const result = await ensureOnboardingCategoryPack({
        category: 'plumbing',
        businessName: 'Express Plumber',
        city: 'Delhi',
        targetCount: 5,
      });

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(mocks.generateDesignImage).toHaveBeenCalled();
      expect(mocks.uploadFile).toHaveBeenCalled();

      // Verify all uploaded paths are in the dedicated trade S3 folder
      for (const call of mocks.uploadFile.mock.calls) {
        expect(call[0].bucket).toBe('bgos-business-images');
        expect(call[0].companyId).toBe('category_library');
        expect(call[0].folder).toBe('plumbing');
      }
    });
  });

  describe('200-Scene Blueprints & Negative Trade Constraints', () => {
    it('produces 200 distinct scene blueprints for a category without text', () => {
      const blueprints = buildCategorySceneBlueprints('it_software', 'Fieseros OS', 'Patna', 200);
      expect(blueprints).toHaveLength(200);

      // Verify all blueprints forbid text, letters, watermarks
      for (const prompt of blueprints) {
        expect(prompt).toContain('ABSOLUTELY NO TEXT');
        expect(prompt).toContain('8k commercial photography');
      }
    });

    it('enforces strict trade negative prompts (e.g. IT software bans fruits, vegetables, cafes, food)', () => {
      const techBlueprints = buildCategorySceneBlueprints('it_software', 'Fieseros OS', 'Patna', 50);
      for (const prompt of techBlueprints) {
        expect(prompt.toLowerCase()).toContain('no vegetables');
        expect(prompt.toLowerCase()).toContain('no fruits');
        expect(prompt.toLowerCase()).toContain('no grocery');
        expect(prompt.toLowerCase()).toContain('no restaurant');
      }
    });
  });

  describe('Feed Integrity & Zero Unsplash Guarantee', () => {
    it('guarantees ZERO Unsplash URLs across CURATED_TEMPLATES', () => {
      for (const tpl of CURATED_TEMPLATES) {
        expect(tpl.referenceUrl).not.toContain('unsplash.com');
      }
    });

    it('guarantees ZERO Unsplash URLs across POSTER_TEMPLATES', () => {
      for (const tpl of POSTER_TEMPLATES) {
        expect(tpl.photo).not.toContain('unsplash.com');
      }
    });

    it('ensures no grocery supermarket templates leak to generic tech merchants', () => {
      const techTemplates = POSTER_TEMPLATES.filter((tpl) => {
        const ind = (tpl.industries || []).map((i) => i.toLowerCase());
        return ind.some((i) => /tech|software|saas|digital/.test(i));
      });

      for (const tpl of techTemplates) {
        const photo = tpl.photo.toLowerCase();
        expect(photo).not.toContain('1542838132-92c53300491e');
        expect(photo).not.toMatch(/vegetable|grocery|supermarket/);
      }
    });
  });
});
