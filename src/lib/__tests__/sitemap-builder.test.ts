import { describe, it, expect, vi } from 'vitest';
import {
  buildStaticSitemap,
  serializeUrlSet,
  serializeSitemapIndex,
  BASE_URL,
} from '@/lib/sitemap-builder';
import staticPageDates from '@/lib/seo/static-page-dates.json';

// Mock DB and external calls for pure unit testing of static sitemap builder
vi.mock('@/lib/db', () => ({
  db: {
    directoryLocation: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    tenant: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('@/lib/shared-cache', () => ({
  sharedCacheWrap: vi.fn((_key, _fresh, _stale, fn) => fn().then((v: any) => ({ value: v }))),
  sharedCacheGet: vi.fn().mockResolvedValue(undefined),
  sharedCacheSet: vi.fn().mockResolvedValue(undefined),
}));

describe('sitemap-builder Git-backed lastmod strategy', () => {
  it('assigns exact Git commit dates to static routes', async () => {
    const sitemap = await buildStaticSitemap();

    const home = sitemap.find((e) => e.url === `${BASE_URL}`);
    const marketplace = sitemap.find((e) => e.url === `${BASE_URL}/marketplace`);
    const plumbingSoftware = sitemap.find((e) => e.url === `${BASE_URL}/plumbing-software`);
    const jobberAlt = sitemap.find((e) => e.url === `${BASE_URL}/jobber-alternatives`);
    const scheduling = sitemap.find((e) => e.url === `${BASE_URL}/scheduling-and-dispatch`);
    const invoiceGen = sitemap.find((e) => e.url === `${BASE_URL}/invoice-generator`);
    const contact = sitemap.find((e) => e.url === `${BASE_URL}/contact-us`);

    expect(home?.lastModified).toBe(staticPageDates['/']);
    expect(marketplace?.lastModified).toBe(staticPageDates['/marketplace']);
    expect(plumbingSoftware?.lastModified).toBe(staticPageDates['/plumbing-software']);
    expect(jobberAlt?.lastModified).toBe(staticPageDates['/jobber-alternatives']);
    expect(scheduling?.lastModified).toBe(staticPageDates['/scheduling-and-dispatch']);
    expect(invoiceGen?.lastModified).toBe(staticPageDates['/invoice-generator']);
    expect(contact?.lastModified).toBe(staticPageDates['/contact-us']);

    // Check valid YYYY-MM-DD pattern
    expect(/^\d{4}-\d{2}-\d{2}$/.test(home?.lastModified || '')).toBe(true);
    expect(/^\d{4}-\d{2}-\d{2}$/.test(plumbingSoftware?.lastModified || '')).toBe(true);
  });

  it('serializes entries to XML with clean YYYY-MM-DD lastmod without milliseconds', () => {
    const entries = [
      { url: `${BASE_URL}/features`, lastModified: staticPageDates['/features'] },
      { url: `${BASE_URL}/plumbing-software`, lastModified: staticPageDates['/plumbing-software'] },
    ];

    const xml = serializeUrlSet(entries);

    expect(xml).toContain(`<loc>${BASE_URL}/features</loc>`);
    expect(xml).toContain(`<lastmod>${staticPageDates['/features']}</lastmod>`);
    expect(xml).toContain(`<loc>${BASE_URL}/plumbing-software</loc>`);
    expect(xml).toContain(`<lastmod>${staticPageDates['/plumbing-software']}</lastmod>`);
    expect(xml).not.toContain('.000Z');
    expect(xml).not.toContain('.584Z');
  });

  it('serializes sitemap index with standard YYYY-MM-DD date', () => {
    const xml = serializeSitemapIndex([{ id: 0 }, { id: 1 }]);
    const today = new Date().toISOString().slice(0, 10);

    expect(xml).toContain(`<loc>${BASE_URL}/sitemap/0.xml</loc>`);
    expect(xml).toContain(`<lastmod>${today}</lastmod>`);
    expect(xml).not.toContain('.000Z');
  });
});
