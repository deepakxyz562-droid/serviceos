// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { normalizeCategoryContext } from '@/lib/designs/category-taxonomy';
import { scoreIndustryMatch, getCategoryVisualPool } from '@/lib/designs/dynamic-visual-resolver';
import { resolveCuratedCategoryId, getCuratedTemplatesForBusiness } from '../shared/curated-photo-templates';

describe('Universal Category Taxonomy & Scalable Visuals', () => {
  it('correctly maps 4,000+ GBP categories into their universal verticals', () => {
    // Building materials & Plywood
    const plyCtx = normalizeCategoryContext('Plywood supplier and Timber Merchant in Patna');
    expect(plyCtx.verticalKey).toBe('building_materials_hardware');
    expect(scoreIndustryMatch('Wholesale Plywood & Sunmica Store')).toBe('plywood_timber');
    expect(resolveCuratedCategoryId('Shree Ram Plywood & Hardware')).toBe('hardware_plywood');

    // Sweets & Mithai
    const sweetCtx = normalizeCategoryContext('Desi Ghee Sweet Shop & Halwai');
    expect(sweetCtx.verticalKey).toBe('food_sweets_confectionery');
    expect(scoreIndustryMatch('Mithai and Namkeen Bhandar')).toBe('indian_sweets');
    expect(resolveCuratedCategoryId('Kanpur Sweet Shop')).toBe('sweet_shop');

    // Salon & Grooming
    const salonCtx = normalizeCategoryContext('Unisex Luxury Saloon & Bridal Makeover');
    expect(salonCtx.verticalKey).toBe('beauty_personal_care');
    expect(scoreIndustryMatch('Royal Gents Saloon')).toBe('salon_spa');
    expect(resolveCuratedCategoryId('Glamour Beauty Saloon')).toBe('salon_spa');

    // Health & Clinics
    const dentalCtx = normalizeCategoryContext('Apex Dental Care and Implant Clinic');
    expect(dentalCtx.verticalKey).toBe('health_medical_wellness');

    // Automotive
    const autoCtx = normalizeCategoryContext('Multi-Brand Car Repair & Detailing Garage');
    expect(autoCtx.verticalKey).toBe('automotive_vehicles');
  });

  it('correctly detects festive occasions', () => {
    const diwali = normalizeCategoryContext('Power your growth this diwali');
    expect(diwali.isFestival).toBe(true);
    expect(diwali.detectedOccasion).toBe('diwali');

    const holi = normalizeCategoryContext('Happy holi festive discount offer');
    expect(holi.isFestival).toBe(true);
    expect(holi.detectedOccasion).toBe('holi');
  });

  it('returns verified authentic photography and never the bogus smiling woman or abstract canvas', () => {
    const BOGUS_WOMAN_PHOTO = 'photo-1605647540924-852290f6b0d5';
    const BOGUS_ABSTRACT_CANVAS = 'photo-1579783900882-c0d3dad7b119';

    // Plywood visual pool
    const plyVisuals = getCategoryVisualPool('Plywood and Timber Shop');
    expect(plyVisuals.length).toBeGreaterThan(0);
    expect(plyVisuals.every((url) => !url.includes(BOGUS_WOMAN_PHOTO))).toBe(true);
    expect(plyVisuals.some((url) => url.includes('1538688525198') || url.includes('1513836279014') || url.includes('1586023492125'))).toBe(true);

    // Indian sweets visual pool
    const sweetVisuals = getCategoryVisualPool('Indian Sweets & Mithai Store');
    expect(sweetVisuals.length).toBeGreaterThan(0);
    expect(sweetVisuals.some((url) => url.includes('1599488615731') || url.includes('1601050690597'))).toBe(true);

    // Salon visual pool
    const salonVisuals = getCategoryVisualPool('Royal Saloon');
    expect(salonVisuals.length).toBeGreaterThan(0);
    expect(salonVisuals.some((url) => url.includes('1560066984') || url.includes('1503951914875'))).toBe(true);

    // Curated trade templates
    const sweetTemplates = getCuratedTemplatesForBusiness({ categoryOrTitle: 'Sweet Shop Mithai' });
    expect(sweetTemplates.some((t) => t.id === 'sweet-festive-gift-box' || t.id === 'sweet-daily-specials')).toBe(true);

    // Check universal festival templates do not contain the bogus woman photo
    const festivalTemplates = getCuratedTemplatesForBusiness({ categoryOrTitle: 'All Festivals', bucketKey: 'festivals' });
    for (const t of festivalTemplates) {
      expect(t.referenceUrl).not.toContain(BOGUS_WOMAN_PHOTO);
      expect(t.referenceUrl).not.toContain(BOGUS_ABSTRACT_CANVAS);
    }
  });
});
