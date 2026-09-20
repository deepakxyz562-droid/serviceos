import { describe, it, expect } from 'vitest';
import { serializeUrlSet } from '@/lib/sitemap-builder';
import type { MetadataRoute } from 'next';

describe('sitemap-builder serializeUrlSet', () => {
  it('serializes entries to XML format properly', () => {
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

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<loc>https://fieseros.com/features</loc>');
    expect(xml).toContain('<lastmod>2026-08-13</lastmod>');
    expect(xml).toContain('<loc>https://fieseros.com/plumbing-software</loc>');
    expect(xml).toContain('<lastmod>2026-08-08T14:20:00.000Z</lastmod>');
  });
});
