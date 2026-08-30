import { describe, it, expect } from 'bun:test';
import { STATIC_PAGE_DATES, DEFAULT_STATIC_LASTMOD, serializeUrlSet } from '@/lib/sitemap-builder';
import type { MetadataRoute } from 'next';

describe('sitemap-builder Git-backed lastmod strategy', () => {
  it('assigns exact Git commit dates to static routes', () => {
    expect(STATIC_PAGE_DATES).toBeDefined();
    expect(typeof STATIC_PAGE_DATES['/plumbing-software']).toBe('string');
    expect(STATIC_PAGE_DATES['/plumbing-software']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(STATIC_PAGE_DATES['/features']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('serializes entries to XML with clean YYYY-MM-DD lastmod without milliseconds', () => {
    const mockEntries: MetadataRoute.Sitemap = [
      {
        url: 'https://fieseros.com/features',
        lastModified: '2026-08-13',
      },
      {
        url: 'https://fieseros.com/plumbing-software',
        lastModified: new Date('2026-08-08T14:20:00.000Z'),
      },
    ];

    const xml = serializeUrlSet(mockEntries);
    expect(xml).toContain('<loc>https://fieseros.com/features</loc>');
    expect(xml).toContain('<lastmod>2026-08-13</lastmod>');
    expect(xml).toContain('<loc>https://fieseros.com/plumbing-software</loc>');
    expect(xml).toContain('<lastmod>2026-08-08</lastmod>');
    expect(xml).not.toContain('.000Z');
  });
});
