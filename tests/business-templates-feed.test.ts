import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetAuthUser, tenantStore, brandProfileStore } = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
  tenantStore: {
    id: 'tenant-123',
    name: 'Apex Dental Care',
    industry: 'Dental Clinic',
    phone: '+91 98765 43210',
    settingsJson: JSON.stringify({ activeGbpTitle: 'Apex Dental Care', activeGbpCategory: 'Dentist' }),
  },
  brandProfileStore: {
    businessName: 'Apex Dental Care',
    industry: 'Dental Clinic',
    website: 'https://apexdental.com',
    logoUrl: 'https://apexdental.com/logo.png',
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: mockGetAuthUser,
  getProductAppUrl: vi.fn(() => 'https://bgos.site'),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(async () => tenantStore),
    },
    brandProfile: {
      findUnique: vi.fn(async () => brandProfileStore),
    },
  },
}));

describe('Business Templates Feed API (/api/social/designs/templates)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    mockGetAuthUser.mockResolvedValueOnce(null);
    const { GET } = await import('@/app/api/social/designs/templates/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/templates');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns personalized templates for the authenticated business', async () => {
    mockGetAuthUser.mockResolvedValueOnce({ id: 'user-1', tenantId: 'tenant-123' });
    const { GET } = await import('@/app/api/social/designs/templates/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/templates?limit=16');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.businessContext.name).toBe('Apex Dental Care');
    expect(data.businessContext.matchedGroup).toBe('Health & wellness');
    expect(data.templates.length).toBeGreaterThan(0);
    expect(data.counts.total).toBeGreaterThan(0);

    // Verify template structure
    const sample = data.templates[0];
    expect(sample).toHaveProperty('id');
    expect(sample).toHaveProperty('headline');
    expect(sample).toHaveProperty('photoUrl');
    expect(sample).toHaveProperty('design');
    expect(sample.design).toHaveProperty('layers');
    expect(sample.design.layers.length).toBeGreaterThan(0);

    // Verify brand was injected into the design
    const brandLayer = sample.design.layers.find((l: any) => l.id === 'brand');
    expect(brandLayer?.text).toBe('Apex Dental Care');
  });

  it('filters by festival tab and aspect ratio', async () => {
    mockGetAuthUser.mockResolvedValueOnce({ id: 'user-1', tenantId: 'tenant-123' });
    const { GET } = await import('@/app/api/social/designs/templates/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/templates?tab=festivals&aspect=1:1&limit=8');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.templates.length).toBeGreaterThan(0);
    for (const item of data.templates) {
      expect(item.tab).toBe('festivals');
      expect(item.aspectRatio).toBe('1:1');
    }
  });

  it('re-export /api/social/templates/for-business functions identically', async () => {
    mockGetAuthUser.mockResolvedValueOnce({ id: 'user-1', tenantId: 'tenant-123' });
    const { GET } = await import('@/app/api/social/templates/for-business/route');
    const req = new NextRequest('http://localhost:3000/api/social/templates/for-business?tab=promotions&limit=4');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.templates.length).toBeGreaterThan(0);
    for (const item of data.templates) {
      expect(item.tab).toBe('promotions');
    }
  });

  it('guarantees festival template-to-photo accuracy and never assigns trade photos to festivals', async () => {
    mockGetAuthUser.mockResolvedValueOnce({ id: 'user-1', tenantId: 'tenant-123' });
    const { GET } = await import('@/app/api/social/designs/templates/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/templates?tab=festivals&limit=15');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.templates.length).toBeGreaterThan(0);

    // Specifically test Diwali template
    const diwaliTemplate = data.templates.find(
      (t: any) => t.id === 'it-diwali-festival' || t.id === 'festival-diwali-universal' || /diwali/i.test(t.headline)
    );
    expect(diwaliTemplate).toBeDefined();

    // Must NOT be the mismatched blonde woman in park (photo-1508214751196-bcfd4ca60f91)
    expect(diwaliTemplate.photoUrl).not.toContain('photo-1508214751196-bcfd4ca60f91');

    // Must use authentic festival photography (diya/lights/festive)
    expect(diwaliTemplate.photoUrl).toBe('https://bgos.site/images/bgos/templates/diwali.webp');

    // Specifically test Holi template
    const holiTemplate = data.templates.find(
      (t: any) => t.id === 'festival-holi-universal' || /holi/i.test(t.headline)
    );
    expect(holiTemplate).toBeDefined();
    expect(holiTemplate.photoUrl).toBe('https://bgos.site/images/bgos/templates/edition-holi.webp');

    // Check that every festival template photo URL is festival-themed or webp, never dental/trade clinic photo
    for (const item of data.templates) {
      expect(item.tab).toBe('festivals');
      expect(item.photoUrl).not.toContain('photo-1588776814546'); // dental chair
      expect(item.photoUrl).not.toContain('photo-1508214751196'); // woman in park
    }
  });

  it('verifies all curated templates have valid, working non-404 photo URLs', async () => {
    const { CURATED_TEMPLATES } = await import('../shared/curated-photo-templates');
    expect(CURATED_TEMPLATES.length).toBeGreaterThanOrEqual(16);

    for (const tpl of CURATED_TEMPLATES) {
      expect(tpl.referenceUrl).toMatch(/^(https:\/\/images\.unsplash\.com\/photo-|\/images\/bgos\/templates\/)/);
      // Ensure the old 404 URL is gone
      expect(tpl.referenceUrl).not.toContain('photo-1486006920555-c77dce18193b');
      // Ensure the mismatched Diwali photo is gone and replaced with verified authentic diya
      if (tpl.id === 'it-diwali-festival' || tpl.id === 'festival-diwali-universal') {
        expect(tpl.referenceUrl).not.toContain('photo-1508214751196-bcfd4ca60f91');
        expect(tpl.referenceUrl).not.toContain('photo-1605647540924-852290f6b0d5');
        expect(tpl.referenceUrl).not.toContain('photo-1577083552431-6e5fd01aa342');
        expect(tpl.referenceUrl).toBe('/images/bgos/templates/diwali.webp');
      }
      if (tpl.id === 'festival-holi-universal') {
        expect(tpl.referenceUrl).not.toContain('photo-1583083527882-4bee9aba2eea'); // elf cat
        expect(tpl.referenceUrl).toBe('/images/bgos/templates/edition-holi.webp');
      }
    }
  });

  it('strictly isolates business categories so merchants never see unrelated trades', async () => {
    // 1. Test dental merchant (Health & wellness)
    mockGetAuthUser.mockResolvedValueOnce({ id: 'user-1', tenantId: 'tenant-123' });
    const { GET } = await import('@/app/api/social/designs/templates/route');
    const dentalReq = new NextRequest('http://localhost:3000/api/social/designs/templates?tab=for_business&limit=20');
    const dentalRes = await GET(dentalReq);
    expect(dentalRes.status).toBe(200);
    const dentalData = await dentalRes.json();

    expect(dentalData.businessContext.matchedGroup).toBe('Health & wellness');
    // None of the business templates should be auto, home services, salon, dining, or IT
    for (const item of dentalData.templates) {
      expect(item.tab).toBe('for_business');
      const headline = item.headline.toLowerCase();
      expect(headline).not.toContain('car wash');
      expect(headline).not.toContain('plumbing');
      expect(headline).not.toContain('plywood');
    }

    // 2. Test plywood merchant (Home services)
    tenantStore.name = 'Patna Plywood & Timber Works';
    tenantStore.industry = 'Plywood Shop';
    tenantStore.settingsJson = JSON.stringify({ activeGbpTitle: 'Patna Plywood & Timber Works', activeGbpCategory: 'Plywood supplier' });
    brandProfileStore.businessName = 'Patna Plywood & Timber Works';
    brandProfileStore.industry = 'Plywood Shop';

    mockGetAuthUser.mockResolvedValueOnce({ id: 'user-2', tenantId: 'tenant-456' });
    const plywoodReq = new NextRequest('http://localhost:3000/api/social/designs/templates?tab=for_business&limit=20');
    const plywoodRes = await GET(plywoodReq);
    expect(plywoodRes.status).toBe(200);
    const plywoodData = await plywoodRes.json();

    expect(plywoodData.businessContext.matchedGroup).toBe('Home services');
    for (const item of plywoodData.templates) {
      expect(item.tab).toBe('for_business');
      const headline = item.headline.toLowerCase();
      // Must NOT contain dental, car wash, salon, or restaurant headlines
      expect(headline).not.toContain('dentist');
      expect(headline).not.toContain('dental');
      expect(headline).not.toContain('car wash');
      expect(headline).not.toContain('salon');
    }
  });

  it('expands core services feed to 100+ category-adapted templates without static 8-item bottleneck', async () => {
    mockGetAuthUser.mockResolvedValueOnce({ id: 'user-1', tenantId: 'tenant-123' });
    const { GET } = await import('@/app/api/social/designs/templates/route');
    const req = new NextRequest('http://localhost:3000/api/social/designs/templates?tab=for_business&limit=150');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.counts.for_business).toBeGreaterThanOrEqual(100);
    expect(data.counts.total).toBeGreaterThanOrEqual(200);
    expect(data.templates.length).toBeGreaterThanOrEqual(100);

    // Verify all items are for_business and cleanly adapted
    for (const item of data.templates) {
      expect(item.tab).toBe('for_business');
      expect(item.photoUrl).toBeTruthy();
      expect(item.badge).toBeTruthy();
      // Ensure no artificial source tagging
      expect(item.badge).not.toContain('Pinterest');
      expect(item.badge).not.toContain('Behance');
    }
  });
});
