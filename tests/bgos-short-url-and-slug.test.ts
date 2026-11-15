import { describe, it, expect, vi } from 'vitest';
import {
  normalizeBgosSlug,
  validateBgosSlug,
  generateSlugSuggestions,
  checkBgosSlugAvailability,
  BGOS_RESERVED_SLUGS,
} from '@/lib/bgos-slug-service';

// Mock DB
vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findFirst: vi.fn(async ({ where }: any) => {
        const slugClause = where?.OR?.find((c: any) => c.slug || c.publicSlug);
        const requestedSlug = slugClause?.slug || slugClause?.publicSlug;
        if (requestedSlug === 'kanvi-taken') {
          return { id: 'tenant_other_123', name: 'Existing Kanvi Business' };
        }
        return null;
      }),
      findMany: vi.fn(async () => []),
    },
  },
}));

describe('BGOS Short URL & Slug Service', () => {
  describe('normalizeBgosSlug', () => {
    it('lowercases and converts spaces & special chars to hyphens', () => {
      expect(normalizeBgosSlug('Delhi Farm & Resort')).toBe('delhi-farm-resort');
      expect(normalizeBgosSlug('Kanvi! @#$ 2026')).toBe('kanvi-2026');
    });

    it('collapses multiple hyphens and trims leading/trailing hyphens', () => {
      expect(normalizeBgosSlug('---delhi---farm---')).toBe('delhi-farm');
    });

    it('limits length to 48 chars', () => {
      const longInput = 'a'.repeat(60);
      expect(normalizeBgosSlug(longInput).length).toBe(48);
    });
  });

  describe('validateBgosSlug', () => {
    it('accepts valid short slugs', () => {
      expect(validateBgosSlug('kanvi').valid).toBe(true);
      expect(validateBgosSlug('delhi-farm-24').valid).toBe(true);
    });

    it('rejects slugs that are too short (< 2 chars)', () => {
      const res = validateBgosSlug('a');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('at least 2 characters');
    });

    it('rejects invalid character formats', () => {
      expect(validateBgosSlug('kanvi_farm').valid).toBe(false);
      expect(validateBgosSlug('-kanvi').valid).toBe(false);
      expect(validateBgosSlug('kanvi-').valid).toBe(false);
    });

    it('rejects reserved system words', () => {
      for (const reserved of ['login', 'api', 'app', 'b', 'book', 'terms', 'privacy', 'robots.txt', 'sitemap.xml']) {
        const res = validateBgosSlug(reserved);
        expect(res.valid).toBe(false);
        expect(res.error).toContain('reserved');
      }
    });
  });

  describe('checkBgosSlugAvailability', () => {
    it('returns available: true for untaken slug', async () => {
      const result = await checkBgosSlugAvailability({
        slug: 'kanvi-fresh',
        businessName: 'Kanvi Fresh',
      });
      expect(result.available).toBe(true);
      expect(result.url).toBe('https://bgos.site/kanvi-fresh');
      expect(result.slug).toBe('kanvi-fresh');
    });

    it('returns available: false and generates smart suggestions when slug is taken', async () => {
      const result = await checkBgosSlugAvailability({
        slug: 'kanvi-taken',
        businessName: 'Kanvi Resort',
        city: 'Ghaziabad',
      });
      expect(result.available).toBe(false);
      expect(result.reason).toContain('already taken');
      expect(result.suggestions.length).toBeGreaterThan(0);
      for (const sug of result.suggestions) {
        expect(sug).not.toBe('kanvi-taken');
        expect(BGOS_RESERVED_SLUGS.has(sug)).toBe(false);
      }
    });

    it('returns available: false and suggests alternatives for reserved words', async () => {
      const result = await checkBgosSlugAvailability({
        slug: 'login',
        businessName: 'Delhi Farm',
      });
      expect(result.available).toBe(false);
      expect(result.reason).toContain('reserved system path');
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions).not.toContain('login');
    });
  });

  describe('generateSlugSuggestions', () => {
    it('creates brand-relevant suggestions with business name and city', async () => {
      const suggestions = await generateSlugSuggestions({
        baseSlug: 'kanvi',
        businessName: 'Delhi Farm Kanvi',
        city: 'Ghaziabad',
      });
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.includes('kanvi'))).toBe(true);
    });
  });

  describe('Short Path URL Routing Pattern', () => {
    it('correctly matches clean short path and sub-paths for bgos.site', () => {
      const pathRegex = /^\/([a-zA-Z0-9_-]+)(\/.*)?$/;

      const m1 = '/kanvi'.match(pathRegex);
      expect(m1?.[1]).toBe('kanvi');
      expect(m1?.[2]).toBeUndefined();

      const m2 = '/kanvi/book'.match(pathRegex);
      expect(m2?.[1]).toBe('kanvi');
      expect(m2?.[2]).toBe('/book');

      const m3 = '/kanvi/reviews/all'.match(pathRegex);
      expect(m3?.[1]).toBe('kanvi');
      expect(m3?.[2]).toBe('/reviews/all');
    });

    it('identifies static assets with file extensions to prevent hijacking', () => {
      const isStaticAsset = (p: string) => p.includes('.') || /\.[a-zA-Z0-9]+$/.test(p);
      expect(isStaticAsset('/bgos/primary-logo.png')).toBe(true);
      expect(isStaticAsset('/favicon.ico')).toBe(true);
      expect(isStaticAsset('/manifest.webmanifest')).toBe(true);
      expect(isStaticAsset('/sw.js')).toBe(true);
      expect(isStaticAsset('/owner-8220s-business')).toBe(false);
      expect(isStaticAsset('/shieldhire-sos-app')).toBe(false);
    });
  });
});
