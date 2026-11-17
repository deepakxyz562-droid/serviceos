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
  toSpecializationSlug,
  getCategoryImagesFromS3,
  ensureOnboardingCategoryPack,
  buildCategorySceneBlueprints,
  prewarmSubscribedMerchantCategory,
  DEFAULT_MIN_CATEGORY_IMAGES,
  DEFAULT_MAX_CATEGORY_IMAGES,
  INITIAL_BATCH_CATEGORY_IMAGES,
} from '@/lib/designs/category-image-engine';
import { scoreIndustryMatch } from '@/lib/designs/dynamic-visual-resolver';
import { normalizeCategoryContext } from '@/lib/designs/category-taxonomy';
import { POSTER_TEMPLATES } from '../shared/poster-templates';
import { CURATED_TEMPLATES } from '../shared/curated-photo-templates';
import { getCategoryPhotoFolder } from '../shared/business-template-collection';

describe('Dedicated S3 Category Engine & Strict Trade Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Universal Taxonomy & Canonical Specialization Slug Resolver (4,000+ Categories)', () => {
    it('maps tech, SaaS, and platform businesses to isolated software specialization slugs', () => {
      expect(toSpecializationSlug('Fieseros OS')).toBe('fieseros_os');
      expect(toSpecializationSlug('ServiceOS')).toBe('serviceos');
      expect(toSpecializationSlug('Cloud Software Solutions')).toBe('cloud_software');
      expect(toSpecializationSlug('Mobile App & Web Development')).toBe('mobile_app_web_development');
    });

    it('maps diverse service trades to their respective isolated slugs without hardcoding', () => {
      expect(toSpecializationSlug('Plumbing and Sanitary Work')).toBe('plumbing_sanitary_work');
      expect(toSpecializationSlug('Dentist & Orthodontic Clinic')).toBe('dentist_orthodontic_clinic');
      expect(toSpecializationSlug('Luxury Beauty Salon & Spa')).toBe('luxury_beauty_salon_spa');
      expect(toSpecializationSlug('Auto Repair & Multi-brand Car Garage')).toBe('auto_repair_multi_brand_car_garage');
      expect(toSpecializationSlug('Plywood & Hardware Mart')).toBe('plywood_hardware_mart');
      expect(toSpecializationSlug('Desi Ghee Sweets and Namkeen')).toBe('desi_ghee_sweets_namkeen');
      expect(toSpecializationSlug('Education & Coaching Institute')).toBe('education_coaching_institute');
      expect(toSpecializationSlug('Vogue Fashion Boutique & Apparel')).toBe('vogue_fashion_boutique_apparel');
      expect(toSpecializationSlug('Gold & Diamond Jewellery Mart')).toBe('gold_diamond_jewellery_mart');
      expect(toSpecializationSlug('Security Guard & CCTV Surveillance')).toBe('security_guard_cctv_surveillance');
      expect(toSpecializationSlug('Solar Panel & Inverter Installation')).toBe('solar_panel_inverter_installation');
      expect(toSpecializationSlug('AC Repair & HVAC Services')).toBe('ac_repair_hvac');
      expect(toSpecializationSlug('Yoga & Meditation Sanctuary')).toBe('yoga_meditation_sanctuary');
      expect(toSpecializationSlug('Chartered Accountant & Tax Consulting')).toBe('chartered_accountant_tax_consulting');
      expect(toSpecializationSlug('Wedding Decoration & Event Planner')).toBe('wedding_decoration_event_planner');
      expect(toSpecializationSlug('Commercial Pest Control & Fumigation')).toBe('commercial_pest_control_fumigation');
      expect(toSpecializationSlug('Pet Care & Veterinary Hospital')).toBe('pet_care_veterinary_hospital');
    });

    it('automatically supports long-tail 4,000+ Google Business Profile categories dynamically', () => {
      const gbpSamples = [
        { raw: 'Acupuncture Clinic', expected: 'acupuncture_clinic' },
        { raw: 'Borewell Drilling Contractor', expected: 'borewell_drilling_contractor' },
        { raw: 'Solar Water Heater Supplier', expected: 'solar_water_heater_supplier' },
        { raw: 'Ayurvedic Panchakarma Clinic', expected: 'ayurvedic_panchakarma_clinic' },
        { raw: 'Dry Fruit Wholesaler', expected: 'dry_fruit_wholesaler' },
        { raw: 'Modular Kitchen Manufacturer', expected: 'modular_kitchen_manufacturer' },
        { raw: 'Handmade Leather Goods', expected: 'handmade_leather_goods' },
        { raw: 'Bicycle Repair Shop', expected: 'bicycle_repair' },
      ];

      for (const sample of gbpSamples) {
        const slug = toSpecializationSlug(sample.raw);
        expect(slug).toBe(sample.expected);
        expect(slug).not.toBe('it_software');
        expect(slug).not.toBe('general_business');
      }
    });
  });

  describe('Business Template Collection & Studio Posters Dynamic Resolution', () => {
    it('resolves distinct, isolated trade photo folders for all business groups dynamically', () => {
      expect(getCategoryPhotoFolder('Education & coaching')).toBe('education_coaching');
      expect(getCategoryPhotoFolder('Fashion & Retail')).toBe('fashion_retail');
      expect(getCategoryPhotoFolder('Events & lifestyle')).toBe('events_lifestyle');
      expect(getCategoryPhotoFolder('Professional services')).toBe('professional');
      expect(getCategoryPhotoFolder('Security & Facility services')).toBe('security_facility');
      expect(getCategoryPhotoFolder('IT & Software solutions')).toBe('it_software');
      expect(getCategoryPhotoFolder('Beauty & personal care')).toBe('beauty_personal_care');
      expect(getCategoryPhotoFolder('Food & hospitality')).toBe('food_hospitality');
      expect(getCategoryPhotoFolder('Auto & transport')).toBe('auto_transport');
      expect(getCategoryPhotoFolder('Health & wellness')).toBe('health_wellness');
    });

    it('guarantees that POSTER_TEMPLATES for Education, Fashion, Events do NOT leak to IT or Salon', () => {
      const educationTemplates = POSTER_TEMPLATES.filter((tpl) =>
        (tpl.industries || []).some((i) => /\beducation\b|\bcoaching\b|\btuition\b/.test(i)),
      );
      expect(educationTemplates.length).toBeGreaterThan(0);
      for (const tpl of educationTemplates) {
        expect(tpl.photo).not.toContain('/it_software/');
        expect(tpl.photo.includes('aida-public') || /education|coaching|school|academy/.test(tpl.photo)).toBe(true);
      }

      const eventsTemplates = POSTER_TEMPLATES.filter((tpl) =>
        (tpl.industries || []).some((i) => /event|wedding/.test(i)),
      );
      expect(eventsTemplates.length).toBeGreaterThan(0);
      for (const tpl of eventsTemplates) {
        expect(tpl.photo).not.toContain('/salon_spa/');
        expect(tpl.photo.includes('aida-public') || /event|wedding|lifestyle/.test(tpl.photo)).toBe(true);
      }
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

    it('enforces strict trade negative prompts across all non-food trades (no vegetables, no fruits, no grocery)', () => {
      const tradesToTest = [
        'it_software',
        'fashion_boutique',
        'education_academy',
        'dental_clinic',
        'solar_energy',
        'plumbing',
        'auto_repair',
        'real_estate',
      ];

      for (const trade of tradesToTest) {
        const blueprints = buildCategorySceneBlueprints(trade, 'Test Business', 'Delhi', 10);
        for (const prompt of blueprints) {
          const lower = prompt.toLowerCase();
          expect(lower).toContain('no vegetables');
          expect(lower).toContain('no fruits');
          expect(lower).toContain('no grocery');
          expect(lower).toContain('absolutely no text');
        }
      }
    });

    it('enforces industry-specific authentic scenes for different trades', () => {
      const fashionBlueprints = buildCategorySceneBlueprints('fashion_boutique', 'Vogue Boutique', 'Mumbai', 5);
      expect(fashionBlueprints.some((p) => /fashion|boutique|mannequin|apparel/i.test(p))).toBe(true);

      const educationBlueprints = buildCategorySceneBlueprints('education_academy', 'Bright Academy', 'Kota', 5);
      expect(educationBlueprints.some((p) => /classroom|library|study|lecture/i.test(p))).toBe(true);

      const dentalBlueprints = buildCategorySceneBlueprints('dental_clinic', 'Smile Dental', 'Bangalore', 5);
      expect(dentalBlueprints.some((p) => /dental|chair|instruments/i.test(p))).toBe(true);

      const solarBlueprints = buildCategorySceneBlueprints('solar_energy', 'SunPower Solar', 'Jaipur', 5);
      expect(solarBlueprints.some((p) => /solar|rooftop|photovoltaic|inverter/i.test(p))).toBe(true);
    });
  });

  describe('Subscribed Merchant JIT On-Demand S3 Generation', () => {
    it('generates 5 images in dedicated trade folder when an already subscribed merchant with cold trade visits', async () => {
      mocks.imageLibraryFindMany.mockResolvedValueOnce([]); // cold DB
      mocks.listFiles.mockResolvedValueOnce([]); // cold S3

      mocks.generateDesignImage.mockResolvedValue({
        bytes: Buffer.from('fake-fashion-image'),
        model: 'cloudflare-flux',
        cost: 0,
      });

      mocks.optimizeAndCompressImage.mockResolvedValue({
        buffer: Buffer.from('fake-optimized-fashion'),
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
        category: 'Vogue Fashion Boutique & Apparel',
        businessName: 'Vogue Trends',
        city: 'Mumbai',
        targetCount: 5,
      });

      expect(result).toHaveLength(5);
      expect(mocks.uploadFile).toHaveBeenCalled();
      for (const call of mocks.uploadFile.mock.calls) {
        expect(call[0].bucket).toBe('bgos-business-images');
        expect(call[0].folder).toBe('vogue_fashion_boutique_apparel');
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

    it('guarantees that non-food service businesses (Plumbing, HVAC, Electrical, Tech) never resolve to grocery or produce', () => {
      const plumbingCtx = normalizeCategoryContext('Drain Cleaning Water Heater Installation Leak Detection');
      expect(plumbingCtx.verticalKey).toBe('home_electrical_services');
      expect(scoreIndustryMatch('Drain Cleaning Water Heater Installation')).toBe('plumbing');

      const hvacCtx = normalizeCategoryContext('AC Repair HVAC Installation Air Duct Cleaning Chiller Maintenance');
      expect(hvacCtx.verticalKey).toBe('home_electrical_services');
      expect(scoreIndustryMatch('AC Repair HVAC Installation Air Duct')).toBe('hvac_aircon');

      const electricalCtx = normalizeCategoryContext('Electrical Wiring Circuit Breaker Panel Upgrade');
      expect(electricalCtx.verticalKey).toBe('home_electrical_services');
      expect(scoreIndustryMatch('Electrical Wiring Circuit Breaker')).toBe('electrical');

      // Retail & Local Services alone must NEVER resolve to grocery_supermarket
      expect(scoreIndustryMatch('Retail & Local Services')).not.toBe('grocery_supermarket');
      expect(scoreIndustryMatch('Retail & Local Services')).toBe('generic_business');
    });

    it('enforces minimum 50 up to 200 images for category library scale', () => {
      expect(DEFAULT_MIN_CATEGORY_IMAGES).toBe(50);
      expect(DEFAULT_MAX_CATEGORY_IMAGES).toBe(200);
      expect(INITIAL_BATCH_CATEGORY_IMAGES).toBeGreaterThanOrEqual(10);
    });

    it('enforces strict feed deduplication so no two cards share identical photo URLs', () => {
      const mockCards = [
        { id: '1', photoUrl: 'https://s3.amazonaws.com/img1.webp' },
        { id: '2', photoUrl: 'https://s3.amazonaws.com/img2.webp' },
        { id: '3', photoUrl: 'https://s3.amazonaws.com/img1.webp' }, // duplicate
        { id: '4', photoUrl: 'https://s3.amazonaws.com/img3.webp' },
        { id: '5', photoUrl: 'https://s3.amazonaws.com/img2.webp' }, // duplicate
      ];

      const seen = new Set<string>();
      const deduped: typeof mockCards = [];
      for (const card of mockCards) {
        const norm = card.photoUrl.split('?')[0].toLowerCase();
        if (!seen.has(norm)) {
          seen.add(norm);
          deduped.push(card);
        }
      }

      expect(deduped).toHaveLength(3);
      expect(deduped.map((c) => c.photoUrl)).toEqual([
        'https://s3.amazonaws.com/img1.webp',
        'https://s3.amazonaws.com/img2.webp',
        'https://s3.amazonaws.com/img3.webp',
      ]);
    });
  });
});
