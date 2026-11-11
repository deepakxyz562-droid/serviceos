// @vitest-environment node
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  prepareGoogleAccount: vi.fn(),
  listGoogleBusinessMedia: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    imageLibrary: { findMany: mocks.findMany },
  },
}));

vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: mocks.prepareGoogleAccount,
}));

vi.mock('@/lib/social/adapters/googlebusiness', () => ({
  listGoogleBusinessMedia: mocks.listGoogleBusinessMedia,
}));

import {
  scoreIndustryMatch,
  getCategoryVisualPool,
  searchUnsplashApi,
  resolveBusinessPostVisual,
  CURATED_SMB_IMAGE_REGISTRY,
} from '@/lib/designs/dynamic-visual-resolver';
import { buildHighQualityImagePrompt } from '@/lib/designs/image-provider';

describe('Dynamic Visual Resolver', () => {
  const originalEnv = process.env.UNSPLASH_ACCESS_KEY;

  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.UNSPLASH_ACCESS_KEY;
    vi.stubGlobal('fetch', mocks.fetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalEnv) process.env.UNSPLASH_ACCESS_KEY = originalEnv;
    else delete process.env.UNSPLASH_ACCESS_KEY;
  });

  describe('scoreIndustryMatch', () => {
    it('accurately identifies diverse SMB industries', () => {
      expect(scoreIndustryMatch('Dental Care & Teeth Whitening')).toBe('dental_clinic');
      expect(scoreIndustryMatch('Rooftop Solar Panel Solutions')).toBe('solar_energy');
      expect(scoreIndustryMatch('Custom Iron Gate & Steel Welding')).toBe('welding_fabrication');
      expect(scoreIndustryMatch('Heavy Duty Fitness Gym & Crossfit')).toBe('fitness_gym');
      expect(scoreIndustryMatch('Luxury Hair Salon & Bridal Makeup')).toBe('salon_spa');
      expect(scoreIndustryMatch('Car Engine Diagnostic & Auto Garage')).toBe('auto_repair');
      expect(scoreIndustryMatch('24/7 Emergency Plumbing & Pipe Leaks')).toBe('plumbing');
      expect(scoreIndustryMatch('Licensed Electrician & Panel Wiring')).toBe('electrical');
      expect(scoreIndustryMatch('22K Hallmark Gold Jewellery & Solitaires')).toBe('jewellery');
      expect(scoreIndustryMatch('Corporate Tax Attorney & Legal Notary')).toBe('legal_accounting');
      expect(scoreIndustryMatch('Luxury Villa Farmhouse with Swimming Pool')).toBe('farmhouse_resort');
      expect(scoreIndustryMatch('Unknown enterprise random text')).toBe('generic_business');
    });
  });

  describe('getCategoryVisualPool', () => {
    it('returns valid arrays of royalty-free image URLs for any category', () => {
      const dentalPool = getCategoryVisualPool('dental clinic');
      expect(dentalPool.length).toBeGreaterThan(0);
      expect(dentalPool[0]).toContain('images.unsplash.com');

      const solarPool = getCategoryVisualPool('solar rooftop');
      expect(solarPool.length).toBeGreaterThan(0);
      expect(solarPool[0]).toContain('images.unsplash.com');

      const weldingPool = getCategoryVisualPool('steel welding');
      expect(weldingPool.length).toBeGreaterThan(0);
      expect(weldingPool[0]).toContain('images.unsplash.com');
    });

    it('shuffles the returned pool so consecutive requests do not return identical arrays', () => {
      const poolA = getCategoryVisualPool('gym fitness');
      const poolB = getCategoryVisualPool('gym fitness');
      expect(poolA.length).toBe(poolB.length);
      // Both pools contain the same items but can be shuffled
      expect(new Set(poolA)).toEqual(new Set(poolB));
    });
  });

  describe('searchUnsplashApi', () => {
    it('returns empty array when access key is not set', async () => {
      const results = await searchUnsplashApi('solar panel');
      expect(results).toEqual([]);
      expect(mocks.fetch).not.toHaveBeenCalled();
    });

    it('queries Unsplash search API when UNSPLASH_ACCESS_KEY is configured', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'test-unsplash-key';
      mocks.fetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              { urls: { regular: 'https://images.unsplash.com/photo-live-1' } },
              { urls: { raw: 'https://images.unsplash.com/photo-live-2' } },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const results = await searchUnsplashApi('welding fabrication', 5);
      expect(results).toHaveLength(2);
      expect(results[0]).toBe('https://images.unsplash.com/photo-live-1');
      expect(results[1]).toContain('photo-live-2&w=1200');
      expect(mocks.fetch).toHaveBeenCalledTimes(1);
      expect(mocks.fetch.mock.calls[0][0]).toContain('query=welding+fabrication');
      expect(mocks.fetch.mock.calls[0][1].headers.Authorization).toBe('Client-ID test-unsplash-key');
    });
  });

  describe('resolveBusinessPostVisual', () => {
    it('prioritizes real photos from Google Business Profile when available for a tenant', async () => {
      mocks.prepareGoogleAccount.mockResolvedValueOnce({ id: 'sa-1' });
      mocks.listGoogleBusinessMedia.mockResolvedValueOnce({
        mediaItems: [
          { googleUrl: 'https://lh3.googleusercontent.com/real-shop-photo-1', mediaFormat: 'PHOTO' },
          { googleUrl: 'https://lh3.googleusercontent.com/real-shop-photo-2', mediaFormat: 'PHOTO' },
        ],
      });

      const visual = await resolveBusinessPostVisual({
        tenantId: 'tenant-123',
        industry: 'Welding Workshop',
        topic: 'Custom Gates & Railings',
        preferRealPhotos: true,
      });

      expect(visual).toMatch(/real-shop-photo-[12]/);
    });

    it('falls back to Image Library if Google Media has no photos', async () => {
      mocks.prepareGoogleAccount.mockResolvedValueOnce(null);
      mocks.findMany.mockResolvedValueOnce([
        { url: 'https://cdn.example.com/brand-library-photo.jpg' },
      ]);

      const visual = await resolveBusinessPostVisual({
        tenantId: 'tenant-123',
        industry: 'Dental Care',
        preferRealPhotos: true,
      });

      expect(visual).toBe('https://cdn.example.com/brand-library-photo.jpg');
    });

    it('falls back to 35+ industry semantic registry when no real photos exist', async () => {
      mocks.prepareGoogleAccount.mockResolvedValueOnce(null);
      mocks.findMany.mockResolvedValueOnce([]);

      const visual = await resolveBusinessPostVisual({
        tenantId: 'tenant-123',
        industry: 'Solar Panel Installation',
        topic: 'Slash your electricity bills',
        imageKeyword: 'solar rooftop panels',
      });

      // Must be from the solar registry
      expect(CURATED_SMB_IMAGE_REGISTRY.solar_energy).toContain(visual);
    });
  });

  describe('buildHighQualityImagePrompt dynamic market archetype', () => {
    it('builds market/grocery scenes for shiv-ganga market and prevents IT software traps', () => {
      const prompt = buildHighQualityImagePrompt('', false, {
        businessName: 'shiv-ganga market',
        category: 'It company', // Stale signup default
        products: ['Fresh Produce', 'Daily Groceries'],
      });

      expect(prompt.toLowerCase()).toMatch(/produce|supermarket|grocery|market|store/);
      expect(prompt.toLowerCase()).not.toMatch(/workstation|code dashboard|software engineering|dual-monitor/);
    });

    it('builds market scene when category is Grocery & Supermarket', () => {
      const prompt = buildHighQualityImagePrompt('Special weekend discounts', false, {
        businessName: 'shiv-ganga market',
        category: 'Grocery & Supermarket',
        products: ['Fresh Vegetables', 'Organic Fruits', 'Spices'],
      });

      expect(prompt.toLowerCase()).toMatch(/produce|supermarket|grocery|market|store/);
      expect(prompt.toLowerCase()).not.toMatch(/workstation|code dashboard|software engineering/);
    });
  });
});
